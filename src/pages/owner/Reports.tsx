import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApartments, getRooms, getPayments, getComplaints, getElectricityBills, getUsers } from '../../firebase/db';
import { TrendingUp, Users, CreditCard, Zap, CheckCircle, BarChart2, Download, Loader2 } from 'lucide-react';
import { exportMonthlyReportPDF, exportMonthlyReportExcel } from '../../utils/exportUtils';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const OwnerReports: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<'pdf' | 'excel' | null>(null);
  const [stats, setStats] = useState({ occupancyRate: 0, rentCollectionRate: 0, electricityCollectionRate: 0, complaintResolutionRate: 0 });
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; rent: number; electricity: number }[]>([]);
  const [paymentDist, setPaymentDist] = useState({ paid: 0, pending: 0, overdue: 0 });

  // Raw data collections for export operations
  const [apartmentsList, setApartmentsList] = useState<any[]>([]);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [billsList, setBillsList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [complaintsCount, setComplaintsCount] = useState({ open: 0, resolved: 0 });

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [allApts, allRooms, allPayments, allComplaints, allBills, allUsers] = await Promise.all([
        getApartments(), getRooms(), getPayments(), getComplaints(), getElectricityBills(), getUsers()
      ]);
      let ids = user.uid === 'owner-john-id' ? ['apt-1','apt-2'] : user.uid === 'owner-jane-id' ? ['apt-3'] : allApts.map(a=>a.id);
      
      const apartments = allApts.filter(a=>ids.includes(a.id));
      const rooms = allRooms.filter(r=>ids.includes(r.apartmentId));
      const payments = allPayments.filter(p=>ids.includes(p.apartmentId));
      const complaints = allComplaints.filter(c=>ids.includes(c.apartmentId));
      const bills = allBills.filter(b=>ids.includes(b.apartmentId));
      const users = allUsers.filter(u => u.role === 'customer');

      setApartmentsList(apartments);
      setRoomsList(rooms);
      setPaymentsList(payments);
      setBillsList(bills);
      setUsersList(users);

      const occupied = rooms.filter(r=>r.status==='occupied').length;
      const occupancyRate = rooms.length > 0 ? Math.round((occupied/rooms.length)*100) : 0;
      
      const rentPayments = payments.filter(p=>p.type==='rent');
      const rentPaid = rentPayments.filter(p=>p.status==='paid').length;
      const rentCollectionRate = rentPayments.length > 0 ? Math.round((rentPaid/rentPayments.length)*100) : 0;

      const billsPaid = bills.filter(b=>b.status==='paid').length;
      const electricityCollectionRate = bills.length > 0 ? Math.round((billsPaid/bills.length)*100) : 0;

      const resolved = complaints.filter(c=>c.status==='resolved').length;
      const complaintResolutionRate = complaints.length > 0 ? Math.round((resolved/complaints.length)*100) : 0;

      setComplaintsCount({
        open: complaints.filter(c => c.status !== 'resolved').length,
        resolved: resolved
      });

      setStats({ occupancyRate, rentCollectionRate, electricityCollectionRate, complaintResolutionRate });

      // Payment distribution
      setPaymentDist({
        paid: rentPayments.filter(p=>p.status==='paid').length,
        pending: rentPayments.filter(p=>p.status==='pending').length,
        overdue: rentPayments.filter(p=>p.status==='overdue').length,
      });

      // Monthly revenue (last 6 months)
      const now = new Date();
      const monthly = Array.from({length: 6}, (_,i) => {
        const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        const rent = payments.filter(p=>p.type==='rent'&&p.status==='paid'&&p.billingMonth===key).reduce((s,p)=>s+p.amount,0);
        const elec = bills.filter(b=>b.status==='paid'&&b.billingMonth===key).reduce((s,b)=>s+b.totalAmount,0);
        return { month: MONTHS[d.getMonth()], rent, electricity: elec };
      }).reverse();
      setMonthlyRevenue(monthly);
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const handleExportPDF = () => {
    setDownloading('pdf');
    
    // Prepare apartment-wise breakdowns
    const aptBreakdowns = apartmentsList.map(apt => {
      const aptRooms = roomsList.filter(r => r.apartmentId === apt.id);
      const occ = aptRooms.filter(r => r.status === 'occupied').length;
      const vac = aptRooms.filter(r => r.status === 'vacant').length;
      const rentColl = paymentsList.filter(p => p.apartmentId === apt.id && p.status === 'paid' && p.type === 'rent').reduce((s,p) => s + p.amount, 0);
      const elecColl = billsList.filter(b => b.apartmentId === apt.id && b.status === 'paid').reduce((s,b) => s + b.totalAmount, 0);
      return { name: apt.name, occupiedRooms: occ, vacantRooms: vac, rentCollected: rentColl, electricityCollected: elecColl };
    });

    const reportData = {
      occupancyRate: stats.occupancyRate,
      totalRevenue: monthlyRevenue.reduce((s, m) => s + m.rent + m.electricity, 0),
      pendingRent: paymentsList.filter(p => p.status !== 'paid' && p.type === 'rent').reduce((s, p) => s + p.amount, 0),
      complaintsOpen: complaintsCount.open,
      complaintsResolved: complaintsCount.resolved,
      apartments: aptBreakdowns,
      monthlyTrends: monthlyRevenue.map(m => ({ month: m.month, revenue: m.rent + m.electricity }))
    };

    setTimeout(() => {
      exportMonthlyReportPDF(reportData, currentMonthKey);
      setDownloading(null);
    }, 800);
  };

  const handleExportExcel = () => {
    setDownloading('excel');
    
    const dataRows = roomsList.map(room => {
      const apt = apartmentsList.find(a => a.id === room.apartmentId);
      const customer = usersList.find(u => u.uid === room.currentCustomerId);
      const rentPay = paymentsList.find(p => p.roomId === room.id && p.type === 'rent');
      const elecBill = billsList.find(b => b.roomId === room.id && b.billingMonth === currentMonthKey);
      
      const rentStatusStr = rentPay ? rentPay.status.toUpperCase() : 'N/A';
      const elecStatusStr = elecBill ? elecBill.status.toUpperCase() : 'N/A';
      
      const revVal = (rentPay?.status === 'paid' ? rentPay.amount : 0) + (elecBill?.status === 'paid' ? elecBill.totalAmount : 0);
      const pendVal = (rentPay?.status !== 'paid' ? room.rentAmount : 0) + (elecBill?.status !== 'paid' ? (elecBill?.totalAmount || 0) : 0);

      return {
        'Customers': customer ? `${customer.displayName} (${customer.email})` : 'Vacant',
        'Rooms': apt ? `${apt.name} - Room ${room.roomNumber}` : `Room ${room.roomNumber}`,
        'Rent': `₹${room.rentAmount.toLocaleString('en-IN')}`,
        'Electricity': elecBill ? `₹${elecBill.totalAmount.toLocaleString('en-IN')} (${elecBill.unitsConsumed} Units @ ₹${elecBill.ratePerUnit || 12}/Unit)` : '₹0',
        'Payment Status': `Rent: ${rentStatusStr} | Elec: ${elecStatusStr}`,
        'Revenue': `₹${revVal.toLocaleString('en-IN')}`,
        'Pending Amounts': `₹${pendVal.toLocaleString('en-IN')}`,
      };
    });

    setTimeout(() => {
      exportMonthlyReportExcel(dataRows, currentMonthKey);
      setDownloading(null);
    }, 1000);
  };

  const maxRev = Math.max(...monthlyRevenue.map(m=>m.rent+m.electricity), 1);

  const kpiCards = [
    { label: 'Occupancy Rate', value: `${stats.occupancyRate}%`, icon: Users, color: 'blue', desc: 'Rooms currently occupied', to: '/owner/apartments/occupancy' },
    { label: 'Rent Collection', value: `${stats.rentCollectionRate}%`, icon: CreditCard, color: 'emerald', desc: 'Rent payments received', to: '/owner/reports/revenue' },
    { label: 'Electricity Collection', value: `${stats.electricityCollectionRate}%`, icon: Zap, color: 'yellow', desc: 'Electricity bills paid', to: '/owner/electricity' },
    { label: 'Complaint Resolution', value: `${stats.complaintResolutionRate}%`, icon: CheckCircle, color: 'purple', desc: 'Complaints resolved', to: '/owner/complaints' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400',
  };
  const barColor: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  };

  if (loading) return <div className="h-96 flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">Business performance metrics for your managed apartments.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            disabled={downloading !== null}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {downloading === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading === 'pdf' ? 'Generating PDF...' : 'Export Monthly Report (PDF)'}
          </button>
          
          <button
            onClick={handleExportExcel}
            disabled={downloading !== null}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-sm border border-emerald-500"
          >
            {downloading === 'excel' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {downloading === 'excel' ? 'Exporting Excel...' : 'Export Monthly Report (Excel)'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, icon: Icon, color, desc, to }) => (
          <Link 
            key={label} 
            to={to}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md hover:scale-[1.02] hover:border-border-hover cursor-pointer transition-all duration-200 block"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}><Icon size={20}/></div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="text-3xl font-black text-foreground mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${barColor[color]}`} style={{width:value}}/>
            </div>
          </Link>
        ))}
      </div>

      {/* Revenue Bar Chart */}
      <div 
        onClick={() => navigate('/owner/reports/revenue')}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-border-hover cursor-pointer transition-all duration-205"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Revenue Trend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Last 6 months — rent and electricity collected</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block"/>Rent</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block"/>Electricity</span>
          </div>
        </div>
        <div className="flex items-end gap-3 h-48">
          {monthlyRevenue.map((m,i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-muted-foreground">
                {(m.rent+m.electricity)>0 ? `₹${Math.round((m.rent+m.electricity)/1000)}k` : '—'}
              </span>
              <div className="w-full flex-1 flex flex-col justify-end gap-0.5">
                <div className="w-full bg-emerald-500 rounded-t transition-all duration-700" style={{height:`${maxRev>0?(m.rent/maxRev)*80:0}%`, minHeight: m.rent>0?'4px':0}}/>
                <div className="w-full bg-blue-500 transition-all duration-700" style={{height:`${maxRev>0?(m.electricity/maxRev)*60:0}%`, minHeight: m.electricity>0?'4px':0}}/>
              </div>
              <div className="w-full h-0.5 bg-slate-200 dark:bg-slate-700"/>
              <span className="text-[10px] font-bold text-muted-foreground">{m.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-4">Payment Status Distribution</h3>
          <div className="space-y-4">
            {[
              { label: 'Paid', count: paymentDist.paid, total: paymentDist.paid+paymentDist.pending+paymentDist.overdue, bgClass: 'bg-emerald-500' },
              { label: 'Pending', count: paymentDist.pending, total: paymentDist.paid+paymentDist.pending+paymentDist.overdue, bgClass: 'bg-amber-500' },
              { label: 'Overdue', count: paymentDist.overdue, total: paymentDist.paid+paymentDist.pending+paymentDist.overdue, bgClass: 'bg-rose-500' },
            ].map(({label,count,total,bgClass}) => {
              const pct = total > 0 ? Math.round((count/total)*100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm font-semibold text-muted-foreground mb-1.5">
                    <span>{label}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${bgClass} rounded-full transition-all duration-700`} style={{width:`${pct}%`}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Table */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-bold text-foreground mb-4">Performance Summary</h3>
          <div className="space-y-3">
            {kpiCards.map(({ label, value, color, to }) => (
              <Link 
                key={label} 
                to={to}
                className="flex items-center justify-between py-2 border-b border-secondary hover:bg-muted/50 p-1 rounded-lg transition-all last:border-0 cursor-pointer"
              >
                <span className="text-sm text-slate-650 dark:text-slate-400 font-semibold">{label}</span>
                <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${colorMap[color]}`}>{value}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
