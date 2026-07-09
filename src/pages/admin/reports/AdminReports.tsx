import React, { useState, useEffect } from 'react';
import { 
  BarChart2, TrendingUp, Building, Users, DoorOpen, CreditCard,
  AlertCircle, Download, Calendar, CheckCircle, XCircle, Zap
} from 'lucide-react';
import { 
  getApartments, getRooms, getUsers, getPayments, 
  getElectricityBills, getComplaints, getRequests 
} from '../../../firebase/db';
import { Apartment, Room, UserProfile, Payment, ElectricityBill, Complaint, ApartmentRequest } from '../../../types';

interface MonthlyData {
  month: string;
  rent: number;
  electricity: number;
  complaints: number;
  registrations: number;
}

// Pure SVG bar chart component
const BarChart: React.FC<{ data: { label: string; value: number }[]; color: string; maxValue?: number }> = ({ data, color, maxValue }) => {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-32 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex items-end" style={{ height: '100px' }}>
            <div
              className={`w-full rounded-t-md transition-all duration-500 ${color}`}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

export const AdminReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [requests, setRequests] = useState<ApartmentRequest[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'occupancy' | 'complaints'>('overview');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apts, rms, usrs, pmts, blls, cmps, reqs] = await Promise.all([
        getApartments(), getRooms(), getUsers(), getPayments(),
        getElectricityBills(), getComplaints(), getRequests()
      ]);
      setApartments(apts);
      setRooms(rms);
      setUsers(usrs);
      setPayments(pmts);
      setBills(blls);
      setComplaints(cmps);
      setRequests(reqs);

      // Build monthly data for the last 6 months
      const months: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleString('default', { month: 'short' });
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();

        months.push({
          month: monthLabel,
          rent: pmts.filter(p => p.billingMonth === monthStr && p.status === 'paid' && p.type === 'rent').reduce((s, p) => s + p.amount, 0),
          electricity: blls.filter(b => b.billingMonth === monthStr && b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0),
          complaints: cmps.filter(c => c.createdAt >= monthStart && c.createdAt <= monthEnd).length,
          registrations: usrs.filter(u => u.createdAt >= monthStart && u.createdAt <= monthEnd).length,
        });
      }
      setMonthlyData(months);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const totalRentRevenue = payments.filter(p => p.status === 'paid' && p.type === 'rent').reduce((s, p) => s + p.amount, 0);
  const totalElecRevenue = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.totalAmount, 0);
  const pendingRent = payments.filter(p => p.status === 'pending' && p.type === 'rent').reduce((s, p) => s + p.amount, 0);
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;

  const handleExportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div className="h-96 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs = ['overview', 'revenue', 'occupancy', 'complaints'] as const;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 size={24} className="text-brand-500" /> Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide performance metrics and data export</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExportCSV(payments.map(p => ({ id: p.id, customer: p.customerName, room: p.roomNumber, apartment: p.apartmentName, amount: p.amount, type: p.type, status: p.status, month: p.billingMonth })), 'payments-report')}
            className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-xl text-sm text-foreground transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rent Revenue', value: `₹${totalRentRevenue.toLocaleString()}`, icon: <CreditCard size={18}/>, color: 'text-emerald-400', sub: 'Collected' },
          { label: 'Electricity Revenue', value: `₹${totalElecRevenue.toLocaleString()}`, icon: <Zap size={18}/>, color: 'text-yellow-400', sub: 'Collected' },
          { label: 'Pending Rent', value: `₹${pendingRent.toLocaleString()}`, icon: <TrendingUp size={18}/>, color: 'text-amber-400', sub: 'Outstanding' },
          { label: 'Occupancy Rate', value: `${occupancyRate}%`, icon: <DoorOpen size={18}/>, color: 'text-brand-400', sub: `${occupiedRooms}/${rooms.length} rooms` },
        ].map(card => (
          <div key={card.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`${card.color} mb-1`}>{card.icon}</div>
            <div className="text-xl font-bold text-foreground">{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
            <div className="text-xs text-muted-foreground opacity-60">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === t ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Monthly Rent Revenue</h3>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </div>
            <BarChart
              data={monthlyData.map(m => ({ label: m.month, value: m.rent }))}
              color="bg-brand-500"
            />
          </div>

          {/* Electricity Chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Monthly Electricity Revenue</h3>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </div>
            <BarChart
              data={monthlyData.map(m => ({ label: m.month, value: m.electricity }))}
              color="bg-yellow-500"
            />
          </div>

          {/* Complaints Chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Monthly Complaints</h3>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </div>
            <BarChart
              data={monthlyData.map(m => ({ label: m.month, value: m.complaints }))}
              color="bg-red-500"
            />
          </div>

          {/* Registrations Chart */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">Monthly Registrations</h3>
              <span className="text-xs text-muted-foreground">Last 6 months</span>
            </div>
            <BarChart
              data={monthlyData.map(m => ({ label: m.month, value: m.registrations }))}
              color="bg-emerald-500"
            />
          </div>
        </div>
      )}

      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Revenue Breakdown</h2>
              <button onClick={() => handleExportCSV(payments, 'revenue')} className="text-xs text-brand-400 hover:underline flex gap-1 items-center"><Download size={12}/>Export</button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase">Month</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase">Rent Collected</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase">Electricity</th>
                  <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {monthlyData.map((m, i) => (
                  <tr key={i} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{m.month}</td>
                    <td className="px-4 py-3 text-right text-emerald-400 font-medium">₹{m.rent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-yellow-400 font-medium">₹{m.electricity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-foreground font-bold">₹{(m.rent + m.electricity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'occupancy' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {apartments.map(apt => {
              const aptRooms = rooms.filter(r => r.apartmentId === apt.id);
              const occ = aptRooms.filter(r => r.status === 'occupied').length;
              const pct = aptRooms.length > 0 ? Math.round((occ / aptRooms.length) * 100) : 0;
              return (
                <div key={apt.id} className="bg-card border border-border rounded-2xl p-5">
                  <h3 className="font-bold text-foreground text-sm mb-1">{apt.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{apt.address}</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{occ}/{aptRooms.length} rooms</span>
                    <span className="font-bold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    {[
                      { label: 'Occupied', value: occ, color: 'text-emerald-400' },
                      { label: 'Vacant', value: aptRooms.filter(r => r.status === 'vacant').length, color: 'text-blue-400' },
                      { label: 'Maint.', value: aptRooms.filter(r => r.status === 'maintenance').length, color: 'text-amber-400' },
                    ].map(s => (
                      <div key={s.label}>
                        <div className={`font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Open', value: complaints.filter(c => c.status === 'open').length, color: 'text-red-400' },
              { label: 'In Progress', value: complaints.filter(c => c.status === 'in-progress').length, color: 'text-amber-400' },
              { label: 'Resolved', value: complaints.filter(c => c.status === 'resolved').length, color: 'text-emerald-400' },
              { label: 'Rejected', value: complaints.filter(c => c.status === 'rejected').length, color: 'text-muted-foreground' },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center">
                <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-bold text-foreground">Complaints by Category</h2>
            </div>
            <div className="p-5 space-y-3">
              {(['plumbing', 'electricity', 'noise', 'maintenance', 'other'] as const).map(cat => {
                const count = complaints.filter(c => c.category === cat).length;
                const pct = complaints.length > 0 ? Math.round((count / complaints.length) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-foreground capitalize">{cat}</span>
                      <span className="text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
