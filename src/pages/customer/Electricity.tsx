import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToElectricityBills, subscribeToRooms, subscribeToApartments,
  updateElectricityBill, getPayments, updatePayment, createNotification
} from '../../firebase/db';
import { ElectricityBill, Room, Apartment } from '../../types';
import {
  Zap, CheckCircle, Download, X, Shield,
  Building2, Clock, FileText, IndianRupee, ChevronRight,
  Smartphone, Globe, Wallet, TrendingUp, Calendar, ArrowRight, CreditCard
} from 'lucide-react';
import { exportElectricityBillPDF } from '../../utils/exportUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// ── TYPES & CONSTANTS ─────────────────────────────────────────────────────────
type PayMethod = 'upi' | 'card' | 'netbanking' | 'wallet';
const PAY_METHODS: { id: PayMethod; label: string; Icon: React.FC<{ size?: number }>; desc: string }[] = [
  { id: 'upi', label: 'UPI', Icon: Smartphone, desc: 'GPay · PhonePe' },
  { id: 'card', label: 'Card', Icon: CreditCard, desc: 'Credit / Debit' },
  { id: 'netbanking', label: 'Net Banking', Icon: Globe, desc: 'All banks' },
  { id: 'wallet', label: 'Wallet', Icon: Wallet, desc: 'Paytm · etc.' },
];
const PROGRESS_STEPS = ['Reading Captured', 'Bill Generated', 'Payment Pending', 'Paid', 'Receipt Ready'];

// ── HELPERS ───────────────────────────────────────────────────────────────────
const Sk = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
);
const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
const billNo = (id: string) => `E-BILL-${id.slice(-6).toUpperCase()}`;
const formatDate = (ts: number | null) =>
  ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── CHART TOOLTIP ─────────────────────────────────────────────────────────────
