import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getApartments, getRooms, getUsers } from '../../firebase/db';
import { Apartment, Room, UserProfile } from '../../types';
import { ArrowLeft, ChevronRight, Building2, Users, DoorOpen, Home, CheckCircle2 } from 'lucide-react';

export const OccupancyDetails: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter') || 'all'; // 'all' | 'occupied' | 'vacant'

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [allApts, allRooms, allUsers] = await Promise.all([
        getApartments(),
        getRooms(),
        getUsers()
      ]);

      let ownerAptIds: string[] = [];
      if (user.uid === 'owner-john-id') {
        ownerAptIds = ['apt-1', 'apt-2'];
      } else if (user.uid === 'owner-jane-id') {
        ownerAptIds = ['apt-3'];
      } else {
        ownerAptIds = allApts.map(a => a.id);
      }

      setApartments(allApts.filter(a => ownerAptIds.includes(a.id)));
      setRooms(allRooms.filter(r => ownerAptIds.includes(r.apartmentId)));
      setCustomers(allUsers.filter(u => u.role === 'customer'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Filter calculations
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
  const vacantRooms = rooms.filter(r => r.status === 'vacant').length;
  const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Filter list of rooms
  const filteredRooms = rooms.filter(room => {
    if (filterParam === 'occupied') return room.status === 'occupied';
    if (filterParam === 'vacant') return room.status === 'vacant';
    return true;
  });

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return '—';
    const cust = customers.find(c => c.uid === customerId);
    return cust ? cust.displayName : 'Unknown';
  };

  const getApartmentName = (aptId: string) => {
    const apt = apartments.find(a => a.id === aptId);
    return apt ? apt.name : 'Unknown Apartment';
  };

  return (
    <div className="space-y-6">
      {/* ── BREADCRUMBS & BACK BUTTON ────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft size={14} className="mr-1" /> Back
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>Owner</span>
          <ChevronRight size={12} />
          <Link to="/owner/apartments" className="hover:underline">Apartments</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-bold">
            {filterParam === 'occupied' ? 'Occupied Rooms' : filterParam === 'vacant' ? 'Vacant Rooms' : 'Occupancy Details'}
          </span>
        </div>
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          Occupancy Registry & Analytics
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Detailed room allotment auditing, vacancies, and apartment metrics.
        </p>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Rooms */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Rooms</span>
          </div>
          <p className="text-2xl font-black text-foreground">{totalRooms}</p>
        </div>

        {/* Occupied */}
        <Link 
          to="/owner/apartments/occupancy?filter=occupied"
          className={`bg-card border rounded-2xl p-5 shadow-sm hover:border-emerald-500 transition-all cursor-pointer ${
            filterParam === 'occupied' ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-md' : 'border-border'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Occupied Rooms</span>
          </div>
          <p className="text-2xl font-black text-foreground">{occupiedRooms}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">Rate: {occupancyPct}%</p>
        </Link>

        {/* Vacant */}
        <Link 
          to="/owner/apartments/occupancy?filter=vacant"
          className={`bg-card border rounded-2xl p-5 shadow-sm hover:border-amber-500 transition-all cursor-pointer ${
            filterParam === 'vacant' ? 'border-amber-500 ring-1 ring-amber-500 shadow-md' : 'border-border'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DoorOpen size={16} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vacant Rooms</span>
          </div>
          <p className="text-2xl font-black text-foreground">{vacantRooms}</p>
          <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">Available for rent</p>
        </Link>

        {/* Occupancy Chart */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-1.5">
            <span>Occupancy Rate</span>
            <span className="font-bold text-foreground">{occupancyPct}%</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── APARTMENT-WISE OCCUPANCY ─────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-4">Apartment-wise Occupancy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {apartments.map(apt => {
            const aptRooms = rooms.filter(r => r.apartmentId === apt.id);
            const aptOcc = aptRooms.filter(r => r.status === 'occupied').length;
            const aptVac = aptRooms.filter(r => r.status === 'vacant').length;
            const pct = aptRooms.length > 0 ? Math.round((aptOcc / aptRooms.length) * 100) : 0;
            return (
              <div 
                key={apt.id} 
                onClick={() => navigate(`/owner/apartments/${apt.id}`)}
                className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/30 hover:border-blue-500 cursor-pointer transition-all duration-150"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-850 dark:text-slate-100 text-sm">{apt.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{apt.address}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                    {pct}% occupied
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                  <span>Total: {aptRooms.length}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">Occupied: {aptOcc}</span>
                  <span className="text-amber-600 dark:text-amber-400">Vacant: {aptVac}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── ROOM REGISTRY DETAIL TABLE ───────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h3 className="text-base font-bold text-foreground">
            {filterParam === 'occupied' ? 'Occupied Rooms Registry' : filterParam === 'vacant' ? 'Vacant Rooms Registry' : 'All Rooms Registry'}
          </h3>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => navigate('/owner/apartments/occupancy?filter=all')}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                filterParam === 'all' ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-100 dark:border-slate-100 dark:text-slate-900' : 'bg-transparent border-border text-slate-650 hover:bg-table-row-hover'
              }`}
            >
              All ({rooms.length})
            </button>
            <button 
              onClick={() => navigate('/owner/apartments/occupancy?filter=occupied')}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                filterParam === 'occupied' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-transparent border-border text-slate-650 hover:bg-table-row-hover'
              }`}
            >
              Occupied ({occupiedRooms})
            </button>
            <button 
              onClick={() => navigate('/owner/apartments/occupancy?filter=vacant')}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                filterParam === 'vacant' ? 'bg-amber-600 border-amber-600 text-white' : 'bg-transparent border-border text-slate-650 hover:bg-table-row-hover'
              }`}
            >
              Vacant ({vacantRooms})
            </button>
          </div>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground font-semibold">
            No rooms match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-table-header border-b border-border text-left">
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Room</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Apartment</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Monthly Rent</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Status</th>
                  <th className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-6 py-3">Customer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredRooms.map(room => (
                  <tr 
                    key={room.id}
                    onClick={() => navigate(`/owner/rooms/${room.id}`)}
                    className="hover:bg-table-row-hover cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline">
                      Room {room.roomNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-650 dark:text-slate-400 font-medium">
                      {getApartmentName(room.apartmentId)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-850 dark:text-slate-200">
                      ₹{room.rentAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                        room.status === 'occupied' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/40' :
                        room.status === 'vacant' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40' :
                        'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40'
                      }`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {room.currentCustomerId ? (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/owner/customers/${room.currentCustomerId}`);
                          }}
                          className="flex items-center gap-2 cursor-pointer w-fit"
                        >
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-bold text-[10px] flex items-center justify-center">
                            {getCustomerName(room.currentCustomerId).charAt(0).toUpperCase()}
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                            {getCustomerName(room.currentCustomerId)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-medium">Vacant</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
