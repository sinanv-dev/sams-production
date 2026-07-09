import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToApartments, subscribeToRooms, subscribeToUsers, 
  subscribeToPayments, subscribeToComplaints, subscribeToRequests, 
  subscribeToElectricityBills, subscribeToNotifications
} from '../../firebase/db';
import { Apartment, Room, UserProfile, Payment, Complaint, ApartmentRequest, ElectricityBill, Notification } from '../../types';
import {
  Building2, Users, DoorOpen, IndianRupee, Clock, AlertCircle,
  ArrowRight, CheckCircle, TrendingUp, AlertTriangle, Zap, Calendar,
  MessageSquare, Plus, FileText, BarChart2, Bell, Shield, ChevronRight, Activity, ArrowUpRight, ArrowDownRight, CreditCard
} from 'lucide-react';

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Raw database states
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [requests, setRequests] = useState<ApartmentRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Interactive UI state
  const [revenuePeriod, setRevenuePeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    // Real-time subscribers
    unsubscribes.push(subscribeToApartments(setApartments));
    unsubscribes.push(subscribeToRooms(setRooms));
    unsubscribes.push(subscribeToUsers((usersList) => {
      setCustomers(usersList.filter(u => u.role === 'customer'));
    }));
    unsubscribes.push(subscribeToPayments(setPayments));
    unsubscribes.push(subscribeToElectricityBills(setBills));
    unsubscribes.push(subscribeToComplaints(setComplaints));
    unsubscribes.push(subscribeToRequests(setRequests));
    
    // Subscribe to notifications for the logged-in owner
    unsubscribes.push(subscribeToNotifications(user.uid, (notifs) => {
      setNotifications(notifs.sort((a,b) => b.createdAt - a.createdAt).slice(0, 5));
      setLoading(false);
    }));

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  // Derived state filtering based on owner's portfolio
  const getOwnerAptIds = () => {
    if (!user) return [];
    if (user.uid === 'owner-john-id') return ['apt-1', 'apt-2'];
    if (user.uid === 'owner-jane-id') return ['apt-3'];
    return apartments.map(a => a.id);
  };

  const ownerAptIds = getOwnerAptIds();
  const ownerApts = apartments.filter(a => ownerAptIds.includes(a.id));
  const ownerRooms = rooms.filter(r => ownerAptIds.includes(r.apartmentId));
  const ownerPayments = payments.filter(p => ownerAptIds.includes(p.apartmentId));
  const ownerBills = bills.filter(b => {
    const r = rooms.find(room => room.id === b.roomId);
    return r && ownerAptIds.includes(r.apartmentId);
  });
  const ownerComplaints = complaints.filter(c => ownerAptIds.includes(c.apartmentId));
  const ownerRequests = requests.filter(r => ownerAptIds.includes(r.apartmentId));

  // Date constants
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Metrics
  const totalRooms = ownerRooms.length;
  const occupiedRoomsCount = ownerRooms.filter(r => r.status === 'occupied').length;
  const vacantRoomsCount = ownerRooms.filter(r => r.status === 'vacant').length;
  const maintenanceRoomsCount = ownerRooms.filter(r => r.status === 'maintenance').length;

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Business Overview Metrics
  const monthlyRevenue = ownerPayments
    .filter(p => p.status === 'paid' && p.billingMonth === currentMonthKey && p.type === 'rent')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingRent = ownerPayments
    .filter(p => (p.status === 'pending' || p.status === 'overdue') && p.type === 'rent')
    .reduce((sum, p) => sum + p.amount, 0);

  const openComplaintsCount = ownerComplaints.filter(c => c.status !== 'resolved').length;

  const todayCollections = ownerPayments
    .filter(p => p.status === 'paid' && p.paidAt && p.paidAt >= startOfToday)
    .reduce((sum, p) => sum + p.amount, 0) +
    ownerBills
    .filter(b => b.status === 'paid' && b.paidAt && b.paidAt >= startOfToday)
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const upcomingExpiriesCount = ownerRooms.filter(r => r.status === 'occupied').slice(0, 2).length; // mock upcoming expiry count

  // Today's summary calculations
  const todayRentPaymentsCount = ownerPayments.filter(p => p.status === 'paid' && p.paidAt && p.paidAt >= startOfToday).length;
  const todayComplaintsCount = ownerComplaints.filter(c => c.createdAt >= startOfToday).length;
  const todayVisitsCount = ownerRequests.filter(r => new Date(r.preferredVisitDate).getTime() >= startOfToday && new Date(r.preferredVisitDate).getTime() < startOfToday + 86400000).length;
  const todayNewCustomersCount = customers.filter(c => c.createdAt >= startOfToday).length;

  // Recent Customer Activities timeline
  const recentActivities = (() => {
    const list: { text: string; date: number; icon: React.ReactNode; color: string }[] = [];

    ownerPayments.forEach(p => {
      if (p.status === 'paid' && p.paidAt) {
        list.push({
          text: `${p.customerName} settled rent of ₹${p.amount.toLocaleString('en-IN')} for ${p.billingMonth}`,
          date: p.paidAt,
          icon: <IndianRupee size={12} />,
          color: 'bg-emerald-500 text-white'
        });
      }
    });

    ownerComplaints.forEach(c => {
      list.push({
        text: `New support request registered: "${c.title}" by Room ${c.roomNumber || '—'}`,
        date: c.createdAt,
        icon: <AlertCircle size={12} />,
        color: 'bg-rose-500 text-white'
      });
      if (c.status === 'resolved' && c.resolvedAt) {
        list.push({
          text: `Support request resolved: "${c.title}"`,
          date: c.resolvedAt,
          icon: <CheckCircle size={12} />,
          color: 'bg-emerald-500 text-white'
        });
      }
    });

    ownerRequests.forEach(r => {
      list.push({
        text: `Visit scheduled at ${r.apartmentName} on ${r.preferredVisitDate}`,
        date: r.createdAt,
        icon: <Calendar size={12} />,
        color: 'bg-blue-500 text-white'
      });
    });

    return list.sort((a,b) => b.date - a.date).slice(0, 5);
  })();

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse py-4">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-3xl w-full"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-1 transition-all duration-300">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-[28px] font-black text-foreground tracking-tight leading-tight">
            Business Overview
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium mt-0.5">
            Real-time analytics and portfolio insights for your rental properties.
          </p>
        </div>
        <div className="flex items-center gap-2 py-1.5 px-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl text-[12px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Real-Time Subscriptions Active</span>
        </div>
      </div>

      {/* ── 1. BUSINESS OVERVIEW KPI CARDS ──────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Apartments */}
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/15">
              <Building2 size={16} />
            </div>
            <span className="text-[12px] text-muted-foreground font-bold block mt-3">Total Apartments</span>
            <span className="text-[28px] font-black text-foreground block mt-1">{ownerApts.length}</span>
          </div>
          <p className="text-[12px] text-muted-foreground font-medium mt-2">Active properties managed</p>
        </div>

        {/* Occupied vs Vacant */}
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/15">
              <DoorOpen size={16} />
            </div>
            <span className="text-[12px] text-muted-foreground font-bold block mt-3">Occupancy Status</span>
            <span className="text-[28px] font-black text-foreground block mt-1">
              {occupiedRoomsCount}/{totalRooms}
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px] text-muted-foreground font-medium mt-2">
            <span>{vacantRoomsCount} vacant rooms</span>
            <span className="text-emerald-600 font-bold">{totalRooms > 0 ? Math.round((occupiedRoomsCount/totalRooms)*100) : 0}% occupied</span>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/10 text-indigo-650 flex items-center justify-center border border-indigo-500/15">
              <IndianRupee size={16} />
            </div>
            <span className="text-[12px] text-muted-foreground font-bold block mt-3">Monthly Revenue</span>
            <span className="text-[28px] font-black text-foreground block mt-1">₹{monthlyRevenue.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 text-[12px] font-bold mt-2">
            <ArrowUpRight size={14} />
            <span>+12% vs last month</span>
          </div>
        </div>

        {/* Pending Rent */}
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/15">
              <Clock size={16} />
            </div>
            <span className="text-[12px] text-muted-foreground font-bold block mt-3">Outstanding Rent</span>
            <span className="text-[28px] font-black text-rose-500 dark:text-rose-455 block mt-1">₹{pendingRent.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-[12px] text-muted-foreground font-medium mt-2">Pending or overdue accounts</p>
        </div>
      </section>

      {/* ── 2. TODAY'S SUMMARY & QUICK ACTIONS ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Today's Summary */}
        <section id="todays-summary" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-[20px] font-bold text-foreground tracking-tight">Today's Summary</h3>
            <p className="text-[14px] text-muted-foreground mt-0.5">Real-time daily operations overview.</p>
          </div>
          
          <div className="space-y-3 font-semibold text-[14px]">
            <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/10 border border-border rounded-2xl">
              <span className="text-foreground/80">Rent Payments Received</span>
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl text-[12px] font-bold">
                {todayRentPaymentsCount} Received
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/10 border border-border rounded-2xl">
              <span className="text-foreground/80">Complaints Submitted</span>
              <span className={`px-3 py-1 rounded-xl text-[12px] font-bold border ${
                todayComplaintsCount > 0 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground border-border'
              }`}>
                {todayComplaintsCount} New
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/10 border border-border rounded-2xl">
              <span className="text-foreground/80">Room Visits Scheduled</span>
              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-3 py-1 rounded-xl text-[12px] font-bold">
                {todayVisitsCount} Scheduled
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-900/10 border border-border rounded-2xl">
              <span className="text-foreground/80">Leases Expiring This Week</span>
              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-3 py-1 rounded-xl text-[12px] font-bold">
                {upcomingExpiriesCount} Expiring
              </span>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section id="quick-actions" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-[20px] font-bold text-foreground tracking-tight">Quick Actions</h3>
            <p className="text-[14px] text-muted-foreground mt-0.5">Common administrative triggers.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Link to="/owner/apartments" className="p-4 border border-border bg-slate-50/20 dark:bg-slate-900/10 hover:border-emerald-500/25 hover:bg-emerald-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <Building2 size={20} className="text-emerald-500 group-hover:scale-105 transition-transform" />
              <span className="text-[12px] font-bold text-foreground">Add Apartment</span>
            </Link>
            <Link to="/owner/apartments" className="p-4 border border-border bg-slate-50/20 dark:bg-slate-900/10 hover:border-blue-500/25 hover:bg-blue-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <Plus size={20} className="text-blue-500 group-hover:scale-105 transition-transform" />
              <span className="text-[12px] font-bold text-foreground">Add Room</span>
            </Link>
            <Link to="/owner/customers" className="p-4 border border-border bg-slate-50/20 dark:bg-slate-900/10 hover:border-purple-500/25 hover:bg-purple-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <Users size={20} className="text-purple-500 group-hover:scale-105 transition-transform" />
              <span className="text-[12px] font-bold text-foreground">Assign Customer</span>
            </Link>
            <Link to="/owner/rent" className="p-4 border border-border bg-slate-50/20 dark:bg-slate-900/10 hover:border-indigo-500/25 hover:bg-indigo-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <CreditCard size={20} className="text-indigo-500 group-hover:scale-105 transition-transform" />
              <span className="text-[12px] font-bold text-foreground">Generate Rent Bills</span>
            </Link>
            <Link to="/owner/electricity" className="p-4 border border-border bg-slate-50/20 dark:bg-slate-900/10 hover:border-amber-500/25 hover:bg-amber-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <Zap size={20} className="text-amber-500 group-hover:scale-105 transition-transform" />
              <span className="text-[12px] font-bold text-foreground">Generate Electricity Bills</span>
            </Link>
            <Link to="/owner/reports" className="p-4 border border-border bg-slate-50/20 dark:bg-slate-900/10 hover:border-rose-500/25 hover:bg-rose-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group">
              <BarChart2 size={20} className="text-rose-500 group-hover:scale-105 transition-transform" />
              <span className="text-[12px] font-bold text-foreground">View Reports</span>
            </Link>
          </div>
        </section>
      </div>

      {/* ── 3. REVENUE OVERVIEW & OCCUPANCY OVERVIEW ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Revenue Overview (SVG Graph) */}
        <section id="revenue-overview" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Revenue Overview</h3>
              <p className="text-[14px] text-muted-foreground mt-0.5">Rent vs utility collections trend.</p>
            </div>
            
            {/* Period Selector */}
            <div className="flex items-center bg-muted p-1 border border-border rounded-xl text-[12px] font-bold">
              <button 
                onClick={() => setRevenuePeriod('monthly')}
                className={`px-2.5 py-1 rounded-lg transition-all ${revenuePeriod === 'monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setRevenuePeriod('quarterly')}
                className={`px-2.5 py-1 rounded-lg transition-all ${revenuePeriod === 'quarterly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Quarterly
              </button>
              <button 
                onClick={() => setRevenuePeriod('yearly')}
                className={`px-2.5 py-1 rounded-lg transition-all ${revenuePeriod === 'yearly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Yearly
              </button>
            </div>
          </div>

          {/* SVG Area Chart */}
          <div className="relative h-64 w-full bg-slate-50/50 dark:bg-slate-900/10 border border-border rounded-2xl flex items-end justify-between p-4 pt-10">
            {/* Chart Grid Lines */}
            <div className="absolute inset-x-0 bottom-12 border-b border-border/80"></div>
            <div className="absolute inset-x-0 bottom-28 border-b border-border/80"></div>
            <div className="absolute inset-x-0 bottom-44 border-b border-border/80"></div>
            
            {/* Visual SVG Path */}
            <div className="absolute inset-0 px-8 pt-12 pb-12 flex items-end">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chart-glow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>
                <path 
                  d="M 0 80 Q 100 50 200 40 T 400 20 T 500 10 L 500 100 L 0 100 Z" 
                  fill="url(#chart-glow)"
                />
                <path 
                  d="M 0 80 Q 100 50 200 40 T 400 20 T 500 10" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Labels */}
            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => (
              <div key={idx} className="z-10 flex flex-col items-center">
                <span className="text-[12px] font-bold text-foreground">₹{((idx + 2) * 20000).toLocaleString('en-IN')}</span>
                <span className="text-[12px] text-muted-foreground font-bold mt-2">{month}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Occupancy Overview */}
        <section id="occupancy-overview" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-[20px] font-bold text-foreground tracking-tight">Occupancy</h3>
            <p className="text-[14px] text-muted-foreground mt-0.5">Rooms allocation status details.</p>
          </div>

          <div className="flex flex-col items-center justify-center py-4 space-y-6">
            {/* SVG Donut Chart */}
            <div className="relative w-36 h-36">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background Ring */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3" />
                {/* Foreground Segments (Occupied) */}
                <circle 
                  cx="18" 
                  cy="18" 
                  r="15.915" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3.5" 
                  strokeDasharray={`${totalRooms > 0 ? (occupiedRoomsCount / totalRooms) * 100 : 0} ${100 - (totalRooms > 0 ? (occupiedRoomsCount / totalRooms) * 100 : 0)}`}
                  strokeDashoffset="0" 
                />
              </svg>
              {/* Centered label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[20px] font-black text-foreground">
                  {totalRooms > 0 ? Math.round((occupiedRoomsCount / totalRooms) * 100) : 0}%
                </span>
                <span className="text-[12px] text-muted-foreground font-bold">Occupied</span>
              </div>
            </div>

            {/* Labels detail */}
            <div className="w-full space-y-2 text-[12px] font-bold">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>Occupied Rooms</span>
                <span className="text-foreground">{occupiedRoomsCount} Rooms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Vacant Rooms</span>
                <span className="text-foreground">{vacantRoomsCount} Rooms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>Under Maintenance</span>
                <span className="text-foreground">{maintenanceRoomsCount} Rooms</span>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ── 4. RECENT PAYMENTS ──────────────────────────────────────────────── */}
      <section id="recent-payments" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-[20px] font-bold text-foreground tracking-tight">Recent Rent Payments</h3>
            <p className="text-[14px] text-muted-foreground mt-0.5">Glance at the latest collection transactions.</p>
          </div>
          <Link to="/owner/rent" className="text-[12px] font-bold text-emerald-650 flex items-center gap-1 hover:underline">
            Manage Rent <ChevronRight size={14} />
          </Link>
        </div>

        {ownerPayments.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground text-[14px]">No payments on ledger records.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-[14px] border-collapse bg-slate-50/10 dark:bg-slate-900/5">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                  <th className="p-4">Customer</th>
                  <th className="p-4">Month</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-foreground font-semibold">
                {ownerPayments.slice(0, 5).map((pay, idx) => (
                  <tr key={idx} className="hover:bg-muted/40 transition-colors">
                    <td className="p-4">{pay.customerName || 'Unknown'}</td>
                    <td className="p-4">{pay.billingMonth}</td>
                    <td className="p-4 text-muted-foreground font-medium">{pay.dueDate}</td>
                    <td className="p-4">₹{pay.amount.toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                        pay.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20' 
                          : pay.status === 'pending' 
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20'
                      }`}>
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 5. PENDING TASKS & COMPLAINTS ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Pending Tasks */}
        <section id="pending-tasks" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-[20px] font-bold text-foreground tracking-tight">Pending Tasks</h3>
            <p className="text-[14px] text-muted-foreground mt-0.5">Required actions needing approval.</p>
          </div>

          <div className="space-y-3 font-semibold text-[14px]">
            {ownerRequests.filter(r => r.status === 'pending').slice(0, 3).map(req => (
              <div key={req.id} className="flex items-center justify-between p-4 border border-border rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                <div>
                  <h4 className="text-foreground">{req.customerName || 'New Customer'}</h4>
                  <p className="text-[12px] text-muted-foreground font-medium mt-0.5">Visit scheduled for {req.preferredVisitDate}</p>
                </div>
                <Link 
                  to="/owner/customers"
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-[12px] rounded-xl transition-all"
                >
                  Manage
                </Link>
              </div>
            ))}
            {ownerRequests.filter(r => r.status === 'pending').length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-[14px]">
                No pending onboarding showing requests 🎉
              </div>
            )}
          </div>
        </section>

        {/* Support Complaints */}
        <section id="complaints" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Active Problems</h3>
              <p className="text-[14px] text-muted-foreground mt-0.5">Maintenance logs demanding attention.</p>
            </div>
            <Link to="/owner/complaints" className="text-[12px] font-bold text-emerald-650 flex items-center gap-0.5 hover:underline">
              Kanban Board <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {ownerComplaints.filter(c => c.status !== 'resolved').slice(0, 3).map(comp => (
              <div key={comp.id} className="p-4 border border-border rounded-2xl bg-slate-50/30 dark:bg-slate-900/10 flex items-center justify-between hover:border-brand-500/20 transition-all">
                <div className="min-w-0 flex-1 pr-4">
                  <h4 className="text-[14px] font-semibold text-foreground truncate">{comp.title}</h4>
                  <p className="text-[12px] text-muted-foreground font-bold mt-0.5">
                    Category: {comp.category.toUpperCase()} • Room {comp.roomNumber || '—'}
                  </p>
                </div>
                
                <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase ${
                  comp.status === 'in-progress' 
                    ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' 
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                }`}>
                  {comp.status}
                </span>
              </div>
            ))}
            {ownerComplaints.filter(c => c.status !== 'resolved').length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-[14px]">
                No active complaints registered today 🎉
              </div>
            )}
          </div>
        </section>

      </div>

      {/* ── 6. RECENT CUSTOMER ACTIVITY & RECENT NOTIFICATIONS ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Customer Activity */}
        <section id="recent-customer-activity" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-[20px] font-bold text-foreground tracking-tight flex items-center gap-2">
              <Activity size={18} className="text-emerald-500 animate-pulse" />
              <span>Recent Customer Activity</span>
            </h3>
            <p className="text-[14px] text-muted-foreground mt-0.5">Real-time timeline operations feed.</p>
          </div>

          <div className="relative border-l border-border pl-6 space-y-6 ml-3 mt-4">
            {recentActivities.map((act, index) => (
              <div key={index} className="relative">
                {/* Timeline node */}
                <span className={`absolute -left-[32px] top-1 w-4 h-4 rounded-full flex items-center justify-center border-2 border-background z-10 ${act.color}`}>
                  {act.icon}
                </span>
                <div className="space-y-0.5">
                  <p className="text-[14px] text-foreground font-semibold">{act.text}</p>
                  <span className="text-[12px] text-muted-foreground font-bold">
                    {new Date(act.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-center py-6 text-[14px] text-muted-foreground">No recent portfolio operations logged.</p>
            )}
          </div>
        </section>

        {/* Recent Notifications */}
        <section id="recent-notifications" className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-[20px] font-bold text-foreground tracking-tight flex items-center gap-2">
              <Bell size={18} className="text-emerald-500" />
              <span>Recent Announcements</span>
            </h3>
            <p className="text-[14px] text-muted-foreground mt-0.5">Broadcast and personal inbox messages.</p>
          </div>

          <div className="space-y-3">
            {notifications.map(n => (
              <div key={n.id} className="p-4 border border-border/80 rounded-2xl bg-slate-50/20 dark:bg-slate-900/10 hover:border-emerald-500/20 transition-all text-[14px] flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{n.title}</span>
                  <span className="text-[12px] text-muted-foreground font-bold">
                    {new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
                <p className="text-muted-foreground leading-normal font-medium">{n.message}</p>
              </div>
            ))}
            {notifications.length === 0 && (
              <p className="text-center py-6 text-[14px] text-muted-foreground font-medium">No notices logged.</p>
            )}
          </div>
        </section>

      </div>

    </div>
  );
};
