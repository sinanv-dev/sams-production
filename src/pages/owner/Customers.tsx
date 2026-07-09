import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribeToUsers, subscribeToRooms, subscribeToApartments, subscribeToPayments, subscribeToElectricityBills } from '../../firebase/db';
import { UserProfile, Room, Apartment, Payment, ElectricityBill } from '../../types';
import { Mail, Phone, Home, Search, Users, ShieldCheck, ChevronRight, Eye, Calendar } from 'lucide-react';

export const OwnerCustomers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    unsubscribes.push(subscribeToUsers((usersList) => {
      setCustomers(usersList.filter(u => u.role === 'customer'));
    }));
    unsubscribes.push(subscribeToRooms(setRooms));
    unsubscribes.push(subscribeToApartments(setApartments));
    unsubscribes.push(subscribeToPayments(setPayments));
    unsubscribes.push(subscribeToElectricityBills(setBills));

    setTimeout(() => setLoading(false), 700);

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
  const ownerRooms = rooms.filter(r => ownerAptIds.includes(r.apartmentId));

  // Find customers that belong to this owner (assigned to any of their rooms)
  const ownerCustomerIds = ownerRooms.map(r => r.currentCustomerId).filter(Boolean) as string[];
  const ownerCustomers = customers.filter(c => ownerCustomerIds.includes(c.uid));

  // Search filter
  const filteredCustomers = ownerCustomers.filter(c => {
    const room = ownerRooms.find(r => r.currentCustomerId === c.uid);
    const apt = room ? apartments.find(a => a.id === room.apartmentId) : null;
    const searchLower = searchTerm.toLowerCase();

    return (
      (c.displayName || '').toLowerCase().includes(searchLower) ||
      (c.email || '').toLowerCase().includes(searchLower) ||
      (c.phoneNumber && c.phoneNumber.includes(searchLower)) ||
      (apt && apt.name.toLowerCase().includes(searchLower)) ||
      (room && room.roomNumber.includes(searchLower))
    );
  });

  return (
    <div className="space-y-8 py-2">
      
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-[28px] font-black text-foreground tracking-tight leading-tight">
            Customer Directory (CRM)
          </h1>
          <p className="text-[14px] text-muted-foreground font-medium mt-0.5">
            Detailed profiles, lease logs, agreement statuses, and payment histories for all your tenants.
          </p>
        </div>
        <div className="inline-flex items-center px-3 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-xs font-bold w-fit">
          <span>{ownerCustomers.length} Active Tenants</span>
        </div>
      </div>

      {/* ── SEARCH BAR ────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border p-4 rounded-3xl shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by customer name, phone, email, apartment or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl py-2 pl-9 pr-4 text-xs font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* ── CRM LIST TABLE ─────────────────────────────────────────────────── */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-16 text-center shadow-sm space-y-3">
          <Users className="mx-auto text-slate-350 w-16 h-16" />
          <h3 className="text-[20px] font-bold text-foreground">No Tenants Found</h3>
          <p className="text-[14px] text-muted-foreground font-medium">Add customers, approve visit requests, or adjust filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-[14px] border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                <th className="p-4">Tenant Details</th>
                <th className="p-4">Apartment & Room</th>
                <th className="p-4">Lease Status</th>
                <th className="p-4">Rent Paid</th>
                <th className="p-4">Electricity Paid</th>
                <th className="p-4">Move In Date</th>
                <th className="p-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-foreground font-semibold">
              {filteredCustomers.map((customer) => {
                const room = ownerRooms.find(r => r.currentCustomerId === customer.uid);
                const apt = room ? apartments.find(a => a.id === room.apartmentId) : null;

                // Rent Status Calculation (Latest invoice)
                const cRentPayments = payments.filter(p => p.customerId === customer.uid && p.type === 'rent');
                const rentPaid = cRentPayments.length > 0 
                  ? (cRentPayments.some(p => p.status === 'pending' || p.status === 'overdue') ? 'pending' : 'paid')
                  : 'N/A';

                // Electricity Status Calculation (Latest invoice)
                const cElectricityBills = bills.filter(b => b.customerId === customer.uid);
                const electricityPaid = cElectricityBills.length > 0 
                  ? (cElectricityBills.some(b => b.status === 'unpaid') ? 'pending' : 'paid')
                  : 'N/A';

                // Move In Date (Mocked or start date of lease agreement)
                const moveInDate = customer.leaseStartDate || 'N/A';

                return (
                  <tr key={customer.uid} className="hover:bg-muted/40 transition-colors">
                    {/* 1. Profile Photo and details */}
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-500/10 text-brand-600 border border-brand-500/20 text-xs font-black flex items-center justify-center uppercase">
                        {customer.displayName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <span className="font-extrabold text-[16px] block">{customer.displayName}</span>
                        <span className="text-[12px] text-muted-foreground block font-medium mt-0.5">{customer.email}</span>
                      </div>
                    </td>

                    {/* 2. Apartment and Room */}
                    <td className="p-4">
                      {room && apt ? (
                        <div>
                          <span className="text-foreground block">{apt.name}</span>
                          <span className="text-[12px] text-muted-foreground block font-medium mt-0.5">Room {room.roomNumber}</span>
                        </div>
                      ) : (
                        <span className="text-[12px] text-muted-foreground font-medium">Unallocated</span>
                      )}
                    </td>

                    {/* 3. Lease Agreement Status */}
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                        customer.leaseStatus === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                      }`}>
                        {customer.leaseStatus || 'Inactive'}
                      </span>
                    </td>

                    {/* 4. Rent Status */}
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                        rentPaid === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : rentPaid === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-slate-100 text-muted-foreground border-border'
                      }`}>
                        {rentPaid}
                      </span>
                    </td>

                    {/* 5. Electricity Status */}
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                        electricityPaid === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                          : electricityPaid === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-slate-100 text-muted-foreground border-border'
                      }`}>
                        {electricityPaid}
                      </span>
                    </td>

                    {/* 6. Move In Date */}
                    <td className="p-4 text-[12px] text-muted-foreground font-semibold">
                      {moveInDate}
                    </td>

                    {/* 7. View profile action */}
                    <td className="p-4 text-right">
                      <Link 
                        to={`/owner/customers/${customer.uid}`}
                        className="inline-flex items-center gap-1 text-brand-650 font-bold text-[12px] hover:underline"
                      >
                        Profile <ChevronRight size={14} />
                      </Link>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
