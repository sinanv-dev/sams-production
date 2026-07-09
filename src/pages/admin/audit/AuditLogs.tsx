import React, { useState, useEffect } from 'react';
import { ScrollText, Search, Filter, Download, ChevronRight } from 'lucide-react';
import { getAuditLogs } from '../../../firebase/db';
import { AuditLog } from '../../../types';

const entityTypeColors: Record<string, string> = {
  user: 'bg-brand-500/10 text-brand-400',
  apartment: 'bg-blue-500/10 text-blue-400',
  room: 'bg-emerald-500/10 text-emerald-400',
  payment: 'bg-yellow-500/10 text-yellow-400',
  complaint: 'bg-orange-500/10 text-orange-400',
  request: 'bg-purple-500/10 text-purple-400',
  notification: 'bg-pink-500/10 text-pink-400',
  system: 'bg-muted text-muted-foreground',
};

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = logs.filter(l => {
    const matchSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.adminName.toLowerCase().includes(search.toLowerCase()) ||
      (l.entityName || '').toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === 'all' || l.entityType === entityFilter;
    return matchSearch && matchEntity;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleExportCSV = () => {
    const headers = 'Timestamp,Admin,Action,Entity Type,Entity ID,Old Value,New Value';
    const rows = filtered.map(l => [
      new Date(l.timestamp).toISOString(),
      l.adminName,
      `"${l.action}"`,
      l.entityType,
      l.entityId || '',
      l.oldValue || '',
      l.newValue || ''
    ].join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText size={24} className="text-brand-500" /> Audit Logs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Complete record of all admin actions across the platform</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 border border-border rounded-xl text-sm text-foreground transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Actions', value: logs.length },
          { label: 'User Actions', value: logs.filter(l => l.entityType === 'user').length },
          { label: 'Room Actions', value: logs.filter(l => l.entityType === 'room').length },
          { label: 'Today', value: logs.filter(l => l.timestamp > Date.now() - 86400000).length },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by action, admin, or entity..."
            className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={entityFilter}
          onChange={e => { setEntityFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Types</option>
          {['user', 'apartment', 'room', 'payment', 'complaint', 'request', 'notification', 'system'].map(t => (
            <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center">
                  <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">
                  <ScrollText size={36} className="mx-auto mb-3 opacity-30" />
                  {logs.length === 0 ? 'No audit logs recorded yet. Admin actions will appear here.' : 'No results match your filter.'}
                </td></tr>
              ) : paginated.map(log => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div className="opacity-70">{new Date(log.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground text-sm">{log.adminName}</div>
                    <div className="text-xs text-muted-foreground">{log.adminId}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-foreground text-sm">{log.action}</p>
                    {log.entityName && <p className="text-xs text-muted-foreground">{log.entityName}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${entityTypeColors[log.entityType] || 'bg-muted text-muted-foreground'}`}>
                      {log.entityType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.oldValue && (
                      <div className="text-red-400 line-clamp-1">- {log.oldValue}</div>
                    )}
                    {log.newValue && (
                      <div className="text-emerald-400 line-clamp-1">+ {log.newValue}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {filtered.length} records · Page {page} of {totalPages}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    p === page ? 'bg-brand-600 text-white' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
