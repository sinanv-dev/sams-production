import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToElectricityBills, subscribeToApartments, subscribeToRooms, 
  updateElectricityBill, getSystemSettings, createElectricityBill, subscribeToUsers 
} from '../../firebase/db';
import { ElectricityBill, Apartment, Room, UserProfile } from '../../types';
import { 
  Zap, CheckCircle, Clock, Search, Download, Activity, Loader2, 
  TrendingUp, Plus, ShieldAlert, BarChart2, Check, RefreshCw 
} from 'lucide-react';
import { exportElectricityBillPDF, exportAllElectricityBillsPDF } from '../../utils/exportUtils';

export const OwnerElectricity: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [ratePerUnit, setRatePerUnit] = useState(12);

  // Bulk Generation Form State
  const [bulkGenerating, setBulkGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    unsubscribes.push(subscribeToElectricityBills(setBills));
    unsubscribes.push(subscribeToApartments(setApartments));
    unsubscribes.push(subscribeToRooms(setRooms));
    unsubscribes.push(subscribeToUsers(setUsers));

    // Get system settings for electricity unit rate
    getSystemSettings().then(settings => {
      if (settings?.electricityRatePerKWh) {
        setRatePerUnit(settings.electricityRatePerKWh);
      }
    });

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
  const filteredBills = bills.filter(b => ownerAptIds.includes(b.apartmentId))
    .sort((a,b) => b.billingMonth.localeCompare(a.billingMonth));

  // Search & Filter
  const filteredList = filteredBills.filter(b => {
    const matchSearch = !search || 
      (b.customerName || '').toLowerCase().includes(search.toLowerCase()) || 
      (b.roomNumber || '').includes(search) ||
      (apartments.find(a => a.id === b.apartmentId)?.name || '').toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    
    const matchMonth = !monthFilter || b.billingMonth === monthFilter;
    return matchSearch && matchStatus && matchMonth;
  });

  // Calculate Electricity KPIs
  const totalCollected = filteredBills.filter(b => b.status === 'paid').reduce((s,b) => s + b.totalAmount, 0);
  const totalPending = filteredBills.filter(b => b.status !== 'paid').reduce((s,b) => s + b.totalAmount, 0);
  const totalUnits = filteredBills.reduce((s,b) => s + b.unitsConsumed, 0);
  const avgConsumption = filteredBills.length > 0 ? Math.round(totalUnits / filteredBills.length) : 0;

  const months = [...new Set(filteredBills.map(b => b.billingMonth))].sort().reverse();

  // Mark Bill as Paid
  const handleMarkPaid = async (bill: ElectricityBill) => {
    if (!window.confirm(`Mark Electricity bill of ₹${bill.totalAmount.toLocaleString()} for ${bill.customerName} as Paid?`)) return;
    try {
      await updateElectricityBill(bill.id, {
        status: 'paid',
        paidAt: Date.now()
      });
    } catch (err) {
      alert('Failed to settle bill status.');
    }
  };

  // Bulk Generator Simulation (generates bills for vacant or occupied rooms for the current month)
  const handleBulkGenerate = async () => {
    setBulkGenerating(true);
    try {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Find rooms needing bills
      const roomsNeedingBills = rooms.filter(r => r.currentCustomerId && ownerAptIds.includes(r.apartmentId));
      let generatedCount = 0;

      for (const rm of roomsNeedingBills) {
        const alreadyBilled = bills.some(b => b.roomId === rm.id && b.billingMonth === monthKey);
        if (!alreadyBilled) {
          const prevReading = 1020;
          const currReading = prevReading + Math.floor(100 + Math.random() * 200);
          const unitsConsumed = currReading - prevReading;
          const rate = ratePerUnit;
          const totalAmount = unitsConsumed * rate;

          await createElectricityBill({
            roomId: rm.id,
            roomNumber: rm.roomNumber,
            apartmentId: rm.apartmentId,
            customerId: rm.currentCustomerId || '',
            customerName: users.find(u => u.uid === rm.currentCustomerId)?.displayName || 'Tenant',
            billingMonth: monthKey,
            previousReading: prevReading,
            currentReading: currReading,
            unitsConsumed,
            totalAmount,
            ratePerUnit: rate,
            status: 'unpaid',
            dueDate: `${now.toISOString().split('T')[0].substring(0, 7)}-10`,
            paidAt: null
          });
          generatedCount++;
        }
      }
      alert(`Bulk bill generation completed! Generated ${generatedCount} electricity bill invoices.`);
    } catch (err) {
      console.error(err);
      alert('Failed to run bulk generation.');
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleDownloadBill = (bill: ElectricityBill) => {
    setDownloading(bill.id);
    const apt = apartments.find(a => a.id === bill.apartmentId);
    setTimeout(() => {
      exportElectricityBillPDF(bill, apt ? apt.name : 'SAMS Complex', user?.displayName || 'Owner');
      setDownloading(null);
    }, 600);
  };

  const handleDownloadAllBills = () => {
    setDownloading('all');
    setTimeout(() => {
      exportAllElectricityBillsPDF(filteredList, monthFilter || 'All_Months', apartments);
      setDownloading(null);
    }, 900);
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-[28px] font-black text-foreground tracking-tight leading-tight">
            Electricity Billing
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium mt-0.5">
            Manage unit consumption readings, adjust electricity rates, and distribute utility bills.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleBulkGenerate}
            disabled={bulkGenerating}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {bulkGenerating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            <span>{bulkGenerating ? 'Generating...' : 'Bulk Bill Generation'}</span>
          </button>
          <button
            onClick={handleDownloadAllBills}
            disabled={downloading !== null || filteredList.length === 0}
            className="flex items-center gap-1.5 px-4.5 py-2.5 border border-border hover:bg-muted text-foreground font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            {downloading === 'all' ? 'Downloading...' : 'Export Utility Ledger'}
          </button>
        </div>
      </div>

      {/* ── UNIT RATE WARNING BANNER ────────────────────────────────────────── */}
      <div className="bg-blue-500/5 dark:bg-blue-950/10 border border-blue-500/20 rounded-3xl p-5 flex items-center gap-3.5 shadow-sm">
        <Activity className="text-blue-500 shrink-0" size={20} />
        <div>
          <p className="text-[16px] text-foreground font-semibold">Active Unit Rate: ₹{ratePerUnit} / kWh</p>
          <p className="text-[14px] text-muted-foreground font-medium mt-0.5">
            System pricing rates are set centrally by the administrator. Contact support to update the tariff pricing model.
          </p>
        </div>
      </div>

      {/* ── 1. KPI METRICS GRID ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Current Rate</span>
          <span className="text-[20px] font-black text-foreground block mt-1">₹{ratePerUnit}/Unit</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Bills Collected</span>
          <span className="text-[20px] font-black text-emerald-600 block mt-1">₹{totalCollected.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Bills Outstanding</span>
          <span className="text-[20px] font-black text-rose-500 block mt-1">₹{totalPending.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Total Energy Consumed</span>
          <span className="text-[20px] font-black text-indigo-650 block mt-1">{totalUnits} kWh</span>
        </div>
        <div className="bg-card border border-border p-4 rounded-3xl">
          <span className="text-[12px] text-muted-foreground font-bold block">Avg Consumption</span>
          <span className="text-[20px] font-black text-blue-600 block mt-1">{avgConsumption} kWh</span>
        </div>
      </div>

      {/* ── 2. CONSUMPTION CHART ─────────────────────────────────────────────── */}
      <section className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
        <div className="border-b border-border pb-3">
          <h3 className="text-[20px] font-bold text-foreground tracking-tight">Consumption Metrics</h3>
          <p className="text-[14px] text-muted-foreground mt-0.5">Average monthly utility load analysis.</p>
        </div>

        {/* SVG Bar Chart */}
        <div className="relative h-44 w-full bg-slate-50/50 dark:bg-slate-900/10 border border-border rounded-2xl flex items-end justify-around p-4 pt-8">
          <div className="absolute inset-x-0 bottom-10 border-b border-border/80"></div>
          <div className="absolute inset-x-0 bottom-24 border-b border-border/80"></div>
          
          {months.slice(0, 5).reverse().map((m, idx) => {
            const mBills = filteredBills.filter(b => b.billingMonth === m);
            const mUnits = mBills.reduce((s,b) => s + b.unitsConsumed, 0);
            const pct = Math.min(Math.round((mUnits / (totalUnits || 1)) * 100 * 3), 85);

            return (
              <div key={idx} className="z-10 flex flex-col items-center w-12">
                <span className="text-[10px] font-bold text-foreground">{mUnits} kWh</span>
                <div 
                  className="w-8 bg-emerald-500 rounded-t-lg mt-2 transition-all duration-500"
                  style={{ height: `${Math.max(pct, 12)}px` }}
                />
                <span className="text-[12px] text-muted-foreground font-bold mt-2">{m}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. FILTERS & SEARCH ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card border border-border p-4 rounded-3xl shadow-sm">
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

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end text-xs font-bold">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
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

      {/* ── 4. BILLS TABLE ─────────────────────────────────────────────────── */}
      {filteredList.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-16 text-center shadow-sm space-y-3">
          <Zap className="mx-auto text-slate-300 w-16 h-16" />
          <h3 className="text-[20px] font-bold text-foreground">No Utility Bills Found</h3>
          <p className="text-[14px] text-muted-foreground font-medium">Auto-calculate or select bulk bill generation above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-[14px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                <th className="p-4">Customer</th>
                <th className="p-4">Apartment & Room</th>
                <th className="p-4">Month</th>
                <th className="p-4">Readings</th>
                <th className="p-4">Units Used</th>
                <th className="p-4">Bill Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground font-semibold">
              {filteredList.map((bill) => {
                const parentApt = apartments.find(a => a.id === bill.apartmentId);
                const isPaid = bill.status === 'paid';

                return (
                  <tr key={bill.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-4">
                      <Link to={`/owner/customers/${bill.customerId}`} className="hover:underline font-extrabold">
                        {bill.customerName}
                      </Link>
                    </td>

                    <td className="p-4">
                      <span>{parentApt ? parentApt.name : 'Apartment'}</span>
                      <span className="text-[12px] text-muted-foreground block font-medium mt-0.5">Room {bill.roomNumber}</span>
                    </td>

                    <td className="p-4">{bill.billingMonth}</td>
                    <td className="p-4 text-muted-foreground font-medium">{bill.previousReading} &rarr; {bill.currentReading}</td>
                    <td className="p-4">{bill.unitsConsumed} kWh</td>
                    <td className="p-4 font-bold text-brand-650">₹{bill.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                        isPaid 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {bill.status}
                      </span>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {isPaid ? (
                          <button
                            onClick={() => handleDownloadBill(bill)}
                            disabled={downloading === bill.id}
                            className="p-1.5 hover:bg-muted text-brand-650 border border-border rounded-xl"
                            title="Download Invoice PDF"
                          >
                            <Download size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMarkPaid(bill)}
                            className="p-1.5 hover:bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl"
                            title="Mark Paid"
                          >
                            <Check size={14} />
                          </button>
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
