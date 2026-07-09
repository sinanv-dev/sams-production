import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribeToNotifications, markNotificationRead } from '../../firebase/db';
import { Notification } from '../../types';
import { Bell, Check, CreditCard, Zap, Wrench, Info, Filter } from 'lucide-react';

type FilterType = 'all' | 'unread' | 'payment' | 'maintenance' | 'general';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
);

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

function notifIcon(title: string): React.ReactNode {
  const t = title.toLowerCase();
  if (t.includes('rent') || t.includes('payment')) return <CreditCard size={14} className="text-emerald-500" />;
  if (t.includes('electricity') || t.includes('bill')) return <Zap size={14} className="text-amber-500" />;
  if (t.includes('complaint') || t.includes('maintenance') || t.includes('problem')) return <Wrench size={14} className="text-rose-500" />;
  return <Bell size={14} className="text-brand-500" />;
}

function getCategory(n: Notification): FilterType {
  const t = (n.title + ' ' + n.message).toLowerCase();
  if (t.includes('rent') || t.includes('payment')) return 'payment';
  if (t.includes('complaint') || t.includes('maintenance') || t.includes('problem')) return 'maintenance';
  return 'general';
}

export const CustomerNotifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToNotifications(user.uid, notifs => {
      setNotifications(notifs.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleMarkRead = async (id: string) => {
    if (markingId) return;
    setMarkingId(id);
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      await markNotificationRead(n.id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return getCategory(n) === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { key: 'payment', label: 'Payments' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'general', label: 'General' },
  ];

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 rounded-xl" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
            <Bell size={18} /> Notifications
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline px-3 py-1.5 rounded-lg hover:bg-brand-500/5 transition-colors"
          >
            <Check size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={13} className="text-muted-foreground flex-shrink-0" />
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
              filter === f.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto bg-muted rounded-xl flex items-center justify-center">
            <Bell size={20} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-foreground">No notifications</p>
          <p className="text-xs text-muted-foreground">
            {filter === 'unread' ? "You're all caught up!" : 'Nothing to show here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                n.read
                  ? 'border-border bg-card'
                  : 'border-brand-500/25 bg-brand-500/5 dark:bg-brand-500/10'
              }`}
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                n.read ? 'bg-muted border-border' : 'bg-brand-500/10 border-brand-500/20'
              }`}>
                {notifIcon(n.title)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold ${n.read ? 'text-foreground' : 'text-foreground'}`}>
                    {n.title}
                    {!n.read && (
                      <span className="inline-block ml-2 w-1.5 h-1.5 bg-brand-500 rounded-full align-middle" />
                    )}
                  </p>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
              </div>

              {/* Mark read */}
              {!n.read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  disabled={markingId === n.id}
                  className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center transition-colors disabled:opacity-50"
                  title="Mark as read"
                >
                  <Check size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
