import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Filter, DoorOpen, Building, User, 
  Settings, ArrowUpDown, Wrench, CheckCircle, XCircle,
  Edit2, Trash2, UserPlus, UserMinus
} from 'lucide-react';
import { getRooms, getApartments, getUsers, updateRoom, deleteRoom, removeRoomFromCustomer } from '../../../firebase/db';
import { useAuth } from '../../../context/AuthContext';
import { Room, Apartment, UserProfile } from '../../../types';

const statusColors: Record<string, string> = {
  occupied: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  vacant: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  maintenance: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

export const RoomList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [apartmentFilter, setApartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'roomNumber' | 'rentAmount' | 'status'>('roomNumber');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [r, a, u] = await Promise.all([getRooms(), getApartments(), getUsers()]);
      setRooms(r);
      setApartments(a);
      setCustomers(u.filter(u => u.role === 'customer'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (room: Room) => {
    if (room.currentCustomerId) {
      alert('Cannot delete a room that has an assigned customer. Remove the customer first.');
      return;
    }
    if (!confirm(`Delete room ${room.roomNumber}? This action cannot be undone.`)) return;
    await deleteRoom(room.id);
    await loadData();
  };

  const handleRemoveCustomer = async (room: Room) => {
    if (!confirm(`Remove customer from room ${room.roomNumber}? The room will become vacant.`)) return;
    await removeRoomFromCustomer(room.id, user?.uid || '', user?.displayName || 'Admin');
    await loadData();
  };

  const handleStatusChange = async (room: Room, newStatus: 'vacant' | 'occupied' | 'maintenance') => {
    if (newStatus === 'occupied' && !room.currentCustomerId) {
      alert('Assign a customer first before marking a room as occupied.');
      return;
    }
    await updateRoom(room.id, { status: newStatus });
    await loadData();
  };

  const getApartmentName = (id: string) => apartments.find(a => a.id === id)?.name || 'Unknown';
  const getCustomerName = (id: string | null | undefined) => id ? customers.find(c => c.uid === id)?.displayName || 'Unknown' : null;

  const filtered = rooms
    .filter(r => {
      const matchSearch = r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
        getApartmentName(r.apartmentId).toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchApt = apartmentFilter === 'all' || r.apartmentId === apartmentFilter;
      return matchSearch && matchStatus && matchApt;
    })
    .sort((a, b) => {
      if (sortBy === 'rentAmount') return b.rentAmount - a.rentAmount;
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return a.roomNumber.localeCompare(b.roomNumber);
    });

  const stats = {
    total: rooms.length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    vacant: rooms.filter(r => r.status === 'vacant').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
  };

  if (loading) return (
    <div className="h-96 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DoorOpen size={24} className="text-brand-500" />
            Room Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage all rooms across all apartments</p>
        </div>
        <Link
          to="/admin/rooms/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <Plus size={16} /> Add Room
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rooms', value: stats.total, icon: <DoorOpen size={18} />, color: 'text-brand-400' },
          { label: 'Occupied', value: stats.occupied, icon: <CheckCircle size={18} />, color: 'text-emerald-400' },
          { label: 'Vacant', value: stats.vacant, icon: <XCircle size={18} />, color: 'text-blue-400' },
          { label: 'Maintenance', value: stats.maintenance, icon: <Wrench size={18} />, color: 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search rooms or apartments..."
            className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Status</option>
          <option value="vacant">Vacant</option>
          <option value="occupied">Occupied</option>
          <option value="maintenance">Maintenance</option>
        </select>
        <select
          value={apartmentFilter}
          onChange={e => setApartmentFilter(e.target.value)}
          className="px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Apartments</option>
          {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-500"
        >
          <option value="roomNumber">Sort: Room #</option>
          <option value="rentAmount">Sort: Rent</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-table-header,theme(colors.slate.800))] border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Room</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apartment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Floor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <DoorOpen size={36} className="mx-auto mb-3 opacity-30" />
                    No rooms found
                  </td>
                </tr>
              ) : filtered.map(room => {
                const tenant = getCustomerName(room.currentCustomerId);
                return (
                  <tr key={room.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-foreground text-base">#{room.roomNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-muted-foreground" />
                        <span className="text-foreground">{getApartmentName(room.apartmentId)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{room.floor ? `Floor ${room.floor}` : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">${room.rentAmount.toLocaleString()}/mo</td>
                    <td className="px-4 py-3">
                      <select
                        value={room.status}
                        onChange={e => handleStatusChange(room, e.target.value as any)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold border-0 focus:outline-none cursor-pointer ${statusColors[room.status]}`}
                      >
                        <option value="vacant">Vacant</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {tenant ? (
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-emerald-400" />
                          <span className="text-foreground text-sm">{tenant}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Link
                          to={`/admin/rooms/${room.id}`}
                          className="p-1.5 text-muted-foreground hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Settings size={15} />
                        </Link>
                        <Link
                          to={`/admin/rooms/${room.id}/edit`}
                          className="p-1.5 text-muted-foreground hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Edit Room"
                        >
                          <Edit2 size={15} />
                        </Link>
                        <Link
                          to={`/admin/rooms/${room.id}/assign`}
                          className="p-1.5 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Assign Customer"
                        >
                          <UserPlus size={15} />
                        </Link>
                        {room.currentCustomerId && (
                          <button
                            onClick={() => handleRemoveCustomer(room)}
                            className="p-1.5 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                            title="Remove Customer"
                          >
                            <UserMinus size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(room)}
                          className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete Room"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {rooms.length} rooms
          </div>
        )}
      </div>
    </div>
  );
};
