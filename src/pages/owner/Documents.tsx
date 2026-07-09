import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Download, Search, Eye, File } from 'lucide-react';

export const OwnerDocuments: React.FC = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all'|'lease'|'id_proof'|'other'>('all');

  useEffect(() => { setLoading(false); }, [user]);

  const loadData = async () => {};

  const filtered = docs.filter(d => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || d.type === typeFilter;
    return matchSearch && matchType;
  });

  const statusBadge = (status: string) => {
    if (status === 'approved') return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40';
    if (status === 'rejected') return 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40';
    return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40';
  };

  const typeLabel = (t: string) => {
    if (t === 'lease') return 'Rental Agreement';
    if (t === 'id_proof') return 'ID Proof';
    return 'Other';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Documents</h1>
        <p className="text-muted-foreground text-sm font-medium mt-0.5">Rental agreements, customer ID proofs, and apartment documents.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Rental Agreements', count: docs.filter(d=>d.type==='lease').length, color: 'blue' },
          { label: 'ID Proofs', count: docs.filter(d=>d.type==='id_proof').length, color: 'emerald' },
          { label: 'Other Documents', count: docs.filter(d=>d.type==='other').length, color: 'purple' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl font-black text-foreground">{s.count}</p>
            <p className="text-xs font-semibold text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents..." className="w-full pl-9 pr-4 py-2 text-sm bg-table-header border border-border rounded-xl focus:outline-none focus:border-emerald-500 text-foreground"/>
        </div>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value as any)} className="px-3 py-2 text-sm bg-table-header border border-border rounded-xl focus:outline-none text-foreground">
          <option value="all">All Types</option>
          <option value="lease">Rental Agreements</option>
          <option value="id_proof">ID Proofs</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Document Cards */}
      {loading ? (
        <div className="h-48 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-16 text-center shadow-sm">
          <FileText size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3"/>
          <p className="text-sm font-semibold text-muted-foreground">No documents found</p>
          <p className="text-xs text-muted-foreground mt-1">Documents submitted by customers will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(d => (
            <div key={d.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <File size={20}/>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${statusBadge(d.status)}`}>{d.status}</span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground leading-tight">{d.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{typeLabel(d.type)}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">Uploaded: {new Date(d.createdAt).toLocaleDateString('en-IN')}</p>
              {d.fileUrl && (
                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-table-header border border-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <Eye size={13}/> View Document
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
