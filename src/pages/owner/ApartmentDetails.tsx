import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToApartments, subscribeToRooms, subscribeToUsers, 
  subscribeToPayments, subscribeToComplaints, subscribeToElectricityBills,
  createRoom, updateRoom, deleteRoom, assignRoomToCustomer, removeRoomFromCustomer
} from '../../firebase/db';
import { Apartment, Room, Payment, Complaint, UserProfile, ElectricityBill } from '../../types';
import { 
  ArrowLeft, ChevronRight, Building2, MapPin, Users, DoorOpen, IndianRupee, 
  AlertCircle, Info, Home, Eye, Calendar, Plus, Trash2, ShieldAlert, X, FileText, Download, Check
} from 'lucide-react';
import { exportAgreementPDF, exportRentReceiptPDF, exportElectricityBillPDF } from '../../utils/exportUtils';
import { DocumentViewer } from '../../components/common/DocumentViewer';

export const OwnerApartmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Tabs state: Overview, Rooms, Customers, Payments, Electricity, Complaints, Documents, Reports, Timeline
  const [activeTab, setActiveTab] = useState<'overview' | 'rooms' | 'customers' | 'payments' | 'electricity' | 'complaints' | 'documents' | 'reports' | 'timeline'>('overview');

  // Modals / Dropdowns
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);

  // Form states
  const [roomNumber, setRoomNumber] = useState('');
  const [rentAmount, setRentAmount] = useState(10000);
  const [assignForm, setAssignForm] = useState({ customerId: '' });

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    // Real-time subscriptions
    unsubscribes.push(subscribeToApartments((allApts) => {
      const apt = allApts.find(a => a.id === id);
      setApartment(apt || null);
    }));

    unsubscribes.push(subscribeToRooms((allRooms) => {
      setRooms(allRooms.filter(r => r.apartmentId === id));
    }));

    unsubscribes.push(subscribeToPayments((allPayments) => {
      setPayments(allPayments.filter(p => p.apartmentId === id));
    }));

    unsubscribes.push(subscribeToElectricityBills((allBills) => {
      setBills(allBills.filter(b => {
        const roomMatch = rooms.find(r => r.id === b.roomId);
        return roomMatch || b.roomId.startsWith(id + '_');
      }));
    }));

    unsubscribes.push(subscribeToComplaints((allComplaints) => {
      setComplaints(allComplaints.filter(c => c.apartmentId === id));
    }));

    unsubscribes.push(subscribeToUsers(setUsers));

    setTimeout(() => setLoading(false), 700);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [id, user]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="text-center py-16 bg-card border border-border rounded-3xl space-y-3">
        <p className="text-[16px] text-foreground font-semibold">Apartment Not Found</p>
        <button onClick={() => navigate('/owner/apartments')} className="text-[14px] text-brand-650 font-bold hover:underline">
          Return to Apartments List
        </button>
      </div>
    );
  }

  // Derive stats
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
  const vacantRooms = rooms.filter(r => r.status === 'vacant').length;
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  const currentMonthKey = `${nowMonth().getFullYear()}-${String(nowMonth().getMonth() + 1).padStart(2, '0')}`;
  
  const revenueCollected = payments
    .filter(p => p.status === 'paid' && p.type === 'rent')
    .reduce((s, p) => s + p.amount, 0);

  const revenuePending = payments
    .filter(p => (p.status === 'pending' || p.status === 'overdue') && p.type === 'rent')
    .reduce((s, p) => s + p.amount, 0);

  const activeComplaints = complaints.filter(c => c.status !== 'resolved');

  // Customer resolution helper
  const getCustomer = (customerId: string | null | undefined) => {
    if (!customerId) return null;
    return users.find(u => u.uid === customerId) || null;
  };

  // Onboarding vacant customers
  const vacantCustomers = users.filter(u => u.role === 'customer' && !rooms.some(r => r.currentCustomerId === u.uid));

  // Form submit handlers
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber) return;
    try {
      await createRoom({
        apartmentId: apartment.id,
        roomNumber,
        rentAmount,
        securityDeposit: rentAmount * 2,
        status: 'vacant',
        currentCustomerId: null
      });
      setAddRoomOpen(false);
      setRoomNumber('');
    } catch (err) {
      console.error(err);
      alert('Failed to create room.');
    }
  };

  const handleAssignTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !assignForm.customerId) return;
    const targetC = users.find(u => u.uid === assignForm.customerId);
    if (!targetC) return;
    try {
      await assignRoomToCustomer(
        selectedRoom.id,
        targetC.uid,
        targetC.displayName || 'Unknown Name',
        user?.uid || 'owner',
        user?.displayName || 'Owner'
      );
      setAssignModalOpen(false);
      setSelectedRoom(null);
      setAssignForm({ customerId: '' });
    } catch (err) {
      alert('Failed to assign customer.');
    }
  };

  const handleUnassignTenant = async (roomId: string) => {
    if (!window.confirm('Remove customer from this room?')) return;
    try {
      await removeRoomFromCustomer(roomId, user?.uid || 'owner', user?.displayName || 'Owner');
    } catch (err) {
      alert('Failed to remove customer.');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Delete this room from building registers?')) return;
    try {
      await deleteRoom(roomId);
    } catch (err) {
      alert('Failed to delete room.');
    }
  };

  const handleToggleMaintenance = async (room: Room) => {
    const newStatus = room.status === 'maintenance' ? 'vacant' : 'maintenance';
    try {
      await updateRoom(room.id, { status: newStatus });
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* ── BREADCRUMBS ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/owner/apartments')}
          className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={14} className="mr-1" /> Back to Properties
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>Owner</span>
          <ChevronRight size={12} />
          <Link to="/owner/apartments" className="hover:underline">My Apartments</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-bold">{apartment.name}</span>
        </div>
      </div>

      {/* ── COMPLEX BANNER BLOCK ───────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row">
        <div className="md:w-1/3 relative min-h-[180px] bg-slate-100 dark:bg-slate-800">
          <img 
            src={apartment.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'} 
            alt={apartment.name} 
            className="w-full h-full object-cover" 
          />
        </div>
        <div className="p-6 md:w-2/3 space-y-3">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 text-[12px] font-bold uppercase tracking-wider">
            Verified Complex
          </span>
          <h2 className="text-[28px] font-black text-foreground tracking-tight leading-tight">{apartment.name}</h2>
          <p className="text-[14px] text-muted-foreground flex items-center">
            <MapPin size={14} className="mr-1 text-slate-400" />
            {apartment.address}
          </p>
          <p className="text-[14px] text-slate-650 dark:text-slate-350 leading-relaxed font-medium pt-1">
            {apartment.description || 'No description logged by administration.'}
          </p>
        </div>
      </div>

      {/* ── TABS NAVIGATION ────────────────────────────────────────────────── */}
      <div className="border-b border-border flex flex-wrap gap-2 text-[14px] font-semibold text-muted-foreground">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'rooms', label: 'Rooms' },
          { key: 'customers', label: 'Customers' },
          { key: 'payments', label: 'Rent Invoices' },
          { key: 'electricity', label: 'Electricity Bills' },
          { key: 'complaints', label: 'Complaints' },
          { key: 'documents', label: 'Documents' },
          { key: 'reports', label: 'Reports' },
          { key: 'timeline', label: 'Timeline' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 px-3 border-b-2 transition-all ${
              activeTab === tab.key 
                ? 'border-emerald-600 text-foreground font-bold' 
                : 'border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT CONTAINERS ─────────────────────────────────────────── */}
      <div className="space-y-6">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card border border-border p-5 rounded-3xl">
                <span className="text-[12px] text-muted-foreground font-bold block">Occupancy Rate</span>
                <span className="text-[28px] font-black text-foreground block mt-1">{occupancyPct}%</span>
              </div>
              <div className="bg-card border border-border p-5 rounded-3xl">
                <span className="text-[12px] text-muted-foreground font-bold block">Rent Collected</span>
                <span className="text-[28px] font-black text-emerald-600 block mt-1">₹{revenueCollected.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-card border border-border p-5 rounded-3xl">
                <span className="text-[12px] text-muted-foreground font-bold block">Pending Invoices</span>
                <span className="text-[28px] font-black text-rose-500 block mt-1">₹{revenuePending.toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-card border border-border p-5 rounded-3xl">
                <span className="text-[12px] text-muted-foreground font-bold block">Active Complaints</span>
                <span className="text-[28px] font-black text-amber-500 block mt-1">{activeComplaints.length} Open</span>
              </div>
            </div>

            {/* Current Issues List */}
            <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Active Maintenance Issues</h3>
              {activeComplaints.length === 0 ? (
                <p className="text-muted-foreground text-[14px]">No active complaints registered for this building. 🎉</p>
              ) : (
                <div className="space-y-3">
                  {activeComplaints.map(c => (
                    <div key={c.id} className="p-4 border border-border rounded-2xl flex items-center justify-between bg-slate-50/20 dark:bg-slate-900/10">
                      <div>
                        <h4 className="text-[14px] font-semibold text-foreground">{c.title}</h4>
                        <p className="text-[12px] text-muted-foreground mt-0.5">Room {c.roomNumber} • Category: {c.category.toUpperCase()}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold uppercase border ${
                        c.status === 'in-progress' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS */}
        {activeTab === 'rooms' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <h3 className="text-[20px] font-bold text-foreground">Room Configurations</h3>
              <button 
                onClick={() => setAddRoomOpen(true)}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0"
              >
                <Plus size={14} /> Add Room
              </button>
            </div>

            <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
              <table className="w-full text-left text-[14px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                    <th className="p-4">Room No</th>
                    <th className="p-4">Monthly Rent</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Current Customer</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground font-semibold">
                  {rooms.map(room => {
                    const tenant = getCustomer(room.currentCustomerId);
                    return (
                      <tr key={room.id} className="hover:bg-muted/40 transition-colors">
                        <td className="p-4 font-extrabold text-[16px]">Room {room.roomNumber}</td>
                        <td className="p-4">₹{room.rentAmount.toLocaleString('en-IN')}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                            room.status === 'occupied' 
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
                              : room.status === 'vacant' 
                              ? 'bg-emerald-500/10 text-emerald-650 border-emerald-500/20' 
                              : 'bg-orange-500/10 text-orange-600 border-orange-500/20'
                          }`}>
                            {room.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {tenant ? (
                            <Link to={`/owner/customers/${tenant.uid}`} className="text-brand-650 hover:underline">
                              {tenant.displayName}
                            </Link>
                          ) : (
                            <span className="text-[12px] text-muted-foreground font-medium">Vacant</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Link 
                              to={`/owner/rooms/${room.id}`}
                              className="p-1.5 hover:bg-muted text-muted-foreground rounded-lg border border-border"
                            >
                              <Eye size={14} />
                            </Link>
                            {room.status === 'vacant' ? (
                              <button
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setAssignModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg"
                                title="Assign Tenant"
                              >
                                <Users size={14} />
                              </button>
                            ) : (
                              room.status === 'occupied' && (
                                <button
                                  onClick={() => handleUnassignTenant(room.id)}
                                  className="p-1.5 hover:bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-lg"
                                  title="Vacate Room"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )
                            )}
                            <button
                              onClick={() => handleToggleMaintenance(room)}
                              className={`p-1.5 border rounded-lg transition-colors ${room.status === 'maintenance' ? 'bg-orange-500/10 text-orange-600 border-orange-500/25' : 'hover:bg-orange-500/10 text-muted-foreground border-border'}`}
                              title="Toggle Maintenance"
                            >
                              <ShieldAlert size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteRoom(room.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-muted-foreground border border-border rounded-lg"
                              title="Delete Room"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CUSTOMERS */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Current Tenants</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.filter(r => r.currentCustomerId).map(room => {
                const tenant = getCustomer(room.currentCustomerId);
                if (!tenant) return null;

                return (
                  <div key={tenant.uid} className="bg-card border border-border p-5 rounded-3xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-500/10 text-brand-600 flex items-center justify-center font-black text-sm border border-brand-500/20">
                        {tenant.displayName?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{tenant.displayName}</h4>
                        <p className="text-[12px] text-muted-foreground">Room {room.roomNumber} • {tenant.email}</p>
                      </div>
                    </div>
                    <Link 
                      to={`/owner/customers/${tenant.uid}`}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground font-bold text-xs rounded-xl transition-all"
                    >
                      Profile
                    </Link>
                  </div>
                );
              })}
              {rooms.filter(r => r.currentCustomerId).length === 0 && (
                <div className="text-center py-10 border border-dashed border-border rounded-2xl col-span-2">
                  <p className="text-[14px] text-muted-foreground font-medium">No tenants currently residing in this building.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Rent Invoices</h3>
            <div className="overflow-x-auto rounded-3xl border border-border">
              <table className="w-full text-left text-[14px] border-collapse bg-slate-50/20 dark:bg-slate-900/5">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                    <th className="p-4">Customer</th>
                    <th className="p-4">Billing Month</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground font-semibold">
                  {payments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="p-4">{p.customerName}</td>
                      <td className="p-4">{p.billingMonth}</td>
                      <td className="p-4 text-muted-foreground font-medium">{p.dueDate}</td>
                      <td className="p-4">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase ${
                          p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {p.status === 'paid' ? (
                          <button 
                            onClick={() => exportRentReceiptPDF(p, apartment.name)}
                            className="p-1.5 hover:bg-muted border border-border rounded-lg"
                          >
                            <Download size={14} />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ELECTRICITY */}
        {activeTab === 'electricity' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Electricity Bill Statements</h3>
            <div className="overflow-x-auto rounded-3xl border border-border bg-slate-50/20 dark:bg-slate-900/5">
              <table className="w-full text-left text-[14px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                    <th className="p-4">Customer</th>
                    <th className="p-4">Billing Month</th>
                    <th className="p-4">Units Used</th>
                    <th className="p-4">Total Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground font-semibold">
                  {bills.map((b, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="p-4">{b.customerName}</td>
                      <td className="p-4">{b.billingMonth}</td>
                      <td className="p-4">{b.unitsConsumed} Units</td>
                      <td className="p-4">₹{b.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase ${
                          b.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {b.status === 'paid' ? (
                          <button 
                            onClick={() => exportElectricityBillPDF(b, apartment.name, user?.displayName || 'Owner')}
                            className="p-1.5 hover:bg-muted border border-border rounded-lg"
                          >
                            <Download size={14} />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: COMPLAINTS */}
        {activeTab === 'complaints' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Maintenance Requests</h3>
            <div className="space-y-3">
              {complaints.map(c => (
                <div key={c.id} className="bg-card border border-border p-5 rounded-3xl flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <h4 className="font-semibold text-foreground text-[16px]">{c.title}</h4>
                    <p className="text-[14px] text-muted-foreground font-medium mt-0.5">Room {c.roomNumber} • Category: {c.category}</p>
                    <p className="text-[12px] text-muted-foreground font-bold mt-1">Logged on: {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[12px] font-bold border uppercase ${
                    c.status === 'resolved' 
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                      : c.status === 'in-progress' 
                      ? 'bg-orange-500/10 text-orange-650 border-orange-500/20' 
                      : 'bg-amber-500/10 text-amber-650 border-amber-500/20'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
              {complaints.length === 0 && (
                <p className="text-center py-8 text-muted-foreground font-medium">No complaints logged for this apartment complex.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Lease & Verification Vault</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.filter(r => r.currentCustomerId).map(room => {
                const tenant = getCustomer(room.currentCustomerId);
                if (!tenant) return null;

                return (
                  <div key={room.id} className="bg-card border border-border p-5 rounded-3xl flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-650 flex items-center justify-center border border-purple-500/15">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-[14px]">Agreement - Room {room.roomNumber}</h4>
                        <p className="text-[12px] text-muted-foreground">Tenant: {tenant.displayName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => {
                          setSelectedRoom(room);
                          setPreviewDocName('Rental Lease Agreement');
                        }}
                        className="p-2 hover:bg-muted border border-border rounded-xl transition-all"
                        title="View Agreement"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => exportAgreementPDF(tenant, room, apartment, user?.displayName || 'Owner')}
                        className="p-2 hover:bg-muted border border-border rounded-xl transition-all"
                        title="Download Agreement"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {rooms.filter(r => r.currentCustomerId).length === 0 && (
                <p className="text-center py-10 text-muted-foreground col-span-2 font-medium">No documents filed. Allocate a room to generate lease documents.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: REPORTS */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Apartment Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Occupancy Donut */}
              <div className="bg-card border border-border p-6 rounded-3xl flex flex-col items-center justify-center">
                <span className="text-[14px] text-muted-foreground font-bold mb-4">Occupancy Status</span>
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3" />
                    <circle 
                      cx="18" 
                      cy="18" 
                      r="15.915" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="3.5" 
                      strokeDasharray={`${occupancyPct} ${100 - occupancyPct}`}
                      strokeDashoffset="0" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-black text-foreground">{occupancyPct}%</span>
                    <span className="text-[12px] text-muted-foreground font-bold">Occupied</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-6 text-[12px] font-bold">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>{occupiedRooms} Occupied</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>{vacantRooms} Vacant</span>
                </div>
              </div>

              {/* Collections breakdown */}
              <div className="bg-card border border-border p-6 rounded-3xl flex flex-col justify-between">
                <span className="text-[14px] text-muted-foreground font-bold">Financial Realization</span>
                
                <div className="space-y-4 my-4 font-semibold text-[14px]">
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-muted-foreground">Collected Revenue</span>
                    <span className="text-emerald-600">₹{revenueCollected.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-2">
                    <span className="text-muted-foreground">Expected Outstanding</span>
                    <span className="text-rose-500">₹{revenuePending.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Realization Rate</span>
                    <span className="text-foreground font-bold">
                      {revenueCollected + revenuePending > 0 ? Math.round((revenueCollected / (revenueCollected + revenuePending)) * 100) : 0}% Realized
                    </span>
                  </div>
                </div>

                <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full" 
                    style={{ width: `${revenueCollected + revenuePending > 0 ? (revenueCollected / (revenueCollected + revenuePending)) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Apartment Audit Trail</h3>
            
            <div className="relative border-l border-border pl-6 space-y-6 ml-3">
              {rooms.map((room, idx) => (
                <div key={idx} className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-card z-10"></span>
                  <div className="space-y-0.5">
                    <h4 className="text-[14px] text-foreground font-semibold">Room {room.roomNumber} Configured</h4>
                    <p className="text-[12px] text-muted-foreground font-medium">Rent base set to ₹{room.rentAmount.toLocaleString('en-IN')}</p>
                    <span className="text-[12px] text-muted-foreground font-bold">
                      {new Date(room.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* ── ADD ROOM MODAL ────────────────────────────────────────────────── */}
      {addRoomOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Add New Room</h3>
              <button onClick={() => setAddRoomOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Room Number</label>
                <input 
                  type="text" 
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 101, 102"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Monthly Rent Amount (₹)</label>
                <input 
                  type="number" 
                  required
                  value={rentAmount}
                  onChange={(e) => setRentAmount(Number(e.target.value))}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[14px] rounded-xl transition-all shadow-md mt-2"
              >
                Create Room Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN TENANT MODAL ───────────────────────────────────────────── */}
      {assignModalOpen && selectedRoom && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Assign Customer</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignTenant} className="space-y-4 text-xs font-bold">
              <div>
                <span className="text-[12px] text-muted-foreground block">Allocating Room</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5">Room {selectedRoom.roomNumber}</span>
              </div>

              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Select Customer</label>
                {vacantCustomers.length === 0 ? (
                  <p className="text-[14px] text-muted-foreground font-medium mt-1">No unassigned customers available to allocate.</p>
                ) : (
                  <select
                    value={assignForm.customerId}
                    onChange={(e) => setAssignForm({ customerId: e.target.value })}
                    required
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none"
                  >
                    <option value="">-- Choose Tenant --</option>
                    {vacantCustomers.map(c => (
                      <option key={c.uid} value={c.uid}>{c.displayName} ({c.email})</option>
                    ))}
                  </select>
                )}
              </div>

              {vacantCustomers.length > 0 && (
                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[14px] rounded-xl transition-all shadow-md mt-2"
                >
                  Confirm Allocation
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ── DOCUMENT PREVIEW VAULT MODAL ────────────────────────────────── */}
      {previewDocName && selectedRoom && (
        <DocumentViewer
          isOpen={!!previewDocName}
          onClose={() => {
            setPreviewDocName(null);
            setSelectedRoom(null);
          }}
          docName={previewDocName}
          docType="lease"
          fileUrl={null}
          status="Verified"
          customer={getCustomer(selectedRoom.currentCustomerId)}
          room={selectedRoom}
          apartment={apartment}
          ownerName={user?.displayName || 'Owner'}
        />
      )}

    </div>
  );
};

// Date utilities
const nowMonth = () => new Date();
