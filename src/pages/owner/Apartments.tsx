import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribeToApartments, subscribeToRooms, subscribeToUsers, subscribeToPayments } from '../../firebase/db';
import { Apartment, Room, UserProfile, Payment } from '../../types';
import { MapPin, Layers, Building, Eye, TrendingUp, IndianRupee, User } from 'lucide-react';

export const OwnerApartments: React.FC = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    unsubscribes.push(subscribeToApartments(setApartments));
    unsubscribes.push(subscribeToRooms(setRooms));
    unsubscribes.push(subscribeToUsers(setUsers));
    unsubscribes.push(subscribeToPayments(setPayments));

    setTimeout(() => setLoading(false), 600);

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
  const ownerApts = apartments.filter(a => ownerAptIds.includes(a.id));

  // Current month key
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

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
            Property Portfolio
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium mt-0.5">
            Manage your buildings, track room occupancy levels, and analyze billing collections.
          </p>
        </div>
        <div className="inline-flex items-center px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-bold w-fit">
          <span>{ownerApts.length} Managed Complexes</span>
        </div>
      </div>

      {/* ── APARTMENTS DIRECTORY CARDS ─────────────────────────────────────── */}
      {ownerApts.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-16 text-center shadow-sm space-y-3">
          <Building className="mx-auto text-slate-300 w-16 h-16" />
          <h3 className="text-[20px] font-bold text-foreground">No Apartments Assigned</h3>
          <p className="text-[14px] text-muted-foreground font-medium">Please check back later or contact admin to allocate complexes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {ownerApts.map((apt) => {
            // Filter rooms for this apartment
            const aptRooms = rooms.filter(r => r.apartmentId === apt.id);
            const occupiedRooms = aptRooms.filter(r => r.status === 'occupied').length;
            const vacantRooms = aptRooms.filter(r => r.status === 'vacant').length;
            const maintenanceRooms = aptRooms.filter(r => r.status === 'maintenance').length;
            
            // Calculate current month's revenue (Paid Rent)
            const revenue = payments
              .filter(p => p.apartmentId === apt.id && p.status === 'paid' && p.type === 'rent' && p.billingMonth === currentMonthKey)
              .reduce((sum, p) => sum + p.amount, 0);

            // Occupancy percentage
            const occupancyRate = aptRooms.length > 0 ? Math.round((occupiedRooms / aptRooms.length) * 100) : 0;

            // Mock apartment cover photos
            const imageMap: { [key: string]: string } = {
              'apt-1': 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80', // Skyview Heights
              'apt-2': 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80', // Oakwood Suites
              'apt-3': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80', // Emerald Woods
            };
            const coverImage = imageMap[apt.id] || 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=600&q=80';

            // Resolve Owner Name
            const owner = users.find(u => u.uid === apt.ownerId);
            const ownerName = owner?.displayName || (apt.ownerId === 'owner-john-id' ? 'John Owner' : 'Jane Owner');

            return (
              <div 
                key={apt.id} 
                className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Aspect Cover Image */}
                  <div className="h-48 w-full bg-slate-100 dark:bg-slate-800 relative">
                    <img 
                      src={coverImage} 
                      alt={apt.name} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <h2 className="text-[20px] font-black text-white tracking-tight leading-tight">{apt.name}</h2>
                      <p className="text-[12px] text-white/80 font-semibold flex items-center mt-1">
                        <MapPin size={12} className="mr-1 text-emerald-450" />
                        {apt.address}
                      </p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-5">
                    {/* Owner detail */}
                    <div className="flex items-center gap-2 text-[14px] text-muted-foreground font-semibold">
                      <User size={14} className="text-slate-400" />
                      <span>Owner: <strong className="text-foreground">{ownerName}</strong></span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[12px] font-bold">
                        <span className="text-muted-foreground">Occupancy Rate</span>
                        <span className="text-brand-650">{occupancyRate}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${occupancyRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-4 gap-2 border-t border-border pt-4 text-center">
                      <div>
                        <span className="text-[12px] text-muted-foreground font-bold block">Total Rooms</span>
                        <span className="text-[16px] font-bold text-foreground block mt-0.5">{aptRooms.length}</span>
                      </div>
                      <div>
                        <span className="text-[12px] text-muted-foreground font-bold block">Occupied</span>
                        <span className="text-[16px] font-bold text-blue-500 block mt-0.5">{occupiedRooms}</span>
                      </div>
                      <div>
                        <span className="text-[12px] text-muted-foreground font-bold block">Vacant</span>
                        <span className="text-[16px] font-bold text-emerald-500 block mt-0.5">{vacantRooms}</span>
                      </div>
                      <div>
                        <span className="text-[12px] text-muted-foreground font-bold block">Maint.</span>
                        <span className="text-[16px] font-bold text-orange-500 block mt-0.5">{maintenanceRooms}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer section */}
                <div className="p-6 border-t border-border bg-slate-50/50 dark:bg-slate-900/10 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[12px] text-muted-foreground font-bold block uppercase tracking-wider">Monthly Revenue</span>
                    <span className="text-[20px] font-bold text-foreground block mt-0.5">
                      ₹{revenue.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <Link 
                    to={`/owner/apartments/${apt.id}`}
                    className="flex items-center gap-1.5 px-4.5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    <Eye size={14} />
                    <span>View Details</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
