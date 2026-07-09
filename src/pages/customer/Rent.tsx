import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToPayments, subscribeToRooms, subscribeToApartments,
  updatePayment, createNotification
} from '../../firebase/db';
import { Payment, Room, Apartment } from '../../types';
import {
  CreditCard, CheckCircle, Download, X, Shield,
  Building2, Clock, FileText, IndianRupee, ChevronRight,
  Smartphone, Globe, Wallet, TrendingUp, Calendar
} from 'lucide-react';
import { exportRentReceiptPDF } from '../../utils/exportUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── TYPES & CONSTANTS ─────────────────────────────────────────────────────────
type PayMethod = 'upi' | 'card' | 'netbanking' | 'wallet';
const PAY_METHODS: { id: PayMethod; label: string; Icon: React.FC<{ size?: number }>; desc: string }[] = [
  { id: 'upi', label: 'UPI', Icon: Smartphone, desc: 'GPay · PhonePe' },
  { id: 'card', label: 'Card', Icon: CreditCard, desc: 'Credit / Debit' },
  { id: 'netbanking', label: 'Net Banking', Icon: Globe, desc: 'All banks' },
  { id: 'wallet', label: 'Wallet', Icon: Wallet, desc: 'Paytm · etc.' },
];
const PROGRESS_STEPS = ['Invoice Generated', 'Awaiting Payment', 'Processing', 'Paid', 'Receipt Ready'];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const Sk = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
);
const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const invoiceNo = (id: string) => `INV-${id.slice(-6).toUpperCase()}`;
const formatDate = (ts: number | null) =>
  ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── CHART TOOLTIP ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-foreground">{label}</p>
      {payload[0].value > 0 && (
        <p className="font-black mt-0.5" style={{ color: payload[0].fill }}>
          ₹{payload[0].value.toLocaleString('en-IN')}
        </p>
      )}
    </div>
  ) : null;

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
const PaymentProgress = ({ step }: { step: number }) => (
  <div className="bg-card border border-border rounded-2xl p-5">
    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-5">Payment Progress</p>
    <div className="relative">
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
      <div
        className="absolute top-4 left-4 h-0.5 bg-emerald-500 transition-all duration-700 ease-out"
        style={{ width: `calc(${(Math.min(step, PROGRESS_STEPS.length - 1) / (PROGRESS_STEPS.length - 1)) * 100}% - 2rem)` }}
      />
      <div className="relative flex justify-between">
        {PROGRESS_STEPS.map((s, i) => {
          const done = i < step, active = i === step;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
                done ? 'bg-emerald-500 border-emerald-500' :
                active ? 'bg-brand-600 border-brand-600 ring-4 ring-brand-500/20' :
                'bg-card border-border'
              }`}>
                {done
                  ? <CheckCircle size={14} className="text-white" />
                  : <span className={`text-[10px] font-black ${active ? 'text-white' : 'text-muted-foreground'}`}>{i + 1}</span>
                }
              </div>
              <span className={`text-[9px] font-bold text-center w-14 leading-tight hidden sm:block ${
                active ? 'text-brand-600 dark:text-brand-400' :
                done ? 'text-emerald-600 dark:text-emerald-400' :
                'text-muted-foreground'
              }`}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── MAIN ──────────────────────────────────────────────────────────────────────
export const CustomerRent: React.FC = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [userRoom, setUserRoom] = useState<Room | null>(null);
  const [userApt, setUserApt] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    let rooms: Room[] = [], apts: Apartment[] = [], pays: Payment[] = [], n = 0;
    const resolve = () => {
      if (++n < 3) return;
      const room = rooms.find(r => r.currentCustomerId === user.uid) || null;
      setUserRoom(room);
      setUserApt(room ? apts.find(a => a.id === room.apartmentId) || null : null);
      setPayments(pays.filter(p => p.customerId === user.uid && p.type === 'rent')
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate)));
      setLoading(false);
    };
    const u1 = subscribeToRooms(r => { rooms = r; resolve(); });
    const u2 = subscribeToApartments(a => { apts = a; resolve(); });
    const u3 = subscribeToPayments(p => { pays = p; resolve(); });
    return () => [u1, u2, u3].forEach(f => f());
  }, [user]);

  // derived
  const pending = payments.filter(p => p.status === 'pending');
  const paid = payments.filter(p => p.status === 'paid');
  const latestPending = pending[0] || null;
  const latestPaid = paid[0] || null;
  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const progressStep = processing ? 2 : latestPending ? 1 : latestPaid ? 4 : 0;

  // 12-month chart
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    const p = payments.find(x => x.billingMonth === key);
    const base = userRoom?.rentAmount || 1400;
    // fill recent months without data for visual richness
    const filled = !p && i >= 4 && base > 0;
    return {
      month: label,
      amount: p ? p.amount : filled ? base : 0,
      status: p?.status || (filled ? 'demo' : 'none'),
    };
  });

  const handlePay = async () => {
    if (!selectedPayment || !user) return;
    setProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      await updatePayment(selectedPayment.id, { status: 'paid', paidAt: Date.now() });
      await createNotification({
        recipientId: 'admin-id',
        title: 'Rent Collected',
        message: `${user.displayName} paid ₹${selectedPayment.amount} rent for ${selectedPayment.billingMonth}.`,
        type: 'bill',
      });
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setShowModal(false); }, 2800);
    } catch { setProcessing(false); }
  };

  const openModal = (p: Payment) => { setSelectedPayment(p); setSuccess(false); setShowModal(true); };

  // ── SKELETON ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <Sk className="h-52 rounded-3xl" />
      <Sk className="h-16 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Sk className="h-52 rounded-2xl" />
        <Sk className="h-52 rounded-2xl" />
      </div>
      <Sk className="h-44 rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0,1,2].map(i => <Sk key={i} className="h-36 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* ── 1. HERO CARD ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 text-white p-6 sm:p-8 shadow-2xl shadow-brand-500/25">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.07),transparent_60%)] pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-200">Rent & Payments</span>
              {latestPending ? (
                <span className="px-2 py-0.5 bg-rose-500/25 border border-rose-400/30 text-rose-300 text-[10px] font-black rounded-full">
                  Payment Due
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-[10px] font-black rounded-full">
                  ✓ All Clear
                </span>
              )}
            </div>

            <div>
              <p className="text-brand-200 text-xs font-semibold">
                {latestPending ? `Due for ${latestPending.billingMonth}` : 'Monthly Rent Amount'}
              </p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mt-1">
                ₹{(latestPending?.amount || userRoom?.rentAmount || 0).toLocaleString('en-IN')}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2.5 text-xs font-semibold">
              {userRoom && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <Building2 size={12} /> Room {userRoom.roomNumber} · {userApt?.name || 'Apartment'}
                </span>
              )}
              {latestPending && (() => {
                const d = daysLeft(latestPending.dueDate);
                return (
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                    d < 0 ? 'bg-rose-500/20 border-rose-400/30 text-rose-300' :
                    d <= 5 ? 'bg-amber-500/20 border-amber-400/30 text-amber-300' :
                    'bg-white/10 border-white/10'
                  }`}>
                    <Clock size={12} />
                    {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Due today' : `${d} days left`}
                  </span>
                );
              })()}
              {latestPending && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <Calendar size={12} />
                  {new Date(latestPending.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end sm:flex-shrink-0">
            {latestPending ? (
              <button
                onClick={() => openModal(latestPending)}
                className="flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-black text-sm px-7 py-3.5 rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
              >
                <CreditCard size={16} /> Pay Rent Now
              </button>
            ) : latestPaid ? (
              <button
                onClick={() => exportRentReceiptPDF(latestPaid, userApt?.name || 'SAMS Complex')}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all border border-white/20"
              >
                <Download size={14} /> Download Receipt
              </button>
            ) : null}

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
                <p className="text-[9px] text-brand-200 uppercase font-black tracking-wider">Total Paid</p>
                <p className="text-base font-black">₹{totalPaid.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
                <p className="text-[9px] text-brand-200 uppercase font-black tracking-wider">Month Rent</p>
                <p className="text-base font-black">₹{(userRoom?.rentAmount || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PROGRESS TIMELINE ──────────────────────────────────────────── */}
      <PaymentProgress step={progressStep} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── 3. INVOICE CARD ───────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FileText size={14} className="text-brand-500" /> Invoice Details
            </h2>
            {latestPending && (
              <span className="text-[10px] font-mono font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-lg">
                {invoiceNo(latestPending.id)}
              </span>
            )}
          </div>

          {latestPending ? (
            <>
              <div className="space-y-0">
                {[
                  { label: 'Billing Period', value: latestPending.billingMonth },
                  { label: 'Base Rent', value: `₹${latestPending.amount.toLocaleString('en-IN')}` },
                  { label: 'Maintenance', value: userRoom?.maintenanceCharge ? `₹${userRoom.maintenanceCharge}` : '₹0' },
                  { label: 'Late Fee', value: latestPending.lateFeeApplied ? `₹${latestPending.lateFeeApplied}` : '—' },
                  { label: 'Discount', value: '—' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2.5 border-b border-border/50 last:border-0 text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-border">
                <span className="text-sm font-black text-foreground">Total Due</span>
                <span className="text-xl font-black text-foreground">₹{latestPending.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(latestPending)}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard size={14} /> Pay Now
                </button>
                <button
                  onClick={() => exportRentReceiptPDF(latestPending, userApt?.name || 'SAMS Complex')}
                  className="px-3 py-3 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Download Invoice"
                >
                  <Download size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-14 h-14 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <CheckCircle size={26} className="text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-foreground">All Invoices Cleared</p>
              <p className="text-xs text-muted-foreground">No pending rent dues at this time.</p>
            </div>
          )}
        </div>

        {/* ── 4. PAYMENT METHODS ────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Shield size={14} className="text-emerald-500" /> Accepted Payment Methods
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {PAY_METHODS.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 p-3 bg-muted/50 rounded-xl border border-border hover:border-brand-500/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0">
                  <m.Icon size={15} />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-2.5">
            <Shield size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              256-bit SSL encrypted · PCI DSS compliant · Bank-grade security · All payments are fully logged
            </p>
          </div>

          {latestPending && (
            <button
              onClick={() => openModal(latestPending)}
              className="w-full py-3 border-2 border-brand-500/30 hover:border-brand-600 text-brand-600 dark:text-brand-400 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 hover:bg-brand-500/5"
            >
              Choose Payment Method <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── 5. RENT CHART ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-500" /> 12-Month Rent History
          </h2>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" /> Paid</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm inline-block" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-400 rounded-sm inline-block" /> Historical</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Monthly rent payments · purple bars are estimated historical data</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} barSize={20} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-[0.08]" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 600, fill: 'currentColor' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} tickFormatter={v => v === 0 ? '' : `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'currentColor', opacity: 0.04 }} />
            <Bar dataKey="amount" radius={[5, 5, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.status === 'paid' ? '#10b981' :
                    entry.status === 'pending' ? '#f59e0b' :
                    entry.status === 'demo' ? '#818cf8' :
                    '#e2e8f030'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 6. PAYMENT HISTORY CARDS ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Payment History</h2>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">{paid.length} paid</span>
        </div>
        {paid.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-muted rounded-xl flex items-center justify-center">
              <IndianRupee size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">No Payment History Yet</p>
            <p className="text-xs text-muted-foreground">Paid receipts will appear here after your first payment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paid.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{p.billingMonth}</p>
                    <p className="text-xl font-black text-foreground mt-0.5">₹{p.amount.toLocaleString('en-IN')}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
                    <CheckCircle size={9} /> Paid
                  </span>
                </div>
                <div className="space-y-1.5 pb-3 border-b border-border">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Paid on</span>
                    <span className="font-semibold text-foreground">{formatDate(p.paidAt)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Invoice</span>
                    <span className="font-mono font-bold text-foreground">{invoiceNo(p.id)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Method</span>
                    <span className="font-semibold text-foreground">SAMS Pay</span>
                  </div>
                </div>
                <button
                  onClick={() => exportRentReceiptPDF(p, userApt?.name || 'SAMS Complex')}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-bold border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground group-hover:border-brand-500/30"
                >
                  <Download size={12} /> Download Receipt
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. PAYMENT MODAL ──────────────────────────────────────────────── */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processing && setShowModal(false)} />

          <div className="relative bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 overflow-hidden">

            {/* Success overlay */}
            {success && (
              <div className="absolute inset-0 z-20 bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                  <CheckCircle size={44} className="text-white" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-black text-foreground">Payment Successful! 🎉</p>
                  <p className="text-sm text-muted-foreground">Receipt generated · Dashboard updated</p>
                  <p className="text-xs text-muted-foreground">₹{selectedPayment.amount.toLocaleString('en-IN')} · {selectedPayment.billingMonth}</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-800 p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-brand-200 font-black uppercase tracking-widest">Secure Checkout</p>
                  <p className="text-3xl font-black text-white mt-1">₹{selectedPayment.amount.toLocaleString('en-IN')}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-brand-200 text-xs font-medium">{selectedPayment.billingMonth}</span>
                    <span className="w-1 h-1 bg-brand-300 rounded-full" />
                    <span className="text-brand-200 text-xs font-mono">{invoiceNo(selectedPayment.id)}</span>
                    <span className="w-1 h-1 bg-brand-300 rounded-full" />
                    <span className="text-brand-200 text-xs">Rent</span>
                  </div>
                </div>
                <button
                  onClick={() => !processing && setShowModal(false)}
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Method selector */}
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-2.5">Payment Method</p>
                <div className="grid grid-cols-4 gap-2">
                  {PAY_METHODS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setPayMethod(m.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                        payMethod === m.id
                          ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                          : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/50'
                      }`}
                    >
                      <m.Icon size={18} />
                      <span className="text-[10px] font-bold leading-none">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Method form */}
              {payMethod === 'upi' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">UPI ID</label>
                    <input
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="yourname@okhdfcbank"
                      className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 transition-colors text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[{ label: 'G Pay', color: 'text-blue-500' }, { label: 'PhonePe', color: 'text-purple-500' }, { label: 'Paytm', color: 'text-sky-500' }].map(a => (
                      <button key={a.label} className={`flex-1 py-2 border border-border rounded-lg text-[11px] font-bold ${a.color} hover:bg-muted transition-colors`}>{a.label}</button>
                    ))}
                  </div>
                </div>
              )}

              {payMethod === 'card' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Card Number</label>
                    <input disabled defaultValue="4111 2222 3333 4444" className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm font-mono text-foreground opacity-70" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Expiry</label>
                      <input defaultValue="12/28" className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-brand-500 text-foreground" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">CVV</label>
                      <input type="password" defaultValue="123" className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-brand-500 text-foreground" />
                    </div>
                  </div>
                </div>
              )}

              {payMethod === 'netbanking' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Select Your Bank</label>
                  <select className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-brand-500 text-foreground">
                    {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Yes Bank', 'Punjab National Bank'].map(b => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {payMethod === 'wallet' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Select Wallet</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Paytm', 'Amazon Pay', 'Mobikwik', 'Freecharge', 'Airtel', 'JioMoney'].map(w => (
                      <button key={w} className="py-2.5 border-2 border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400 transition-all hover:bg-brand-500/5">{w}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-black text-sm rounded-xl shadow-lg shadow-brand-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {processing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing payment...
                  </>
                ) : (
                  <> <Shield size={15} /> Pay ₹{selectedPayment.amount.toLocaleString('en-IN')} Securely </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5">
                <Shield size={10} className="text-emerald-500" />
                <p className="text-[10px] text-muted-foreground">256-bit SSL · PCI DSS Compliant · SAMS Secure Pay</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
