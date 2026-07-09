import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToRooms, subscribeToApartments, subscribeToUsers, 
  createRoom, updateRoom, deleteRoom, assignRoomToCustomer, removeRoomFromCustomer 
} from '../../firebase/db';
import { Room, Apartment, UserProfile } from '../../types';
import { 
  Home, Building2, User, Clock, AlertCircle, Plus, Search, 
  Trash2, Edit, Eye, UserPlus, UserMinus, ShieldAlert, X, HelpCircle 
} from 'lucide-react';

export const OwnerRooms: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'vacant' | 'maintenance'>('all');
  const [apartmentFilter, setApartmentFilter] = useState<string>('all');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Form states
  const [addForm, setAddForm] = useState({
    apartmentId: '',
    roomNumber: '',
    rentAmount: 10000,
    securityDeposit: 20000,
  });
  const [assignForm, setAssignForm] = useState({
    customerId: ''
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    // Real-time subscriptions
    unsubscribes.push(subscribeToRooms(setRooms));
    unsubscribes.push(subscribeToApartments(setApartments));
    unsubscribes.push(subscribeToUsers(setUsers));

    // Wait for initial snapshots
    setTimeout(() => setLoading(false), 800);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  // Derived state filtering based on owner portfolio
  const getOwnerAptIds = () => {
    if (!user) return [];
    if (user.uid === 'owner-john-id') return ['apt-1', 'apt-2'];
    if (user.uid === 'owner-jane-id') return ['apt-3'];
    return apartments.map(a => a.id);
  };

  const ownerAptIds = getOwnerAptIds();
  const ownerRooms = rooms.filter(r => ownerAptIds.includes(r.apartmentId));
  const ownerApts = apartments.filter(a => ownerAptIds.includes(a.id));
  const customers = users.filter(u => u.role === 'customer');

  // Vacant customers list (role customer, not assigned to any room)
  const vacantCustomers = customers.filter(c => {
    const isAssigned = rooms.some(r => r.currentCustomerId === c.uid);
    return !isAssigned;
  });

  // Calculate KPIs
  const totalRooms = ownerRooms.length;
  const occupiedCount = ownerRooms.filter(r => r.status === 'occupied').length;
  const vacantCount = ownerRooms.filter(r => r.status === 'vacant').length;
  const maintenanceCount = ownerRooms.filter(r => r.status === 'maintenance').length;

  // Filter list
  const filteredRooms = ownerRooms.filter(room => {
    const matchesSearch = room.roomNumber.includes(searchQuery) ||
      (apartments.find(a => a.id === room.apartmentId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    const matchesApt = apartmentFilter === 'all' || room.apartmentId === apartmentFilter;

    return matchesSearch && matchesStatus && matchesApt;
  });

  // Form Handlers
  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.apartmentId || !addForm.roomNumber) {
      alert('Please fill out all fields.');
      return;
    }
    try {
      const apt = apartments.find(a => a.id === addForm.apartmentId);
      await createRoom({
        apartmentId: addForm.apartmentId,
        ownerId: apt?.ownerId || user?.uid || 'owner',
        roomNumber: addForm.roomNumber,
        floor: 1,
        rent: Number(addForm.rentAmount),
        deposit: Number(addForm.securityDeposit),
        electricityRate: 13.0,
        maintenanceCharge: 0,
        status: 'vacant',
        gender: 'unisex',
        sharingType: 'single',
        description: `Spacious Room ${addForm.roomNumber} managed by landlord.`,
        amenities: ['AC', 'WiFi', 'Attached Bathroom'],
        coverPhoto: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80',
        photos: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=80'],
        currentCustomerId: null,
        rentAmount: Number(addForm.rentAmount),
        securityDeposit: Number(addForm.securityDeposit)
      });
      setAddModalOpen(false);
      setAddForm({
        apartmentId: '',
        roomNumber: '',
        rentAmount: 10000,
        securityDeposit: 20000
      });
    } catch (err) {
      console.error(err);
      alert('Failed to add room.');
    }
  };

  const handleAssignCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !assignForm.customerId) return;
    
    const targetC = customers.find(c => c.uid === assignForm.customerId);
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
      console.error(err);
      alert('Failed to assign customer.');
    }
  };

  const handleUnassignCustomer = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to remove this customer from the room?')) return;
    try {
      await removeRoomFromCustomer(roomId, user?.uid || 'owner', user?.displayName || 'Owner');
    } catch (err) {
      console.error(err);
      alert('Failed to remove customer.');
    }
  };

  const handleToggleMaintenance = async (room: Room) => {
    const newStatus = room.status === 'maintenance' ? 'vacant' : 'maintenance';
    try {
      await updateRoom(room.id, { status: newStatus });
    } catch (err) {
      console.error(err);
      alert('Failed to update room status.');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this room? This will also unassign any current tenants.')) return;
    try {
      await deleteRoom(roomId);
    } catch (err) {
      console.error(err);
      alert('Failed to delete room.');
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-[28px] font-black text-foreground tracking-tight leading-tight">
            Room Management
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium mt-0.5">
            Configure room capacities, assign tenants, and schedule property maintenance.
          </p>
        </div>
        <button
          onClick={() => {
            if (ownerApts.length === 0) {
              alert('Please add or wait for apartment allocation before adding rooms.');
              return;
            }
            setAddForm(prev => ({ ...prev, apartmentId: ownerApts[0].id }));
            setAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all hover:-translate-y-0.5 shrink-0 w-fit"
        >
          <Plus size={15} />
          <span>Add New Room</span>
        </button>
      </div>

      {/* ── 1. KPI CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
          <span className="text-[12px] text-muted-foreground font-bold block">Total Managed Rooms</span>
          <span className="text-[28px] font-black text-foreground block mt-1">{totalRooms}</span>
        </div>
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
          <span className="text-[12px] text-muted-foreground font-bold block">Occupied Rooms</span>
          <span className="text-[28px] font-black text-blue-500 block mt-1">{occupiedCount}</span>
        </div>
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
          <span className="text-[12px] text-muted-foreground font-bold block">Vacant Rooms</span>
          <span className="text-[28px] font-black text-emerald-500 block mt-1">{vacantCount}</span>
        </div>
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
          <span className="text-[12px] text-muted-foreground font-bold block">Under Maintenance</span>
          <span className="text-[28px] font-black text-orange-500 block mt-1">{maintenanceCount}</span>
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search room or complex..."
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end text-xs font-bold">
          {/* Apartment filter */}
          <select
            value={apartmentFilter}
            onChange={(e) => setApartmentFilter(e.target.value)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="all">All Apartments</option>
            {ownerApts.map(apt => (
              <option key={apt.id} value={apt.id}>{apt.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-card border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      {/* ── 3. ROOMS TABLE ─────────────────────────────────────────────────── */}
      {filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-3xl shadow-sm space-y-3">
          <p className="text-[16px] text-foreground font-semibold">No Rooms Found</p>
          <p className="text-[14px] text-muted-foreground font-medium">Add a room or adjust filters to view properties.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-[14px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                <th className="p-4">Room Number</th>
                <th className="p-4">Apartment Name</th>
                <th className="p-4">Rent Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Current Tenant</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground font-semibold">
              {filteredRooms.map(room => {
                const parentApt = apartments.find(a => a.id === room.apartmentId);
                const tenantId = room.currentCustomerId || room.assignedCustomerId;
                const tenant = users.find(u => u.uid === tenantId);

                return (
                  <tr key={room.id} className="hover:bg-muted/40 transition-colors">
                    <td className="p-4">
                      <span className="font-extrabold text-[16px]">Room {room.roomNumber}</span>
                    </td>
                    <td className="p-4 text-muted-foreground font-medium">
                      {parentApt ? parentApt.name : 'Unknown'}
                    </td>
                    <td className="p-4">₹{room.rentAmount.toLocaleString('en-IN')}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                        room.status === 'occupied' 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                          : room.status === 'vacant' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20' 
                          : 'bg-orange-500/10 text-orange-650 dark:text-orange-400 border-orange-500/20'
                      }`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {tenant ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-650 border border-emerald-500/20 text-[10px] font-bold flex items-center justify-center uppercase">
                            {tenant.displayName?.charAt(0) || 'C'}
                          </div>
                          <Link to={`/owner/customers/${tenant.uid}`} className="text-brand-650 hover:underline">
                            {tenant.displayName}
                          </Link>
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground font-medium">None Assigned</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          to={`/owner/rooms/${room.id}`}
                          className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg border border-border transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </Link>
                        {room.status === 'vacant' ? (
                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setAssignForm({ customerId: '' });
                              setAssignModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg transition-colors"
                            title="Assign Customer"
                          >
                            <UserPlus size={14} />
                          </button>
                        ) : (
                          room.status === 'occupied' && (
                            <button
                              onClick={() => handleUnassignCustomer(room.id)}
                              className="p-1.5 hover:bg-rose-500/10 text-rose-600 border border-rose-500/20 rounded-lg transition-colors"
                              title="Unassign Customer"
                            >
                              <UserMinus size={14} />
                            </button>
                          )
                        )}
                        <button
                          onClick={() => handleToggleMaintenance(room)}
                          className={`p-1.5 border rounded-lg transition-colors ${
                            room.status === 'maintenance' 
                              ? 'bg-orange-500/10 text-orange-600 border-orange-500/25' 
                              : 'hover:bg-orange-500/10 text-muted-foreground hover:text-orange-600 border-border'
                          }`}
                          title="Toggle Maintenance"
                        >
                          <ShieldAlert size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 border border-border hover:border-rose-500/20 rounded-lg transition-colors"
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
      )}

      {/* ── ADD ROOM MODAL ───────────────────────────────────────────────── */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Add New Room</h3>
              <button onClick={() => setAddModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Target Apartment</label>
                <select
                  value={addForm.apartmentId}
                  onChange={(e) => setAddForm(prev => ({ ...prev, apartmentId: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none"
                >
                  {ownerApts.map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[12px] text-muted-foreground block mb-1">Room Number</label>
                <input
                  type="text"
                  required
                  value={addForm.roomNumber}
                  onChange={(e) => setAddForm(prev => ({ ...prev, roomNumber: e.target.value }))}
                  placeholder="e.g. 101, 204"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    required
                    value={addForm.rentAmount}
                    onChange={(e) => setAddForm(prev => ({ ...prev, rentAmount: Number(e.target.value), securityDeposit: Number(e.target.value) * 2 }))}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1">Deposit (₹)</label>
                  <input
                    type="number"
                    required
                    value={addForm.securityDeposit}
                    onChange={(e) => setAddForm(prev => ({ ...prev, securityDeposit: Number(e.target.value) }))}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[14px] rounded-xl transition-all shadow-md mt-2"
              >
                Create Room
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── ASSIGN CUSTOMER MODAL ────────────────────────────────────────── */}
      {assignModalOpen && selectedRoom && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Assign Customer</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAssignCustomer} className="space-y-4 text-xs font-bold">
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

    </div>
  );
};
