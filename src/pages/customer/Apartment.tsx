import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToRooms, subscribeToApartments, subscribeToUsers, subscribeToPayments
} from '../../firebase/db';
import { Room, Apartment, UserProfile, Payment } from '../../types';
import {
  Building2, MapPin, Phone, Mail, Calendar, Shield,
  Wifi, Wind, Car, Utensils, Dumbbell, Droplets,
  ExternalLink, ChevronRight, Home, Layers, Key, IndianRupee
} from 'lucide-react';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
);

function amenityIcon(a: string): React.ReactNode {
  const lower = a.toLowerCase();
  if (lower.includes('wifi') || lower.includes('internet')) return <Wifi size={14} />;
  if (lower.includes('ac') || lower.includes('air')) return <Wind size={14} />;
  if (lower.includes('parking') || lower.includes('car')) return <Car size={14} />;
  if (lower.includes('kitchen') || lower.includes('cook')) return <Utensils size={14} />;
  if (lower.includes('gym') || lower.includes('fitness')) return <Dumbbell size={14} />;
  if (lower.includes('water') || lower.includes('24')) return <Droplets size={14} />;
  return <Shield size={14} />;
}

const InfoRow: React.FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60 last:border-0">
    <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">{label}</span>
    <span className="text-xs font-bold text-foreground text-right">{value}</span>
  </div>
);

