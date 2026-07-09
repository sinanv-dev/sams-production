import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building, Users, CreditCard, AlertCircle, DoorOpen,
  ArrowUpRight, Clock, Plus, Settings as SettingsIcon, CheckSquare,
  TrendingUp, Zap, CheckCircle, XCircle, Wrench, Bell, UserPlus,
  BarChart2, Send, FileText, Command, Shield, RefreshCw,
  ArrowRight, Home
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  getApartments, getRooms, getRequests, getPayments,
  getComplaints, getUsers, getElectricityBills, getVerificationDocuments
} from '../../firebase/db';
import {
  Apartment, Room, ApartmentRequest, Payment, Complaint, UserProfile, ElectricityBill, VerificationDocument
} from '../../types';
import { SkeletonStat } from '../../components/common/Skeleton';

// ──────────────────── KPI card ────────────────────
interface KPICardProps {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  trend?: { value: number; positive?: boolean };
  link?: string;
  pulse?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, sub, icon, iconBg, trend, link, pulse }) => {
  const content = (
    <div className={`relative bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden ${link ? 'cursor-pointer' : ''}`}>
      {/* Background glow */}
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 blur-xl ${iconBg}`} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} flex-shrink-0`}>
          {icon}
          {pulse && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground tracking-tight mb-0.5">{value}</div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${trend.positive !== false && trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          <TrendingUp size={11} />
          {trend.value > 0 ? '+' : ''}{trend.value}% this month
        </div>
      )}
      {link && <ArrowUpRight size={14} className="absolute bottom-4 right-4 text-muted-foreground/30 group-hover:text-brand-500 group-hover:opacity-100 transition-all" />}
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
};