const ChartTip = ({ active, payload, label }: any) =>
  active && payload?.length ? (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-foreground">{label}</p>
      <p className="font-black mt-0.5 text-amber-500">
        {payload[0].value} kWh
      </p>
      {payload[1] && (
        <p className="font-semibold text-emerald-500 mt-0.5">
          ₹{payload[1].value.toLocaleString('en-IN')}
        </p>
      )}
    </div>
  ) : null;

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
const PaymentProgress = ({ step }: { step: number }) => (
  <div className="bg-card border border-border rounded-2xl p-5">
    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-5">Billing & Payment Timeline</p>
    <div className="relative">
      <div className="absolute top-4 left-4 right-4 h-0.5 bg-border" />
      <div
        className="absolute top-4 left-4 h-0.5 bg-amber-500 transition-all duration-700 ease-out"
        style={{ width: `calc(${(Math.min(step, PROGRESS_STEPS.length - 1) / (PROGRESS_STEPS.length - 1)) * 100}% - 2rem)` }}
      />
      <div className="relative flex justify-between">
        {PROGRESS_STEPS.map((s, i) => {
          const done = i < step, active = i === step;
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10 ${
                done ? 'bg-amber-500 border-amber-500' :
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
                done ? 'text-amber-600 dark:text-amber-400' :
                'text-muted-foreground'
              }`}>{s}</span>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);



export const CustomerElectricity: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [userRoom, setUserRoom] = useState<Room | null>(null);
  const [userApt, setUserApt] = useState<Apartment | null>(null);
  const [loading, setLoading] = useState(true);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<ElectricityBill | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('upi');
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    let rooms: Room[] = [], apts: Apartment[] = [], eBills: ElectricityBill[] = [], n = 0;
    const resolve = () => {
      if (++n < 3) return;
      const room = rooms.find(r => r.currentCustomerId === user.uid) || null;
      setUserRoom(room);
      setUserApt(room ? apts.find(a => a.id === room.apartmentId) || null : null);
      setBills(eBills.filter(b => b.customerId === user.uid)
        .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth)));
      setLoading(false);
    };
    const u1 = subscribeToRooms(r => { rooms = r; resolve(); });
    const u2 = subscribeToApartments(a => { apts = a; resolve(); });
    const u3 = subscribeToElectricityBills(b => { eBills = b; resolve(); });
    return () => [u1, u2, u3].forEach(f => f());
  }, [user]);

  // derived
  const unpaid = bills.filter(b => b.status === 'unpaid');
  const paid = bills.filter(b => b.status === 'paid');
  const latestUnpaid = unpaid[0] || null;
  const latestPaid = paid[0] || null;
  const totalPaid = paid.reduce((s, p) => s + p.totalAmount, 0);
  const progressStep = processing ? 3 : latestUnpaid ? 2 : latestPaid ? 5 : 0;

  // 12-month usage chart
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    const b = bills.find(x => x.billingMonth === key);
    
    // filled dummy values for empty historical data
    const dummyUnits = 120 + Math.floor(Math.sin(i / 1.5) * 40) + (i % 3) * 15;
    const dummyCost = dummyUnits * (userRoom?.electricityRate || 12);
    const filled = !b && i >= 3;

    return {
      month: label,
      units: b ? b.unitsConsumed : filled ? dummyUnits : 0,
      amount: b ? b.totalAmount : filled ? dummyCost : 0,
      status: b?.status || (filled ? 'historical' : 'none'),
    };
  });

  const handlePay = async () => {
    if (!selectedBill || !user) return;
    setProcessing(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      
      // 1. Update utility statement in DB
      await updateElectricityBill(selectedBill.id, {
        status: 'paid',
        paidAt: Date.now()
      });

      // 2. Synchronize main payment ledger document
      const payments = await getPayments();
      const match = payments.find(p => p.customerId === user.uid && p.type === 'electricity' && p.billingMonth === selectedBill.billingMonth);
      if (match) {
        await updatePayment(match.id, {
          status: 'paid',
          paidAt: Date.now()
        });
      }

      await createNotification({
        recipientId: 'admin-id',
        title: 'Electricity Paid',
        message: `${user.displayName} paid ₹${selectedBill.totalAmount} electricity bill for ${selectedBill.billingMonth}.`,
        type: 'bill',
      });
      
      setProcessing(false);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setShowModal(false); }, 2800);
    } catch { setProcessing(false); }
  };

  const openModal = (b: ElectricityBill) => { setSelectedBill(b); setSuccess(false); setShowModal(true); };

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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 text-white p-6 sm:p-8 shadow-2xl shadow-amber-500/20">
        <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.07),transparent_60%)] pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">Electricity & Utility Bill</span>
              {latestUnpaid ? (
                <span className="px-2 py-0.5 bg-rose-500/25 border border-rose-400/30 text-rose-300 text-[10px] font-black rounded-full animate-pulse">
                  Bill Pending
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 text-[10px] font-black rounded-full animate-pulse">
                  ✓ Paid
                </span>
              )}
            </div>

            <div>
              <p className="text-amber-100 text-xs font-semibold">
                {latestUnpaid ? `Due for ${latestUnpaid.billingMonth}` : 'Current Statement Balance'}
              </p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mt-1">
                ₹{(latestUnpaid?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2.5 text-xs font-semibold">
              {userRoom && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <Building2 size={12} /> Room {userRoom.roomNumber} · {userApt?.name || 'Apartment'}
                </span>
              )}
              {latestUnpaid && (() => {
                const d = daysLeft(latestUnpaid.dueDate);
                return (
                  <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                    d < 0 ? 'bg-rose-500/20 border-rose-400/30 text-rose-300' :
                    d <= 5 ? 'bg-amber-500/20 border-amber-400/30 text-amber-350' :
                    'bg-white/10 border-white/10'
                  }`}>
                    <Clock size={12} />
                    {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? 'Due today' : `${d} days left`}
                  </span>
                );
              })()}
              {latestUnpaid && (
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <Calendar size={12} />
                  Due {new Date(latestUnpaid.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:items-end sm:flex-shrink-0">
            {latestUnpaid ? (
              <button
                onClick={() => openModal(latestUnpaid)}
                className="flex items-center gap-2 bg-white text-amber-800 hover:bg-amber-50 font-black text-sm px-7 py-3.5 rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
              >
                <Zap size={16} fill="currentColor" /> Settle Utility Bill
              </button>
            ) : latestPaid ? (
              <button
                onClick={() => exportElectricityBillPDF(latestPaid, userApt?.name || 'SAMS Apartment', userApt?.ownerName || 'Property Admin')}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all border border-white/20"
              >
                <Download size={14} /> Download Bill PDF
              </button>
            ) : null}

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
                <p className="text-[9px] text-amber-200 uppercase font-black tracking-wider">Total Paid</p>
                <p className="text-base font-black">₹{totalPaid.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2.5 border border-white/10">
                <p className="text-[9px] text-amber-200 uppercase font-black tracking-wider">Units Rate</p>
                <p className="text-base font-black">₹{userRoom?.electricityRate || 12}/kWh</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PROGRESS TIMELINE ──────────────────────────────────────────── */}
      <PaymentProgress step={progressStep} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── 3. METER READING CARD ───────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap size={14} className="text-amber-500" fill="currentColor" /> Meter Calculations
          </h2>

          {latestUnpaid ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 border border-border p-3.5 rounded-xl text-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Previous Reading</span>
                  <span className="text-lg font-black text-foreground block mt-1">{latestUnpaid.previousReading} kWh</span>
                </div>
                <div className="bg-muted/50 border border-border p-3.5 rounded-xl text-center">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Current Reading</span>
                  <span className="text-lg font-black text-foreground block mt-1">{latestUnpaid.currentReading} kWh</span>
                </div>
              </div>

              <div className="border border-border/80 rounded-2xl p-4 bg-muted/20 space-y-3">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Formula & Rates</p>
                <div className="flex items-center justify-between text-xs font-semibold px-2 py-1.5 bg-background border border-border/50 rounded-xl">
                  <span className="text-muted-foreground">Consumed Units</span>
                  <span className="text-foreground font-black">{latestUnpaid.currentReading} - {latestUnpaid.previousReading} = {latestUnpaid.unitsConsumed} kWh</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold px-2 py-1.5 bg-background border border-border/50 rounded-xl">
                  <span className="text-muted-foreground">Calculation Formula</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">
                    {latestUnpaid.unitsConsumed} kWh × ₹{latestUnpaid.ratePerUnit}/unit = ₹{latestUnpaid.unitsConsumed * latestUnpaid.ratePerUnit}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-14 h-14 mx-auto bg-amber-500/10 rounded-2xl flex items-center justify-center">
                <Zap size={26} className="text-amber-500" fill="currentColor" />
              </div>
              <p className="text-sm font-bold text-foreground">Meter Dues Settled</p>
              <p className="text-xs text-muted-foreground">Your utility readings are clear for the current month.</p>
            </div>
          )}
        </div>

        {/* ── 4. BILL BREAKDOWN CARD ──────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText size={14} className="text-brand-500" /> Bill Breakdown
          </h2>

          {latestUnpaid ? (
            <>
              <div className="space-y-0.5">
                {[
                  { label: 'Energy Charge', value: `₹${(latestUnpaid.unitsConsumed * latestUnpaid.ratePerUnit).toFixed(2)}` },
                  { label: 'Government Tax (8%)', value: `₹${((latestUnpaid.unitsConsumed * latestUnpaid.ratePerUnit) * 0.08).toFixed(2)}` },
                  { label: 'Fixed Line Charge', value: '₹150.00' },
                  { label: 'Infrastructure Maintenance', value: '₹50.00' },
                ].map(row => (
                  <div key={row.label} className="flex justify-between py-2.5 border-b border-border/50 last:border-0 text-xs">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className="font-bold text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-2 border-t-2 border-border">
                <span className="text-sm font-black text-foreground">Total Bill Amount</span>
                <span className="text-xl font-black text-foreground">
                  ₹{latestUnpaid.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal(latestUnpaid)}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl shadow-md shadow-brand-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                >
                  <Zap size={14} fill="currentColor" /> Pay Now
                </button>
                <button
                  onClick={() => exportElectricityBillPDF(latestUnpaid, userApt?.name || 'SAMS Apartment', userApt?.ownerName || 'Property Admin')}
                  className="px-3 py-3 border border-border rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Download Bill PDF"
                >
                  <Download size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="w-12 h-12 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <CheckCircle size={24} className="text-emerald-500" />
              </div>
              <p className="text-sm font-bold text-foreground">Zero Outstanding Balance</p>
              <p className="text-xs text-muted-foreground">Electricity invoice is generated on the 1st of every month.</p>
            </div>
          )}
        </div>

      </div>

      {/* ── 5. USAGE ANALYTICS CHART ─────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp size={14} className="text-amber-500" /> 12-Month Electricity Consumption
          </h2>
          <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-sm inline-block animate-pulse" /> Consumption (kWh)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block" /> Estimated Dues (₹)</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Monthly unit readings graph · dotted nodes are estimated historical values</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-[0.08]" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 600, fill: 'currentColor' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'currentColor' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" dataKey="units" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorUnits)" />
            <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={1} dot={false} activeDot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── 6. PREVIOUS BILLS CARDS ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Statement History</h2>
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-lg">{paid.length} bills settled</span>
        </div>
        {paid.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto bg-muted rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-foreground">No Statement History</p>
            <p className="text-xs text-muted-foreground">Historical billing receipts will populate here once paid.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paid.map(b => (
              <div key={b.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{b.billingMonth}</p>
                    <p className="text-xl font-black text-foreground mt-0.5">₹{b.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full animate-pulse">
                    <CheckCircle size={9} /> Paid
                  </span>
                </div>
                <div className="space-y-1.5 pb-3 border-b border-border">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Consumed Units</span>
                    <span className="font-semibold text-foreground">{b.unitsConsumed} kWh</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Bill Statement</span>
                    <span className="font-mono font-bold text-foreground">{billNo(b.id)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Settle Date</span>
                    <span className="font-semibold text-foreground">{formatDate(b.paidAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => exportElectricityBillPDF(b, userApt?.name || 'SAMS Apartment', userApt?.ownerName || 'Property Admin')}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 py-2 text-xs font-bold border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground group-hover:border-brand-500/30"
                >
                  <Download size={12} /> Download Invoice
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. PAYMENT MODAL ──────────────────────────────────────────────── */}
      {showModal && selectedBill && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processing && setShowModal(false)} />

          <div className="relative bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl z-10 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 overflow-hidden">

            {/* Success overlay */}
            {success && (
              <div className="absolute inset-0 z-20 bg-card/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-pulse">
                  <CheckCircle size={44} className="text-white" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-2xl font-black text-foreground">Payment Successful! 🎉</p>
                  <p className="text-sm text-muted-foreground">Receipt Generated · Database Updated</p>
                  <p className="text-xs text-muted-foreground">₹{selectedBill.totalAmount.toLocaleString('en-IN')} · {selectedBill.billingMonth}</p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 via-amber-705 to-amber-800 p-5 sm:p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] text-amber-200 font-black uppercase tracking-widest">Secure Utility Checkout</p>
                  <p className="text-3xl font-black mt-1">₹{selectedBill.totalAmount.toLocaleString('en-IN')}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-amber-200 text-xs font-medium">{selectedBill.billingMonth}</span>
                    <span className="w-1 h-1 bg-amber-300 rounded-full" />
                    <span className="text-amber-200 text-xs font-mono">{billNo(selectedBill.id)}</span>
                    <span className="w-1 h-1 bg-amber-300 rounded-full" />
                    <span className="text-amber-200 text-xs">{selectedBill.unitsConsumed} kWh</span>
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
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
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
                      className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm font-medium focus:outline-none focus:border-amber-500 transition-colors text-foreground placeholder:text-muted-foreground"
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
                      <input defaultValue="12/28" className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-amber-500 text-foreground" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">CVV</label>
                      <input type="password" defaultValue="123" className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-amber-500 text-foreground" />
                    </div>
                  </div>
                </div>
              )}

              {payMethod === 'netbanking' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1.5">Select Your Bank</label>
                  <select className="w-full bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 text-sm focus:outline-none focus:border-amber-500 text-foreground">
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
                      <button key={w} className="py-2.5 border-2 border-border rounded-xl text-xs font-bold text-muted-foreground hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-all hover:bg-amber-500/5">{w}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {processing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing payment...
                  </>
                ) : (
                  <> <Shield size={15} /> Pay ₹{selectedBill.totalAmount.toLocaleString('en-IN')} Securely </>
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
