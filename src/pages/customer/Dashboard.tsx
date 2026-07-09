import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToRooms, subscribeToApartments, subscribeToUsers,
  subscribeToRequests, subscribeToPayments, subscribeToElectricityBills,
  subscribeToComplaints, subscribeToNotifications
} from '../../firebase/db';
import { Room, Apartment, Payment, Notification, ElectricityBill, Complaint, ApartmentRequest, UserProfile } from '../../types';
import {
  Building2, CreditCard, Zap, Wrench, Bell, ArrowRight,
  CheckCircle, AlertTriangle, Clock, FileText, Download,
  CalendarCheck, FolderOpen, ChevronRight
} from 'lucide-react';
import { exportAgreementPDF } from '../../utils/exportUtils';

// ── HELPERS ─────────────────────────────────────────────────────────────────
function getGreeting(name: string): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return `Good Morning, ${name} ☀️`;
  if (h >= 12 && h < 17) return `Good Afternoon, ${name} 👋`;
  if (h >= 17 && h < 21) return `Good Evening, ${name} 🌆`;
  return `Good Night, ${name} 🌙`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const activityIcon: Record<string, React.ReactNode> = {
  payment: <CreditCard size={14} className="text-emerald-500" />,
  bill: <Zap size={14} className="text-amber-500" />,
  complaint: <Wrench size={14} className="text-rose-500" />,
  request: <CalendarCheck size={14} className="text-blue-500" />,
  room: <Building2 size={14} className="text-brand-500" />,
};

// ── SKELETON ─────────────────────────────────────────────────────────────────
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
);

