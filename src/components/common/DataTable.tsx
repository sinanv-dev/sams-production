import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight,
  Download, SlidersHorizontal, X, Check, MoreHorizontal
} from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  hidden?: boolean;
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger' | 'warning';
  action: (selectedRows: T[]) => void;
}

interface DataTableProps<T extends { id: string }> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  bulkActions?: BulkAction<T>[];
  onRowClick?: (row: T) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  pageSize?: number;
  exportFileName?: string;
  headerActions?: React.ReactNode;
  rowClassName?: (row: T) => string;
}

type SortDir = 'asc' | 'desc' | null;

function exportToCSV<T>(data: T[], columns: Column<T>[], filename: string) {
  const headers = columns.filter(c => !c.hidden).map(c => c.header).join(',');
  const rows = data.map(row =>
    columns
      .filter(c => !c.hidden)
      .map(c => {
        const val = (row as Record<string, unknown>)[c.key as string];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : String(val ?? '');
      })
      .join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataTable<T extends { id: string }>({
  data,
  columns: initialColumns,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys = [],
  bulkActions = [],
  onRowClick,
  emptyState,
  loading = false,
  pageSize: defaultPageSize = 10,
  exportFileName = 'export',
  headerActions,
  rowClassName,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    new Set(initialColumns.filter(c => c.hidden).map(c => String(c.key)))
  );
  const [showColToggle, setShowColToggle] = useState(false);

  const columns = initialColumns.filter(c => !hiddenCols.has(String(c.key)));

  const filtered = useMemo(() => {
    let result = [...data];
    if (query && searchKeys.length > 0) {
      const q = query.toLowerCase();
      result = result.filter(row =>
        searchKeys.some(k => String((row as Record<string, unknown>)[k as string] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const av = String((a as Record<string, unknown>)[sortKey] ?? '');
        const bv = String((b as Record<string, unknown>)[sortKey] ?? '');
        const num_a = Number(av), num_b = Number(bv);
        const cmp = isNaN(num_a) || isNaN(num_b) ? av.localeCompare(bv) : num_a - num_b;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, query, searchKeys, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey, sortDir]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map(r => r.id)));
    }
  };

  const selectedRows = data.filter(r => selected.has(r.id));

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown size={12} className="text-muted-foreground/40" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-brand-500" /> : <ChevronDown size={12} className="text-brand-500" />;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {searchable && (
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {/* Column visibility */}
          <div className="relative">
            <button
              onClick={() => setShowColToggle(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Columns</span>
            </button>
            {showColToggle && (
              <div className="absolute right-0 top-11 w-48 bg-card border border-border rounded-xl shadow-xl p-2 z-50">
                <p className="text-[10px] font-bold uppercase text-muted-foreground px-2 mb-1">Toggle Columns</p>
                {initialColumns.map(col => (
                  <button
                    key={String(col.key)}
                    onClick={() => setHiddenCols(prev => {
                      const next = new Set(prev);
                      next.has(String(col.key)) ? next.delete(String(col.key)) : next.add(String(col.key));
                      return next;
                    })}
                    className="flex items-center justify-between w-full px-2 py-1.5 rounded-lg hover:bg-muted text-sm text-foreground"
                  >
                    <span>{col.header}</span>
                    {!hiddenCols.has(String(col.key)) && <Check size={12} className="text-brand-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Export */}
          {exportFileName && (
            <button
              onClick={() => exportToCSV(filtered, columns, exportFileName)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Download size={15} />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {headerActions}
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && bulkActions.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-brand-600/10 border border-brand-500/30 animate-in slide-in-from-top-1 duration-200">
          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-2">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={() => { action.action(selectedRows); setSelected(new Set()); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  action.variant === 'danger'
                    ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                    : action.variant === 'warning'
                    ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                    : 'bg-brand-500/10 text-brand-600 hover:bg-brand-500/20'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-muted-foreground hover:text-foreground">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {bulkActions.length > 0 && (
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="w-4 h-4 rounded border border-border flex items-center justify-center bg-card hover:border-brand-500 transition-colors"
                    >
                      {selected.size === paginated.length && paginated.length > 0 && (
                        <Check size={10} className="text-brand-600" />
                      )}
                    </button>
                  </th>
                )}
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap ${col.width ?? ''} ${col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''}`}
                    onClick={col.sortable ? () => handleSort(String(col.key)) : undefined}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && <SortIcon colKey={String(col.key)} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-b-0">
                    {bulkActions.length > 0 && <td className="px-4 py-3.5"><div className="w-4 h-4 rounded bg-muted animate-pulse" /></td>}
                    {columns.map(col => (
                      <td key={String(col.key)} className="px-4 py-3.5">
                        <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)} className="px-4 py-16 text-center">
                    {emptyState ?? (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Search size={28} className="opacity-30" />
                        <p className="text-sm font-medium">No results found</p>
                        {query && <p className="text-xs">Try adjusting your search</p>}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map(row => (
                  <tr
                    key={row.id}
                    className={`border-b border-border/50 last:border-b-0 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-muted/40' : 'hover:bg-muted/20'} ${selected.has(row.id) ? 'bg-brand-500/5' : ''} ${rowClassName?.(row) ?? ''}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {bulkActions.length > 0 && (
                      <td className="px-4 py-3.5" onClick={e => { e.stopPropagation(); toggleSelect(row.id); }}>
                        <button className="w-4 h-4 rounded border border-border flex items-center justify-center bg-card hover:border-brand-500 transition-colors">
                          {selected.has(row.id) && <Check size={10} className="text-brand-600" />}
                        </button>
                      </td>
                    )}
                    {columns.map(col => (
                      <td key={String(col.key)} className="px-4 py-3.5 text-foreground">
                        {col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key as string] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-border bg-muted/20 flex-wrap gap-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-card border border-border rounded-lg px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-brand-500/30"
            >
              {[10, 25, 50, 100].map(n => <option key={n}>{n}</option>)}
            </select>
            <span>of <strong>{filtered.length}</strong> entries</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-2 py-1 rounded-lg text-xs border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg text-xs border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium border transition-colors ${p === page ? 'bg-brand-600 text-white border-brand-600' : 'border-border bg-card hover:bg-muted text-foreground'}`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg text-xs border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="px-2 py-1 rounded-lg text-xs border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
