import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToPayments, subscribeToApartments, 
  updatePayment, createNotification 
} from '../../firebase/db';
import { Payment, Apartment } from '../../types';
import { 
  CreditCard, CheckCircle, Clock, AlertTriangle, Search, 
  Download, Send, Check, ShieldAlert, Sparkles, Filter 
} from 'lucide-react';
import { exportRentReceiptPDF, exportMonthlyRentReportPDF } from '../../utils/exportUtils';

export const OwnerRent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  
  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>(
    (filterParam === 'pending' || filterParam === 'overdue' || filterParam === 'paid') ? filterParam : 'all'
  );
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    // Real-time payments and apartments feeds
    unsubscribes.push(subscribeToPayments(setPayments));
    unsubscribes.push(subscribeToApartments(setApartments));

    setTimeout(() => setLoading(false), 700);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  // Determine owner's portfolio
  const getOwnerAptIds = () => {
    if (!user) return [];
    if (user.uid === 'owner-john-id') return ['apt-1', 'apt-2'];
    if (user.uid === 'owner-jane-id') return ['apt-3'];
    return apartments.map(a => a.id);
  };

  const ownerAptIds = getOwnerAptIds();
  const filteredApts = apartments.filter(a => ownerAptIds.includes(a.id));
  const filteredPayments = payments.filter(p => ownerAptIds.includes(p.apartmentId) && p.type === 'rent')
    .sort((a,b) => b.billingMonth.localeCompare(a.billingMonth));

  // Search & Filter local data
  const filteredList = filteredPayments.filter(p => {
    const matchSearch = !search || 
      (p.customerName || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.roomNumber || '').includes(search) ||
      (apartments.find(a => a.id === p.apartmentId)?.name || '').toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchMonth = !monthFilter || p.billingMonth === monthFilter;
    return matchSearch && matchStatus && matchMonth;
  });

  // Financial realization metrics
  const totalCollected = filteredPayments.filter(p => p.status === 'paid').reduce((s,p) => s + p.amount, 0);
  const totalPending = filteredPayments.filter(p => p.status === 'pending').reduce((s,p) => s + p.amount, 0);
  const totalOverdue = filteredPayments.filter(p => p.status === 'overdue').reduce((s,p) => s + p.amount, 0);
  const expectedIncome = totalCollected + totalPending + totalOverdue;

  // Today's collections
  const startOfToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime();
  const todayCollections = filteredPayments
    .filter(p => p.status === 'paid' && p.paidAt && p.paidAt >= startOfToday)
    .reduce((s, p) => s + p.amount, 0);

  const months = [...new Set(filteredPayments.map(p => p.billingMonth))].sort().reverse();

  // Mark invoice as paid
  const handleMarkPaid = async (payment: Payment) => {
    if (!window.confirm(`Mark Rent Invoice of ₹${payment.amount.toLocaleString()} for ${payment.customerName} as Paid?`)) return;
    try {
      await updatePayment(payment.id, {
        status: 'paid',
        paidAt: Date.now()
      });
      // Broadcast client notification
      await createNotification({
        recipientId: payment.customerId,
        title: 'Rent Statement Receipt Generated',
        message: `Your rent statement payment of ₹${payment.amount.toLocaleString()} for ${payment.billingMonth} has been marked as settled by owner. Rent receipt is available for download.`,
        type: 'bill'
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update rent status.');
    }
  };

  // Send rent reminder notification
  const handleSendReminder = async (payment: Payment) => {
    try {
      await createNotification({
        recipientId: payment.customerId,
        title: 'Rent Outstanding Reminder',
        message: `Outstanding rent of ₹${payment.amount.toLocaleString()} for billing cycle ${payment.billingMonth} is pending. Please settle it by due date.`,
        type: 'bill'
      });
      alert(`Rent payment reminder sent successfully to ${payment.customerName}!`);
    } catch (err) {
      console.error(err);
      alert('Failed to submit reminder.');
    }
  };

  const handleDownloadReceipt = async (payment: Payment) => {
    setDownloading(payment.id);
    const apt = apartments.find(a => a.id === payment.apartmentId);
    try {
      await exportRentReceiptPDF(payment, apt ? apt.name : 'Complex Loft', 0);
    } catch (err) {
      console.error(err);
    }
    setDownloading(null);
  };

  const handleDownloadMonthlyReport = async () => {
    setDownloading('all');
    try {
      await exportMonthlyRentReportPDF(filteredList, monthFilter || 'All_Months', filteredApts);
    } catch (err) {
      console.error(err);
    }
    setDownloading(null);
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-[28px] font-black text-foreground tracking-tight leading-tight">
            Rent Ledger & Collections
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium mt-0.5">
            Monitor monthly realization rates, distribute invoice reminders, and download rent receipts.
          </p>
        </div>
        
        <button
          onClick={handleDownloadMonthlyReport}
          disabled={downloading !== null || filteredList.length === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 shrink-0 w-fit"
        >
          {downloading === 'all' ? 'Generating Report...' : 'Download Rent Report'}
        </button>
      </div>

      {/* ── 1. METRICS CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Rent Collected</span>
          <span className="text-[20px] font-black text-emerald-600 block mt-1">₹{totalCollected.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Rent Pending</span>
          <span className="text-[20px] font-black text-amber-500 block mt-1">₹{totalPending.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Rent Overdue</span>
          <span className="text-[20px] font-black text-rose-500 block mt-1">₹{totalOverdue.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Expected Income</span>
          <span className="text-[20px] font-black text-foreground block mt-1">₹{expectedIncome.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Today's Collections</span>
          <span className="text-[20px] font-black text-blue-600 block mt-1">₹{todayCollections.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* ── 2. FILTERS & SEARCH ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card border border-border p-4 rounded-3xl shadow-sm">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant or room..."
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end text-xs font-bold">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="">All Months</option>
            {months.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── 3. LEDGER TABLE ────────────────────────────────────────────────── */}
      {filteredList.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-16 text-center shadow-sm space-y-3">
          <CreditCard className="mx-auto text-slate-300 w-16 h-16" />
          <h3 className="text-[20px] font-bold text-foreground">No Rent Statements</h3>
          <p className="text-[14px] text-muted-foreground font-medium">Verify room customer contracts to activate billing schedules.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-[14px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                <th className="p-4">Customer</th>
                <th className="p-4">Apartment & Room</th>
                <th className="p-4">Billing Month</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Late Fee</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment Date</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground font-semibold">
              {filteredList.map((pay) => {
                const parentApt = apartments.find(a => a.id === pay.apartmentId);
                const lateFee = pay.status === 'overdue' ? 100 : 0;

                return (
                  <tr key={pay.id} className="hover:bg-muted/40 transition-colors">
                    {/* 1. Customer */}
                    <td className="p-4">
                      <Link to={`/owner/customers/${pay.customerId}`} className="hover:underline font-extrabold">
                        {pay.customerName}
                      </Link>
                    </td>

                    {/* 2. Location */}
                    <td className="p-4">
                      <span>{parentApt ? parentApt.name : 'Apartment'}</span>
                      <span className="text-[12px] text-muted-foreground block font-medium mt-0.5">Room {pay.roomNumber}</span>
                    </td>

                    {/* 3. Month */}
                    <td className="p-4">{pay.billingMonth}</td>

                    {/* 4. Due Date */}
                    <td className="p-4 text-muted-foreground font-medium">{new Date(pay.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>

                    {/* 5. Amount */}
                    <td className="p-4 font-bold">₹{pay.amount.toLocaleString('en-IN')}</td>

                    {/* 6. Late Fee */}
                    <td className="p-4 text-rose-500 font-bold">{lateFee > 0 ? `₹${lateFee}` : '—'}</td>

                    {/* 7. Status */}
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                        pay.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : pay.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {pay.status}
                      </span>
                    </td>

                    {/* 8. Paid On */}
                    <td className="p-4 text-muted-foreground font-semibold">
                      {pay.paidAt ? new Date(pay.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                    </td>

                    {/* 9. Action triggers */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {pay.status === 'paid' ? (
                          <button
                            onClick={() => handleDownloadReceipt(pay)}
                            disabled={downloading === pay.id}
                            className="p-1.5 hover:bg-muted text-brand-650 border border-border rounded-xl transition-all"
                            title="Download Receipt"
                          >
                            <Download size={14} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleMarkPaid(pay)}
                              className="p-1.5 hover:bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl transition-all"
                              title="Mark Paid"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleSendReminder(pay)}
                              className="p-1.5 hover:bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl transition-all"
                              title="Send Reminder Alert"
                            >
                              <Send size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