// ── STAT CARD ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: 'emerald' | 'amber' | 'rose' | 'blue';
  to: string;
}
const colorMap = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, icon, color, to }) => (
  <Link to={to} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-border/80 hover:-translate-y-0.5 transition-all duration-200 group block">
    <div className="flex items-start justify-between">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${colorMap[color]}`}>
        {icon}
      </div>
      <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <div className="mt-3">
      <p className="text-2xl font-black text-foreground tracking-tight">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  </Link>
);

// ── QUICK ACTION BUTTON ────────────────────────────────────────────────────────
interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  color?: string;
}
const QuickAction: React.FC<QuickActionProps> = ({ icon, label, to, onClick, color = 'bg-muted hover:bg-muted/80' }) => {
  const cls = `flex flex-col items-center gap-2 p-4 rounded-2xl ${color} border border-border hover:border-brand-500/30 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 cursor-pointer text-center`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        <div className="text-foreground">{icon}</div>
        <span className="text-xs font-bold text-foreground leading-tight">{label}</span>
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={`w-full ${cls}`}>
      <div className="text-foreground">{icon}</div>
      <span className="text-xs font-bold text-foreground leading-tight">{label}</span>
    </button>
  );
};

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export const CustomerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [assignedRoom, setAssignedRoom] = useState<Room | null>(null);
  const [allApartments, setAllApartments] = useState<Apartment[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<ApartmentRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsubs: (() => void)[] = [];
    let loaded = 0;
    const checkDone = () => { if (++loaded >= 8) setLoading(false); };

    unsubs.push(subscribeToRooms(rooms => {
      setAssignedRoom(rooms.find(r => r.currentCustomerId === user.uid) || null);
      checkDone();
    }));
    unsubs.push(subscribeToApartments(apts => { setAllApartments(apts); checkDone(); }));
    unsubs.push(subscribeToUsers(users => { setAllUsers(users); checkDone(); }));
    unsubs.push(subscribeToRequests(reqs => {
      setRequests(reqs.filter(r => r.customerId === user.uid).sort((a, b) => b.preferredVisitDate.localeCompare(a.preferredVisitDate)));
      checkDone();
    }));
    unsubs.push(subscribeToPayments(pms => {
      setPayments(pms.filter(p => p.customerId === user.uid).sort((a, b) => b.dueDate.localeCompare(a.dueDate)));
      checkDone();
    }));
    unsubs.push(subscribeToElectricityBills(ebs => {
      setBills(ebs.filter(b => b.customerId === user.uid).sort((a, b) => b.billingMonth.localeCompare(a.billingMonth)));
      checkDone();
    }));
    unsubs.push(subscribeToComplaints(cps => {
      setComplaints(cps.filter(c => c.customerId === user.uid).sort((a, b) => b.createdAt - a.createdAt));
      checkDone();
    }));
    unsubs.push(subscribeToNotifications(user.uid, notifs => {
      setNotifications(notifs.sort((a, b) => b.createdAt - a.createdAt));
      checkDone();
    }));

    return () => unsubs.forEach(fn => fn());
  }, [user]);

  // Derived
  const assignedApt = assignedRoom ? allApartments.find(a => a.id === assignedRoom.apartmentId) : null;
  const hasAssignment = !!(assignedRoom && assignedApt);

  const latestPayment = payments[0];
  const latestBill = bills[0];
  const openComplaints = complaints.filter(c => c.status !== 'resolved').length;
  const pendingRequests = requests.filter(r => r.status === 'pending').length;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const isDueOrOverdue = latestPayment?.status === 'pending';
  const isLatestBillPending = latestBill?.status === 'unpaid';

  // Recent activity feed (max 5)
  const recentActivities = (() => {
    const list: { text: string; date: number; type: string }[] = [];
    payments.forEach(p => {
      if (p.status === 'paid' && p.paidAt) {
        list.push({ text: `Rent paid — ₹${p.amount.toLocaleString('en-IN')} (${p.billingMonth})`, date: p.paidAt, type: 'payment' });
      } else {
        list.push({ text: `Rent invoice ₹${p.amount.toLocaleString('en-IN')} generated (${p.billingMonth})`, date: new Date(p.dueDate).getTime() - 86400000 * 10, type: 'payment' });
      }
    });
    bills.forEach(b => {
      if (b.status === 'paid' && b.paidAt) {
        list.push({ text: `Electricity paid — ₹${b.totalAmount.toLocaleString('en-IN')} (${b.billingMonth})`, date: b.paidAt, type: 'bill' });
      } else {
        list.push({ text: `Electricity bill ₹${b.totalAmount.toLocaleString('en-IN')} generated (${b.billingMonth})`, date: Date.now() - 86400000, type: 'bill' });
      }
    });
    complaints.forEach(c => {
      list.push({ text: `Maintenance reported: "${c.title}"`, date: c.createdAt, type: 'complaint' });
      if (c.status === 'resolved') {
        list.push({ text: `"${c.title}" resolved`, date: c.createdAt + 86400000, type: 'complaint' });
      }
    });
    requests.forEach(r => {
      list.push({ text: `Visit request submitted for ${r.apartmentName}`, date: r.createdAt, type: 'request' });
    });
    if (assignedRoom && assignedApt) {
      list.push({ text: `Allocated to Room ${assignedRoom.roomNumber} at ${assignedApt.name}`, date: Date.now() - 86400000 * 2, type: 'room' });
    }
    return list.sort((a, b) => b.date - a.date).slice(0, 5);
  })();

  // ── LOADING SKELETON ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-pulse">
        <Skeleton className="h-36 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── NO ROOM (NEW CUSTOMER) ────────────────────────────────────────────────
  if (!hasAssignment) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Welcome */}
        <div className="bg-card border border-border rounded-3xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-brand-500/30 flex-shrink-0">
              {user?.displayName?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {getGreeting(user?.displayName?.split(' ')[0] || 'there')}
              </h1>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                Your account is active. No room assigned yet.
              </p>
              <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Awaiting Room Assignment
              </span>
            </div>
          </div>
        </div>

        {/* Onboarding steps */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-5">
          <h2 className="text-base font-bold text-foreground">Get started in 3 steps</h2>
          {[
            { num: 1, title: 'Browse Available Rooms', desc: 'Explore individual rooms in SAMS complexes.', route: '/customer/browse', btn: 'Browse Now' },
            { num: 2, title: 'Schedule a Visit', desc: 'Request a showing at your preferred time.', route: '/customer/requests', btn: 'My Requests' },
            { num: 3, title: 'Await Approval', desc: 'The owner will confirm and assign your room.', route: null, btn: null },
          ].map(step => (
            <div key={step.num} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-black flex-shrink-0">
                {step.num}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p>
              </div>
              {step.route && (
                <Link to={step.route} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
                  {step.btn} <ArrowRight size={12} />
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Notifications preview */}
        {notifications.length > 0 && (
          <div className="bg-card border border-border rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2"><Bell size={14} /> Notifications</h2>
              <Link to="/customer/notifications" className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline">See All</Link>
            </div>
            {notifications.slice(0, 3).map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl border ${n.read ? 'border-border bg-transparent' : 'border-brand-500/20 bg-brand-500/5'}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-muted-foreground/30' : 'bg-brand-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Days overdue helper
  const dLeft = latestPayment ? Math.ceil((new Date(latestPayment.dueDate).getTime() - Date.now()) / 86400000) : 0;
  const isOverdue = dLeft < 0;
  const daysOverdue = isOverdue ? Math.abs(dLeft) : 0;

  // ── FULL TENANT DASHBOARD ─────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* ── RED ALERT BANNER FOR UNPAID RENT ──────────────────────────────── */}
      {isDueOrOverdue && latestPayment && (
        <div className="bg-red-500/10 border-2 border-red-500/20 text-red-800 dark:text-red-400 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
                <span>🔴 Rent Payment {isOverdue ? 'Overdue' : 'Pending'}</span>
              </h4>
              <p className="text-xs font-semibold opacity-90 mt-0.5">
                {isOverdue 
                  ? `Your rent is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue. A late fee of ₹${latestPayment.lateFeeApplied || 500} has been applied.` 
                  : `Friendly reminder that your rent is due on ${new Date(latestPayment.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}.`
                }
              </p>
            </div>
          </div>
          <Link to="/customer/rent" className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all whitespace-nowrap">
            Pay Now
          </Link>
        </div>
      )}

      {/* ── 1. WELCOME CARD ───────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-brand-500/30 flex-shrink-0">
            {user?.displayName?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
                Active Tenant
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {getGreeting(user?.displayName?.split(' ')[0] || 'there')}
            </h1>
            <p className="text-sm text-muted-foreground font-medium mt-0.5">
              Room {assignedRoom.roomNumber} · {assignedApt.name}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2 sm:flex-shrink-0">
          {isDueOrOverdue && latestPayment && (
            <span className="text-xs font-bold px-2.5 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 rounded-full">
              Rent Due · ₹{latestPayment.amount.toLocaleString('en-IN')}
            </span>
          )}
          <Link
            to="/customer/rent"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-brand-500/20 hover:-translate-y-0.5 transition-all duration-200"
          >
            <CreditCard size={14} /> Pay Rent
          </Link>
        </div>
      </div>

      {/* ── PERSISTENT OUTSTANDING RENT CARD ─────────────────────────────── */}
      {isDueOrOverdue && latestPayment && (
        <div className="bg-card border-2 border-red-500/20 rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-500/5 rounded-full pointer-events-none group-hover:scale-110 transition-transform duration-300" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="px-2.5 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-wider rounded-full">
                Outstanding Statement Dues
              </span>
              <h3 className="text-lg font-black text-foreground">Pending Rent Payment</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Outstanding Rent</span>
                  <span className="text-base font-black text-foreground mt-0.5">₹{latestPayment.amount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Late Fee</span>
                  <span className="text-base font-black text-rose-500 mt-0.5">₹{latestPayment.lateFeeApplied || 500}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Total Amount Due</span>
                  <span className="text-base font-black text-foreground mt-0.5">
                    ₹{(latestPayment.amount + (latestPayment.lateFeeApplied || 500)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Due Date</span>
                  <span className="text-base font-black text-foreground mt-0.5">
                    {new Date(latestPayment.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 md:self-end">
              <Link
                to="/customer/rent"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-lg shadow-red-500/10 hover:-translate-y-0.5 transition-all text-center whitespace-nowrap"
              >
                Pay Outstanding Rent
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. QUICK STATS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Rent Status"
          value={latestPayment ? (latestPayment.status === 'paid' ? 'Paid' : 'Due') : 'N/A'}
          sub={latestPayment ? latestPayment.billingMonth : undefined}
          icon={<CreditCard size={16} />}
          color={latestPayment?.status === 'paid' ? 'emerald' : 'rose'}
          to="/customer/rent"
        />
        <StatCard
          label="Electricity"
          value={latestBill ? (latestBill.status === 'paid' ? 'Paid' : 'Due') : 'N/A'}
          sub={latestBill ? `₹${latestBill.totalAmount.toLocaleString('en-IN')}` : undefined}
          icon={<Zap size={16} />}
          color={latestBill?.status === 'paid' ? 'emerald' : 'amber'}
          to="/customer/electricity"
        />
        <StatCard
          label="Open Complaints"
          value={String(openComplaints)}
          sub={openComplaints === 0 ? 'All clear' : 'Needs attention'}
          icon={<Wrench size={16} />}
          color={openComplaints === 0 ? 'emerald' : 'rose'}
          to="/customer/complaints"
        />
        <StatCard
          label="Visit Requests"
          value={String(pendingRequests)}
          sub={pendingRequests === 0 ? 'None pending' : 'Awaiting response'}
          icon={<CalendarCheck size={16} />}
          color={pendingRequests === 0 ? 'blue' : 'amber'}
          to="/customer/requests"
        />
      </div>

      {/* ── 3. QUICK ACTIONS ───────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-bold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <QuickAction icon={<CreditCard size={20} />} label="Pay Rent" to="/customer/rent" />
          <QuickAction icon={<Zap size={20} />} label="Pay Electricity" to="/customer/electricity" />
          <QuickAction icon={<Wrench size={20} />} label="Report Problem" to="/customer/complaints" />
          <QuickAction icon={<CalendarCheck size={20} />} label="Request Service" to="/customer/requests" />
          <QuickAction icon={<Download size={20} />} label="Download Agreement" onClick={() => exportAgreementPDF(user, assignedRoom, assignedApt, assignedApt?.ownerName || 'Owner')} />
        </div>
      </div>

      {/* ── 4 & 5. ACTIVITY + NOTIFICATIONS ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">Recent Activity</h2>
            <Link to="/customer/notifications" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              View All <ArrowRight size={11} />
            </Link>
          </div>
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No recent activity</div>
          ) : (
            <div className="space-y-1">
              {recentActivities.map((act, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {activityIcon[act.type]}
                  </div>
                  <p className="text-xs text-foreground font-medium flex-1 leading-tight">{act.text}</p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(act.date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Preview */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bell size={14} />
              Notifications
              {unreadNotifs > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full">
                  {unreadNotifs} new
                </span>
              )}
            </h2>
            <Link to="/customer/notifications" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
              See All <ArrowRight size={11} />
            </Link>
          </div>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No notifications</div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 3).map(n => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${n.read ? 'border-border' : 'border-brand-500/20 bg-brand-500/5'}`}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-muted-foreground/30' : 'bg-brand-500 animate-pulse'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
