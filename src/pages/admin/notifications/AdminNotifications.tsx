import React, { useState, useEffect } from 'react';
import { 
  Bell, Send, Users, User, Building, AlertTriangle,
  Megaphone, Wrench, CheckCircle, Clock, Trash2
} from 'lucide-react';
import { sendBroadcastNotification, getAllNotifications, getUsers } from '../../../firebase/db';
import { useAuth } from '../../../context/AuthContext';
import { Notification, UserProfile } from '../../../types';

const typeOptions = [
  { value: 'announcement', label: 'Announcement', icon: <Megaphone size={14} />, color: 'text-brand-400' },
  { value: 'maintenance', label: 'Maintenance Notice', icon: <Wrench size={14} />, color: 'text-amber-400' },
  { value: 'bill', label: 'Rent Reminder', icon: <CheckCircle size={14} />, color: 'text-emerald-400' },
  { value: 'emergency', label: 'Emergency Alert', icon: <AlertTriangle size={14} />, color: 'text-red-400' },
  { value: 'system', label: 'System Notice', icon: <Bell size={14} />, color: 'text-blue-400' },
];

const typeColors: Record<string, string> = {
  announcement: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
  maintenance: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  bill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  emergency: 'bg-red-500/10 text-red-400 border-red-500/20',
  system: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  request: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  complaint: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export const AdminNotifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ count: number } | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'compose' | 'history'>('compose');

  const [form, setForm] = useState({
    targetRole: 'all' as 'all' | 'owner' | 'customer',
    type: 'announcement' as Notification['type'],
    title: '',
    message: '',
  });

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await getAllNotifications();
      setNotifications(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const count = await sendBroadcastNotification(
        form.targetRole,
        form.title,
        form.message,
        form.type,
        user?.uid || ''
      );
      setSent({ count });
      setForm(f => ({ ...f, title: '', message: '' }));
      await loadNotifications();
      setTimeout(() => setSent(null), 5000);
    } catch (e: any) {
      setError(e.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  const adminSentCount = notifications.filter(n => n.sentByAdminId).length;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell size={24} className="text-brand-500" /> Notifications Center
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Compose and broadcast notifications to owners and customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Notifications', value: notifications.length, color: 'text-brand-400', icon: <Bell size={16}/> },
          { label: 'Admin Broadcasts', value: adminSentCount, color: 'text-emerald-400', icon: <Send size={16}/> },
          { label: 'Unread', value: unreadCount, color: 'text-amber-400', icon: <Clock size={16}/> },
          { label: 'Read', value: notifications.length - unreadCount, color: 'text-blue-400', icon: <CheckCircle size={16}/> },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={s.color}>{s.icon}</div>
            <div className="text-2xl font-bold text-foreground mt-1">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {[
          { key: 'compose', label: 'Compose', icon: <Send size={14}/> },
          { key: 'history', label: 'History', icon: <Clock size={14}/> },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compose Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSend} className="bg-card border border-border rounded-2xl p-6 space-y-5">
              <h2 className="font-bold text-foreground">Compose Notification</h2>

              {sent && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  Successfully sent to {sent.count} recipient{sent.count !== 1 ? 's' : ''}!
                </div>
              )}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Send To</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'Everyone', icon: <Users size={16}/> },
                    { value: 'owner', label: 'Owners Only', icon: <Building size={16}/> },
                    { value: 'customer', label: 'Customers Only', icon: <User size={16}/> },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, targetRole: opt.value as any }))}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm font-medium transition-colors ${
                        form.targetRole === opt.value
                          ? 'bg-brand-600/10 border-brand-500/50 text-brand-400'
                          : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Notification Type</label>
                <div className="flex flex-wrap gap-2">
                  {typeOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: opt.value as any }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        form.type === opt.value
                          ? `${typeColors[opt.value]} border`
                          : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Notification title..."
                  maxLength={100}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Message *</label>
                <textarea
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Write your notification message here..."
                  rows={5}
                  maxLength={500}
                  className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500 resize-none"
                />
                <div className="text-xs text-muted-foreground text-right mt-1">{form.message.length}/500</div>
              </div>

              <button
                type="submit"
                disabled={sending || !form.title || !form.message}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Send size={16} /> {sending ? 'Sending...' : 'Send Notification'}
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground text-sm mb-3">Preview</h3>
              <div className={`p-4 rounded-xl border ${typeColors[form.type] || 'bg-muted border-border text-muted-foreground'}`}>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">{typeOptions.find(t => t.value === form.type)?.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">{form.title || 'Notification Title'}</div>
                    <div className="text-xs mt-1 opacity-80">{form.message || 'Your message will appear here...'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                → Will be sent to: <span className="font-semibold text-foreground capitalize">{form.targetRole === 'all' ? 'All Users (Owners + Customers)' : `${form.targetRole}s only`}</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h3 className="font-bold text-foreground text-sm mb-3">Notification Types</h3>
              <div className="space-y-2">
                {typeOptions.map(opt => (
                  <div key={opt.value} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${typeColors[opt.value]}`}>
                    {opt.icon} {opt.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">Notification History</h2>
            <span className="text-xs text-muted-foreground">{notifications.length} total</span>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell size={32} className="mx-auto mb-3 opacity-30" />
              <p>No notifications sent yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(n => (
                <div key={n.id} className={`px-5 py-4 hover:bg-muted/30 transition-colors ${!n.read ? 'bg-brand-500/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold border capitalize ${typeColors[n.type] || 'bg-muted border-border text-muted-foreground'}`}>
                      {n.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>To: {n.recipientId}</span>
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        {n.sentByAdminId && <span className="text-brand-400">Admin Broadcast</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