// ──────────────────── Quick action ────────────────────
const QuickAction: React.FC<{ to: string; icon: React.ReactNode; label: string; color: string }> = ({ to, icon, label, color }) => (
  <Link to={to} className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${color}`}>
    {icon}
    <span>{label}</span>
    <ArrowRight size={14} className="ml-auto opacity-60" />
  </Link>
);

// ──────────────────── Status badge ────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
    open: 'bg-red-500/10 text-red-600 border-red-500/20',
    'in-progress': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    resolved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    paid: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    overdue: 'bg-red-500/10 text-red-600 border-red-500/20',
    low: 'bg-blue-500/10 text-blue-600',
    medium: 'bg-amber-500/10 text-amber-600',
    high: 'bg-orange-500/10 text-orange-600',
    emergency: 'bg-red-500/10 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {status.replace('-', ' ')}
    </span>
  );
};

const CHART_COLORS = {
  brand: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalApartments: 0, totalOwners: 0, totalCustomers: 0, totalRooms: 0,
    occupiedRooms: 0, vacantRooms: 0, maintenanceRooms: 0,
    totalRevenue: 0, pendingRent: 0, electricityRevenue: 0, pendingElecBills: 0,
    openComplaints: 0, pendingVisits: 0, approvedVisits: 0,
    newRegistrations: 0, occupancyRate: 0, docsAwaitingReview: 0,
    collectionRate: 0,
  });
  const [recentRequests, setRecentRequests] = useState<ApartmentRequest[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ month: string; rent: number; electricity: number }[]>([]);
  const [complaintsByCategory, setComplaintsByCategory] = useState<{ name: string; value: number; color: string }[]>([]);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [apts, rms, reqs, pyms, comps, usrs, bills, docs] = await Promise.all([
        getApartments(), getRooms(), getRequests(), getPayments(),
        getComplaints(), getUsers(), getElectricityBills(), getVerificationDocuments()
      ]) as [Apartment[], Room[], ApartmentRequest[], Payment[], Complaint[], UserProfile[], ElectricityBill[], VerificationDocument[]];

      const occupiedRooms = rms.filter(r => r.status === 'occupied').length;
      const vacantRooms = rms.filter(r => r.status === 'vacant').length;
      const maintenanceRooms = rms.filter(r => r.status === 'maintenance').length;
      const paidRent = pyms.filter(p => p.status === 'paid' && p.type === 'rent');
      const totalRevenue = paidRent.reduce((s, p) => s + p.amount, 0);
      const pendingRent = pyms.filter(p => p.status === 'pending' && p.type === 'rent').reduce((s, p) => s + p.amount, 0);
      const electricityRevenue = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0);
      const pendingElecBills = bills.filter(b => b.status === 'unpaid').length;
      const thirtyDaysAgo = Date.now() - 30 * 86400000;
      const newRegistrations = usrs.filter(u => u.createdAt > thirtyDaysAgo && u.role !== 'admin').length;
      const docsAwaitingReview = docs.filter(d => d.status === 'pending').length;
      const totalBilled = pyms.filter(p => p.type === 'rent').reduce((s, p) => s + p.amount, 0);
      const collectionRate = totalBilled > 0 ? Math.round((totalRevenue / totalBilled) * 100) : 0;

      setStats({
        totalApartments: apts.length,
        totalOwners: usrs.filter(u => u.role === 'owner').length,
        totalCustomers: usrs.filter(u => u.role === 'customer').length,
        totalRooms: rms.length,
        occupiedRooms, vacantRooms, maintenanceRooms,
        totalRevenue, pendingRent, electricityRevenue, pendingElecBills,
        openComplaints: comps.filter(c => c.status !== 'resolved').length,
        pendingVisits: reqs.filter(r => r.status === 'pending').length,
        approvedVisits: reqs.filter(r => r.status === 'approved').length,
        newRegistrations,
        occupancyRate: rms.length > 0 ? Math.round((occupiedRooms / rms.length) * 100) : 0,
        docsAwaitingReview,
        collectionRate,
      });
      setAllUsers(usrs);
      setRecentRequests(reqs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5));
      setRecentComplaints(comps.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5));
      setRecentPayments(pyms.filter(p => p.status === 'paid').sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0)).slice(0, 6));

      // Build monthly revenue chart (last 6 months)
      const now = new Date();
      const monthly = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const rent = pyms.filter(p => p.billingMonth === key && p.status === 'paid' && p.type === 'rent').reduce((s, p) => s + p.amount, 0);
        const elec = bills.filter(b => b.billingMonth === key && b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0);
        return { month: MONTHS[d.getMonth()], rent, electricity: elec };
      });
      setMonthlyRevenue(monthly);

      // Complaint categories
      const catMap: Record<string, number> = {};
      comps.forEach(c => { catMap[c.category] = (catMap[c.category] || 0) + 1; });
      const catColors: Record<string, string> = {
        plumbing: CHART_COLORS.blue,
        electricity: CHART_COLORS.amber,
        noise: CHART_COLORS.violet,
        maintenance: CHART_COLORS.brand,
        other: CHART_COLORS.red,
      };
      setComplaintsByCategory(Object.entries(catMap).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: catColors[name] ?? '#94a3b8',
      })));

    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 w-56 bg-muted rounded-xl animate-pulse" />
            <div className="h-4 w-80 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonStat key={i} />)}
        </div>
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center">
              <Home size={15} className="text-brand-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-9">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border hover:bg-muted/80 text-sm text-foreground transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <Link
            to="/admin/reports"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5"
          >
            <BarChart2 size={14} /> View Reports
          </Link>
        </div>
      </div>

      {/* ── Alert bar (if pending approvals) ── */}
      {(stats.pendingVisits > 0 || stats.docsAwaitingReview > 0) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-in slide-in-from-top-2 duration-300">
          <Bell size={16} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-600">Action Required:</span>
            <span className="text-muted-foreground ml-1.5">
              {stats.pendingVisits > 0 && `${stats.pendingVisits} visit request${stats.pendingVisits > 1 ? 's' : ''} pending`}
              {stats.pendingVisits > 0 && stats.docsAwaitingReview > 0 && ' · '}
              {stats.docsAwaitingReview > 0 && `${stats.docsAwaitingReview} document${stats.docsAwaitingReview > 1 ? 's' : ''} awaiting review`}
            </span>
          </div>
          <Link to="/admin/requests" className="text-xs font-semibold text-amber-600 hover:underline">Review →</Link>
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={`₹${(stats.totalRevenue + stats.electricityRevenue).toLocaleString()}`}
          sub="Rent + electricity collected"
          icon={<CreditCard size={18} className="text-emerald-600" />}
          iconBg="bg-emerald-500/15"
          trend={{ value: 8 }}
          link="/admin/rent"
          pulse
        />
        <KPICard
          title="Pending Collections"
          value={`₹${stats.pendingRent.toLocaleString()}`}
          sub={`${stats.pendingElecBills} unpaid electricity bills`}
          icon={<Clock size={18} className="text-amber-600" />}
          iconBg="bg-amber-500/15"
          trend={{ value: -12, positive: false }}
          link="/admin/rent"
        />
        <KPICard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          sub={`${stats.occupiedRooms} of ${stats.totalRooms} rooms`}
          icon={<Home size={18} className="text-brand-600" />}
          iconBg="bg-brand-500/15"
          trend={{ value: 3 }}
          link="/admin/rooms"
        />
        <KPICard
          title="Collection Rate"
          value={`${stats.collectionRate}%`}
          sub="Rent payment success rate"
          icon={<TrendingUp size={18} className="text-violet-600" />}
          iconBg="bg-violet-500/15"
          trend={{ value: 5 }}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Properties"
          value={stats.totalApartments}
          sub={`${stats.totalOwners} owners`}
          icon={<Building size={18} className="text-blue-600" />}
          iconBg="bg-blue-500/15"
          link="/admin/apartments"
        />
        <KPICard
          title="Customers"
          value={stats.totalCustomers}
          sub={`+${stats.newRegistrations} this month`}
          icon={<Users size={18} className="text-purple-600" />}
          iconBg="bg-purple-500/15"
          trend={{ value: stats.newRegistrations > 0 ? 15 : 0 }}
          link="/admin/customers"
        />
        <KPICard
          title="Open Complaints"
          value={stats.openComplaints}
          sub="Needs attention"
          icon={<AlertCircle size={18} className="text-red-600" />}
          iconBg="bg-red-500/15"
          link="/admin/complaints"
        />
        <KPICard
          title="Visit Requests"
          value={stats.pendingVisits}
          sub={`${stats.approvedVisits} approved`}
          icon={<CheckSquare size={18} className="text-cyan-600" />}
          iconBg="bg-cyan-500/15"
          link="/admin/requests"
        />
      </div>

      {/* ── Quick Actions + Occupancy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
            <Command size={14} className="text-brand-500" /> Quick Actions
          </h2>
          <div className="space-y-2">
            <QuickAction to="/admin/owners/new" icon={<UserPlus size={15} />} label="Register New Owner" color="bg-brand-600/10 hover:bg-brand-600 text-brand-600 hover:text-white border border-brand-500/20" />
            <QuickAction to="/admin/apartments/new" icon={<Building size={15} />} label="Add Apartment" color="bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-500/20" />
            <QuickAction to="/admin/rooms/new" icon={<DoorOpen size={15} />} label="Create Room" color="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-500/20" />
            <QuickAction to="/admin/admins/new" icon={<Shield size={15} />} label="Add Admin Account" color="bg-violet-600/10 hover:bg-violet-600 text-violet-600 hover:text-white border border-violet-500/20" />
            <QuickAction to="/admin/notifications" icon={<Send size={15} />} label="Send Notification" color="bg-amber-600/10 hover:bg-amber-600 text-amber-600 hover:text-white border border-amber-500/20" />
          </div>
        </div>

        {/* Occupancy visual */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <DoorOpen size={14} className="text-brand-500" /> Room Occupancy
            </h2>
            <Link to="/admin/rooms" className="text-xs text-brand-500 hover:text-brand-600 font-semibold">Manage Rooms →</Link>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Occupied ({stats.occupiedRooms})</span>
                <span>{stats.occupancyRate}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${stats.occupancyRate}%` }} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: 'Occupied', value: stats.occupiedRooms, color: 'bg-emerald-500/10 text-emerald-600', dot: 'bg-emerald-500' },
              { label: 'Vacant', value: stats.vacantRooms, color: 'bg-blue-500/10 text-blue-600', dot: 'bg-blue-500' },
              { label: 'Maintenance', value: stats.maintenanceRooms, color: 'bg-amber-500/10 text-amber-600', dot: 'bg-amber-500' },
            ].map(item => (
              <div key={item.label} className={`rounded-xl p-3 ${item.color}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`w-2 h-2 rounded-full ${item.dot}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
                <p className="text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Revenue Chart + Complaints Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <BarChart2 size={14} className="text-brand-500" /> Monthly Revenue (Last 6 Months)
            </h2>
            <Link to="/admin/reports" className="text-xs text-brand-500 hover:text-brand-600 font-semibold">Full Report →</Link>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="rentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.brand} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.brand} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="elecGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.emerald} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 12 }}
                  formatter={(v) => [`₹${Number(v ?? 0).toLocaleString()}`, '']}
                />
                <Area type="monotone" dataKey="rent" stroke={CHART_COLORS.brand} fill="url(#rentGrad)" strokeWidth={2} name="Rent" />
                <Area type="monotone" dataKey="electricity" stroke={CHART_COLORS.emerald} fill="url(#elecGrad)" strokeWidth={2} name="Electricity" />
                <Legend formatter={(v: string) => <span className="text-xs text-muted-foreground capitalize">{v}</span>} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
            <AlertCircle size={14} className="text-red-500" /> Complaints by Category
          </h2>
          {complaintsByCategory.length > 0 ? (
            <>
              <div style={{ height: 160 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={complaintsByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {complaintsByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: 11 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {complaintsByCategory.slice(0, 4).map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="text-xs text-muted-foreground">{c.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground">{c.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <AlertCircle size={28} className="opacity-20 mb-2" />
              <p className="text-xs">No complaints yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Activity Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Requests */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <CheckSquare size={14} className="text-cyan-500" /> Visit Requests
            </h3>
            <Link to="/admin/requests" className="text-xs text-brand-500 hover:text-brand-600 font-semibold">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentRequests.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">No requests yet</div>
            ) : recentRequests.map(r => (
              <Link key={r.id} to={`/admin/requests/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors group">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-brand-600 transition-colors">{r.customerName || 'Customer'}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.apartmentName}</p>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500" /> Complaints
            </h3>
            <Link to="/admin/complaints" className="text-xs text-brand-500 hover:text-brand-600 font-semibold">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentComplaints.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">No complaints</div>
            ) : recentComplaints.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.customerName}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-3">
                  <StatusBadge status={c.status} />
                  <StatusBadge status={c.priority} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <CreditCard size={14} className="text-emerald-500" /> Recent Payments
            </h3>
            <Link to="/admin/rent" className="text-xs text-brand-500 hover:text-brand-600 font-semibold">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {recentPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-muted-foreground">No payments recorded</div>
            ) : recentPayments.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.customerName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{p.type} · {p.billingMonth}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-bold text-emerald-600">₹{p.amount.toLocaleString()}</p>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Registrations Table ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Users size={16} className="text-brand-500" /> Recent Registrations
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">+{stats.newRegistrations} this month</span>
            <Link to="/admin/customers" className="text-xs text-brand-500 hover:text-brand-600 font-semibold">View all →</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20 border-b border-border">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.filter(u => u.role !== 'admin').sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map(u => (
                <tr key={u.uid} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${u.role === 'owner' ? 'bg-blue-500/15 text-blue-600' : 'bg-purple-500/15 text-purple-600'}`}>
                        {u.displayName.charAt(0).toUpperCase()}
                      </div>
                      <Link
                        to={u.role === 'owner' ? `/admin/owners/${u.uid}` : `/admin/customers/${u.uid}`}
                        className="font-medium text-foreground hover:text-brand-600 transition-colors"
                      >
                        {u.displayName}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${u.role === 'owner' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground hidden sm:table-cell">{u.email}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
