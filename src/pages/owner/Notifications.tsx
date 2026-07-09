import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getNotifications, markNotificationRead } from '../../firebase/db';
import { Notification } from '../../types';
import { Bell, CreditCard, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';

export const OwnerNotifications: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all'|'unread'|'read'>('all');

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const all = await getNotifications(user.uid);
      setNotifications(all.sort((a,b) => b.createdAt - a.createdAt));
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };

  const markRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n));
    } catch(e) { console.error(e); }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markNotificationRead(n.id)));
    setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const typeIcon = (type: string) => {
    if (type === 'bill') return <CreditCard size={16}/>;
    if (type === 'complaint') return <AlertCircle size={16}/>;
    if (type === 'request') return <Info size={16}/>;
    return <Bell size={16}/>;
  };

  const typeColor = (type: string) => {
    if (type === 'bill') return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400';
    if (type === 'complaint') return 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400';
    if (type === 'request') return 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400';
    return 'bg-table-header text-muted-foreground';
  };

  const unreadCount = notifications.filter(n=>!n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={loadData} className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:bg-table-row-hover transition-colors">
            <RefreshCw size={16}/>
          </button>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm">
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-card border border-border rounded-2xl p-1.5 w-fit shadow-sm">
        {(['all','unread','read'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-xl text-sm font-bold capitalize transition-all duration-150 ${filter===f ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {f} {f==='unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="h-48 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-16 text-center shadow-sm">
          <Bell size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3"/>
          <p className="text-sm font-semibold text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`group relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
                n.read
                  ? 'bg-card border-border'
                  : 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800/40 hover:bg-blue-50 dark:hover:bg-blue-950/20'
              }`}
            >
              {!n.read && (
                <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"/>
              )}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${typeColor(n.type)}`}>
                {typeIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${n.read ? 'text-foreground' : 'text-foreground'}`}>{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5 font-medium">{new Date(n.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {!n.read && (
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 self-center">
                  Mark read
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
