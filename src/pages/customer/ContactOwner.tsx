import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToRooms, subscribeToApartments, subscribeToUsers
} from '../../firebase/db';
import { Room, Apartment, UserProfile } from '../../types';
import {
  MessageSquare, Phone, Mail, Building2, Shield,
  Copy, CheckCheck, ExternalLink, AlertCircle
} from 'lucide-react';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
);

export const CustomerContactOwner: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedRoom, setAssignedRoom] = useState<Room | null>(null);
  const [assignedApt, setAssignedApt] = useState<Apartment | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let rooms: Room[] = [], apts: Apartment[] = [], users: UserProfile[] = [];
    let loaded = 0;

    const resolve = () => {
      if (++loaded < 3) return;
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
      setLoading(false);
    };

    const u1 = subscribeToRooms(r => { rooms = r; resolve(); });
    const u2 = subscribeToApartments(a => { apts = a; resolve(); });
    const u3 = subscribeToUsers(u => { users = u; resolve(); });
    return () => [u1, u2, u3].forEach(fn => fn());
  }, [user]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    );
  }

  if (!assignedRoom || !assignedApt || !owner) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-muted rounded-2xl flex items-center justify-center">
            <MessageSquare size={24} className="text-muted-foreground" />
          </div>
          <h2 className="text-base font-bold text-foreground">No Owner Info Available</h2>
          <p className="text-xs text-muted-foreground">
            Owner contact details will appear here once you're assigned to a room.
          </p>
        </div>
      </div>
    );
  }

  const whatsappLink = owner.phoneNumber
    ? `https://wa.me/${owner.phoneNumber.replace(/\D/g, '')}`
    : null;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Header */}
      <div>
        <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
          <MessageSquare size={18} /> Contact Owner
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Reach out to your property owner directly.
        </p>
      </div>

      {/* Owner Profile Card */}
      <div className="bg-card border border-border rounded-3xl p-6">
        <div className="flex items-center gap-4 pb-5 border-b border-border">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-amber-500/20 flex-shrink-0">
            {owner.displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-base font-black text-foreground">{owner.displayName}</h2>
            <p className="text-xs text-muted-foreground font-medium">Property Owner</p>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Active
            </span>
          </div>
        </div>

        {/* Property */}
        <div className="py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
            <Building2 size={15} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">{assignedApt.name}</p>
            <p className="text-[11px] text-muted-foreground">Room {assignedRoom.roomNumber}</p>
          </div>
        </div>

        {/* Contact actions */}
        <div className="pt-4 space-y-3">
          {/* Email */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                <Mail size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Email</p>
                <p className="text-xs font-bold text-foreground truncate">{owner.email}</p>
              </div>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                onClick={() => handleCopy(owner.email, 'email')}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                title="Copy"
              >
                {copied === 'email' ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
              <a
                href={`mailto:${owner.email}`}
                className="w-7 h-7 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-colors"
                title="Send Email"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Phone */}
          {owner.phoneNumber && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</p>
                  <p className="text-xs font-bold text-foreground">{owner.phoneNumber}</p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleCopy(owner.phoneNumber || '', 'phone')}
                  className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy"
                >
                  {copied === 'phone' ? <CheckCheck size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
                <a
                  href={`tel:${owner.phoneNumber}`}
                  className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-colors"
                  title="Call"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          )}

          {/* WhatsApp */}
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 hover:bg-[#25D366]/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[#25D366]/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Message on WhatsApp</p>
                <p className="text-[11px] text-muted-foreground">{owner.phoneNumber}</p>
              </div>
              <ExternalLink size={13} className="ml-auto text-[#25D366]" />
            </a>
          )}
        </div>
      </div>

      {/* Emergency note */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
        <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-foreground">For emergencies</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            For urgent matters (water leaks, security issues), call the owner directly.
            For maintenance requests, use the <strong>Maintenance</strong> page to keep a record.
          </p>
        </div>
      </div>

      {/* Chat coming soon */}
      <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center space-y-2">
        <div className="w-10 h-10 mx-auto bg-muted rounded-xl flex items-center justify-center">
          <MessageSquare size={18} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-bold text-foreground">In-app Chat</p>
        <p className="text-xs text-muted-foreground">Direct messaging with your property owner is coming soon.</p>
        <span className="inline-block text-[10px] font-black px-2.5 py-1 bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-full border border-brand-500/20">
          Coming Soon
        </span>
      </div>

    </div>
  );
};