export const CustomerApartment: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedRoom, setAssignedRoom] = useState<Room | null>(null);
  const [assignedApt, setAssignedApt] = useState<Apartment | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [customerProfile, setCustomerProfile] = useState<UserProfile | null>(null);
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!user) return;
    let rooms: Room[] = [], apts: Apartment[] = [], users: UserProfile[] = [], payments: Payment[] = [];
    let loaded = 0;

    const resolve = () => {
      if (++loaded < 4) return;
      const room = rooms.find(r => r.currentCustomerId === user.uid) || null;
      const apt = room ? apts.find(a => a.id === room.apartmentId) || null : null;
      setAssignedRoom(room);
      setAssignedApt(apt);

      if (apt) {
        const ownerId = apt.ownerId || (apt.id === 'apt-3' ? 'owner-jane-id' : 'owner-john-id');
        setOwner(users.find(u => u.uid === ownerId) || {
          uid: ownerId,
          email: ownerId === 'owner-jane-id' ? 'jane.owner@sams.com' : 'john.owner@sams.com',
          displayName: ownerId === 'owner-jane-id' ? 'Jane Owner' : 'John Owner',
          role: 'owner',
          phoneNumber: ownerId === 'owner-jane-id' ? '+1 (555) 222-3333' : '+1 (555) 111-2222',
          createdAt: Date.now(),
          status: 'active'
        });
      }

      const cust = users.find(u => u.uid === user.uid);
      setCustomerProfile(cust || null);

      const myPayments = payments.filter(p => p.customerId === user.uid && p.type === 'rent')
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
      setLatestPayment(myPayments[0] || null);
      setLoading(false);
    };

    const u1 = subscribeToRooms(r => { rooms = r; resolve(); });
    const u2 = subscribeToApartments(a => { apts = a; resolve(); });
    const u3 = subscribeToUsers(u => { users = u; resolve(); });
    const u4 = subscribeToPayments(p => { payments = p; resolve(); });
    return () => [u1, u2, u3, u4].forEach(fn => fn());
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-56 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!assignedRoom || !assignedApt) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center">
            <Building2 size={28} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground">No Apartment Assigned</h2>
          <p className="text-sm text-muted-foreground">
            Once you're assigned a room, your apartment details will appear here.
          </p>
        </div>
      </div>
    );
  }

  const leaseStart = customerProfile?.leaseStartDate;
  const leaseEnd = customerProfile?.leaseEndDate;
  const deposit = customerProfile?.leaseSecurityDeposit || assignedRoom.securityDeposit;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Hero */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        {assignedApt.imageUrl || assignedApt.coverImage ? (
          <div className="h-48 sm:h-60 bg-muted overflow-hidden">
            <img
              src={assignedApt.coverImage || assignedApt.imageUrl}
              alt={assignedApt.name}
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        ) : (
          <div className="h-48 sm:h-60 bg-gradient-to-br from-brand-500/20 to-brand-700/10 flex items-center justify-center">
            <Building2 size={48} className="text-brand-500/40" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-black text-foreground tracking-tight">{assignedApt.name}</h1>
              <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                <MapPin size={13} />
                <span className="text-xs font-medium">{assignedApt.address}</span>
              </div>
            </div>
            <span className="flex-shrink-0 text-xs font-black px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
              Active Lease
            </span>
          </div>
          {assignedApt.description && (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{assignedApt.description}</p>
          )}
          {assignedApt.googleMapsLink && (
            <a
              href={assignedApt.googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              <MapPin size={12} /> View on Maps <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Room Details */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Home size={16} />
            </div>
            <h2 className="text-sm font-bold text-foreground">Room Details</h2>
          </div>
          <InfoRow label="Room Number" value={assignedRoom.roomNumber} />
          <InfoRow label="Room Type" value={assignedRoom.roomType || 'Standard'} />
          {assignedRoom.floor && <InfoRow label="Floor" value={`Floor ${assignedRoom.floor}`} />}
          {assignedRoom.size && <InfoRow label="Size" value={assignedRoom.size} />}
          {assignedRoom.wing && <InfoRow label="Wing" value={assignedRoom.wing} />}
          <InfoRow label="Monthly Rent" value={`₹${assignedRoom.rentAmount.toLocaleString('en-IN')}`} />
          {deposit && <InfoRow label="Security Deposit" value={`₹${Number(deposit).toLocaleString('en-IN')}`} />}
          {assignedRoom.features && assignedRoom.features.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Room Features</p>
              <div className="flex flex-wrap gap-1.5">
                {assignedRoom.features.map(f => (
                  <span key={f} className="text-[11px] font-bold px-2 py-0.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full border border-brand-500/20">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lease Info */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Key size={16} />
            </div>
            <h2 className="text-sm font-bold text-foreground">Lease Summary</h2>
          </div>
          {leaseStart && <InfoRow label="Lease Start" value={new Date(leaseStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />}
          {leaseEnd && <InfoRow label="Lease End" value={new Date(leaseEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />}
          <InfoRow label="Monthly Rent" value={`₹${assignedRoom.rentAmount.toLocaleString('en-IN')}`} />
          {deposit && <InfoRow label="Deposit Paid" value={`₹${Number(deposit).toLocaleString('en-IN')}`} />}
          <InfoRow
            label="Status"
            value={
              <span className="text-emerald-600 dark:text-emerald-400 font-black">Active</span>
            }
          />
          {customerProfile?.leaseAgreementNumber && (
            <InfoRow label="Agreement No." value={customerProfile.leaseAgreementNumber} />
          )}
        </div>

        {/* Owner Info */}
        {owner && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Shield size={16} />
              </div>
              <h2 className="text-sm font-bold text-foreground">Owner Information</h2>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black flex items-center justify-center text-base border border-amber-500/20">
                {owner.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{owner.displayName}</p>
                <p className="text-xs text-muted-foreground">Property Owner</p>
              </div>
            </div>
            <div className="space-y-2">
              <a href={`mailto:${owner.email}`} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted transition-colors group">
                <Mail size={14} className="text-muted-foreground group-hover:text-brand-500" />
                <span className="text-xs font-semibold text-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400">{owner.email}</span>
              </a>
              {owner.phoneNumber && (
                <a href={`tel:${owner.phoneNumber}`} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted transition-colors group">
                  <Phone size={14} className="text-muted-foreground group-hover:text-emerald-500" />
                  <span className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{owner.phoneNumber}</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Amenities */}
        {assignedApt.amenities && assignedApt.amenities.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Layers size={16} />
              </div>
              <h2 className="text-sm font-bold text-foreground">Amenities</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {assignedApt.amenities.map(a => (
                <div key={a} className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-xl">
                  <div className="text-muted-foreground flex-shrink-0">{amenityIcon(a)}</div>
                  <span className="text-xs font-semibold text-foreground">{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Rules */}
      {assignedApt.rules && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield size={14} className="text-rose-500" /> House Rules
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{assignedApt.rules}</p>
        </div>
      )}

      {/* Gallery */}
      {assignedApt.galleryImages && assignedApt.galleryImages.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-3">Gallery</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {assignedApt.galleryImages.map((img, i) => (
              <div key={i} className="aspect-video rounded-xl overflow-hidden bg-muted">
                <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
