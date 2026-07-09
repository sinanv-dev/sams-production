import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApartments, getPayments, getElectricityBills } from '../../firebase/db';
import { Apartment, Payment, ElectricityBill } from '../../types';
import { ArrowLeft, ChevronRight, IndianRupee, TrendingUp, AlertTriangle, CheckCircle, Zap } from 'lucide-react';

export const RevenueAnalytics: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [loading, setLoading] = useState(true);

  const [typeFilter, setTypeFilter] = useState<'all' | 'rent' | 'electricity'>('all');
  const [aptFilter, setAptFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [allApts, allPayments, allBills] = await Promise.all([
        getApartments(),
        getPayments(),
        getElectricityBills()
      ]);

      let ownerAptIds: string[] = [];
      if (user.uid === 'owner-john-id') {
        ownerAptIds = ['apt-1', 'apt-2'];
      } else if (user.uid === 'owner-jane-id') {
        ownerAptIds = ['apt-3'];
      } else {
        ownerAptIds = allApts.map(a => a.id);
      }

      setApartments(allApts.filter(a => ownerAptIds.includes(a.id)));
      setPayments(allPayments.filter(p => ownerAptIds.includes(p.apartmentId)));
      setBills(allBills.filter(b => ownerAptIds.includes(b.apartmentId)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Current Month calculations
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const rentCollected = payments
    .filter(p => p.status === 'paid' && p.type === 'rent')
    .reduce((sum, p) => sum + p.amount, 0);

  const rentPending = payments
    .filter(p => p.status === 'pending' && p.type === 'rent')
    .reduce((sum, p) => sum + p.amount, 0);

  const rentOverdue = payments
    .filter(p => p.status === 'overdue' && p.type === 'rent')
    .reduce((sum, p) => sum + p.amount, 0);

  const electricityCollected = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const electricityPending = bills
    .filter(b => b.status === 'unpaid')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  // Total metrics
  const totalRevenue = rentCollected + electricityCollected;
  const pendingRevenue = rentPending + rentOverdue + electricityPending;

  const totalRentCount = payments.filter(p => p.type === 'rent').length;
  const paidRentCount = payments.filter(p => p.type === 'rent' && p.status === 'paid').length;
  const rentCollectionRate = totalRentCount > 0 ? Math.round((paidRentCount / totalRentCount) * 100) : 0;

  const totalElecCount = bills.length;
  const paidElecCount = bills.filter(b => b.status === 'paid').length;
  const elecCollectionRate = totalElecCount > 0 ? Math.round((paidElecCount / totalElecCount) * 100) : 0;

  const overallCollectionRate = (totalRentCount + totalElecCount) > 0
    ? Math.round(((paidRentCount + paidElecCount) / (totalRentCount + totalElecCount)) * 100)
    : 0;

  // Build combined details list
  interface UnifiedTransaction {
    id: string;
    type: 'rent' | 'electricity';
    customerName: string;
    apartmentName: string;
    roomNumber: string;
    amount: number;
    billingMonth: string;
    status: 'paid' | 'pending' | 'overdue';
    dueDate: string;
  }

  const rentTx: UnifiedTransaction[] = payments.map(p => ({
    id: p.id,
    type: 'rent',
    customerName: p.customerName || 'Unknown',
    apartmentName: p.apartmentName || apartments.find(a => a.id === p.apartmentId)?.name || 'Building',
    roomNumber: p.roomNumber || '—',
    amount: p.amount,
    billingMonth: p.billingMonth,
    status: p.status,
    dueDate: p.dueDate
  }));

  const elecTx: UnifiedTransaction[] = bills.map(b => ({
    id: b.id,
    type: 'electricity',
    customerName: b.customerName || 'Unknown',
    apartmentName: b.apartmentName || apartments.find(a => a.id === b.apartmentId)?.name || 'Building',
    roomNumber: b.roomNumber || '—',
    amount: b.totalAmount,
    billingMonth: b.billingMonth,
    status: b.status === 'paid' ? 'paid' : 'pending',
    dueDate: b.dueDate
  }));

  const combinedTx = [...rentTx, ...elecTx].sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));

  const filteredTx = combinedTx.filter(tx => {
    const matchType = typeFilter === 'all' || tx.type === typeFilter;
    const matchApt = aptFilter === 'all' || payments.find(p => p.id === tx.id)?.apartmentId === aptFilter || bills.find(b => b.id === tx.id)?.apartmentId === aptFilter;
    return matchType && matchApt;
  });

  return (
    <div className="space-y-6">
      {/* ── BREADCRUMBS & BACK BUTTON ────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft size={14} className="mr-1" /> Back
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>Owner</span>
          <ChevronRight size={12} />
          <Link to="/owner/reports" className="hover:underline">Reports & Analytics</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-bold">Revenue Details</span>
        </div>
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          Revenue Details & Financials
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Comprehensive rent collection auditing, pending payments, and utility dues.
        </p>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Collected */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-5 shadow-sm text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center">
              <IndianRupee size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">Total Collected</span>
          </div>
          <p className="text-2xl font-black">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-100 font-semibold mt-1">Rent + Electricity</p>
        </div>

        {/* Pending Amounts */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Pending</span>
          </div>
          <p className="text-2xl font-black text-foreground">₹{pendingRevenue.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-red-500 dark:text-red-400 font-bold mt-1">Rent & electric dues</p>
        </div>

        {/* Rent Collection Rate */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1">
            <span>Rent Collection Rate</span>
            <span className="font-bold text-foreground">{rentCollectionRate}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rentCollectionRate}%` }} />
          </div>
          <span className="text-[9px] text-muted-foreground font-medium">₹{rentCollected.toLocaleString('en-IN')} of ₹{(rentCollected + rentPending + rentOverdue).toLocaleString('en-IN')}</span>
        </div>

        {/* Elec Collection Rate */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1">
            <span>Electricity Collection</span>
            <span className="font-bold text-foreground">{elecCollectionRate}%</span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${elecCollectionRate}%` }} />
          </div>
          <span className="text-[9px] text-muted-foreground font-medium">₹{electricityCollected.toLocaleString('en-IN')} of ₹{(electricityCollected + electricityPending).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* ── REVENUE BY APARTMENT ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4">Revenue breakdown by Apartment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apartments.map(apt => {
            const aptPayments = payments.filter(p => p.apartmentId === apt.id && p.status === 'paid');
            const aptBills = bills.filter(b => b.apartmentId === apt.id && b.status === 'paid');
            const rentRev = aptPayments.reduce((s, p) => s + p.amount, 0);
            const elecRev = aptBills.reduce((s, b) => s + b.totalAmount, 0);
            const totalAptRev = rentRev + elecRev;

            const pendingRent = payments.filter(p => p.apartmentId === apt.id && p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
            const pendingElec = bills.filter(b => b.apartmentId === apt.id && b.status !== 'paid').reduce((s, b) => s + b.totalAmount, 0);
            const totalAptPending = pendingRent + pendingElec;

            return (
              <div 
                key={apt.id} 
                onClick={() => navigate(`/owner/apartments/${apt.id}`)}
                className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/30 hover:border-emerald-500 cursor-pointer transition-all duration-150"
              >
                <h4 className="font-bold text-slate-855 dark:text-slate-100 text-sm mb-1">{apt.name}</h4>
                <div className="flex justify-between items-center py-1.5 border-b border-border">
                  <span className="text-xs text-slate-550 dark:text-slate-400 font-semibold">Rent Collected</span>
                  <span className="text-xs font-bold text-foreground">₹{rentRev.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border">
                  <span className="text-xs text-slate-550 dark:text-slate-400 font-semibold">Electricity Collected</span>
                  <span className="text-xs font-bold text-foreground">₹{elecRev.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-border text-emerald-650 dark:text-emerald-400">
                  <span className="text-xs font-black">Total Revenue</span>
                  <span className="text-sm font-black">₹{totalAptRev.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 text-red-500 dark:text-red-400 font-semibold">
                  <span className="text-[11px]">Pending / Due</span>
                  <span className="text-xs">₹{totalAptPending.toLocaleString('en-IN')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── DETAILED TRANSACTIONS TABLE ─────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex flex-wrap justify-between items-center gap-3">
          <h3 className="text-base font-bold text-foreground">Transaction History</h3>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 bg-table-header border border-border rounded-lg focus:outline-none text-foreground font-bold"
            >
              <option value="all">All Types</option>
              <option value="rent">Rent Dues</option>
              <option value="electricity">Electricity Bills</option>
            </select>

            <select
              value={aptFilter}
              onChange={e => setAptFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-table-header border border-border rounded-lg focus:outline-none text-foreground font-bold"
            >
              <option value="all">All Apartments</option>
              {apartments.map(apt => (
                <option key={apt.id} value={apt.id}>{apt.name}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-semibold">
            No transactions found matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-table-header border-b border-border">
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Customer</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Room / Apartment</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Month</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Type</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Amount</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-sm font-medium">
                {filteredTx.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5">
                      <span className="font-bold text-foreground">{tx.customerName}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="text-slate-650 dark:text-slate-400 text-xs">
                        Room {tx.roomNumber} · <span className="font-semibold">{tx.apartmentName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-xs font-semibold text-foreground">{tx.billingMonth}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        tx.type === 'rent' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-850 dark:text-slate-100">₹{tx.amount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tx.status === 'paid'
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200'
                          : tx.status === 'overdue'
                          ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
