import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  subscribeToUsers, updateUserProfile, getApartments, deleteUser
} from '../../../firebase/db';
import { UserProfile, Apartment } from '../../../types';
import {
  Plus, Mail, Phone, Building, Eye, Edit2, Trash2,
  Lock, Unlock, UserCircle, Download, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { DataTable, Column, BulkAction } from '../../../components/common/DataTable';
import { SkeletonPage } from '../../../components/common/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

interface OwnerRow extends UserProfile {
  id: string;
  propertiesCount: number;
}

export const OwnerList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<OwnerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUsers(allUsers => {
      // Map uid → propertiesCount
      const owners = allUsers.filter(u => u.role === 'owner');
      setRows(
        owners.map(o => ({
          ...o,
          id: o.uid,
          propertiesCount: apartments.filter(a => a.ownerId === o.uid).length,
        }))
      );
      setLoading(false);
    });
    loadApartments();
    return () => unsub();
  }, []);

  const loadApartments = async () => {
    try {
      const data = await getApartments();
      setApartments(data);
    } catch { /* silent */ }
  };

  const handleToggleStatus = async (row: OwnerRow) => {
    const next = row.status === 'active' ? 'suspended' : 'active';
    try {
      await updateUserProfile(row.uid, { status: next });
      success(`Owner ${next === 'active' ? 'Activated' : 'Suspended'}`, `${row.displayName} is now ${next}.`);
    } catch {
      error('Update failed', 'Could not change owner status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.uid, user?.uid ?? 'admin', user?.displayName ?? 'Admin', deleteTarget.displayName);
      success('Owner Deleted', `${deleteTarget.displayName} has been removed.`);
      setDeleteTarget(null);
    } catch {
      error('Delete failed', 'Could not delete owner.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkSuspend = async (selected: OwnerRow[]) => {
    for (const row of selected) {
      await updateUserProfile(row.uid, { status: 'suspended' }).catch(() => {});
    }
    success('Bulk Suspended', `${selected.length} owners suspended.`);
  };

  const handleBulkActivate = async (selected: OwnerRow[]) => {
    for (const row of selected) {
      await updateUserProfile(row.uid, { status: 'active' }).catch(() => {});
    }
    success('Bulk Activated', `${selected.length} owners activated.`);
  };

  const stats = {
    total: rows.length,
    active: rows.filter(r => r.status === 'active').length,
    suspended: rows.filter(r => r.status === 'suspended').length,
  };

  const columns: Column<OwnerRow>[] = [
    {
      key: 'displayName',
      header: 'Owner',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {row.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/admin/owners/${row.uid}`)}
              className="font-semibold text-foreground hover:text-brand-600 transition-colors text-sm"
            >
              {row.displayName}
            </button>
            <p className="text-xs text-muted-foreground truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      header: 'Contact',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Phone size={11} /> {row.phoneNumber || '—'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail size={11} /> {row.email}
          </div>
        </div>
      ),
      hidden: true,
    },
    {
      key: 'propertiesCount',
      header: 'Properties',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Building size={13} className="text-muted-foreground" />
          <span>{row.propertiesCount}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (row) => (
        row.status === 'active'
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 size={10} /> Active</span>
          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-red-500/10 text-red-600 border-red-500/20"><XCircle size={10} /> Suspended</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (row) => <span className="text-xs text-muted-foreground">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'uid',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/admin/owners/${row.uid}`)} className="p-1.5 rounded-lg text-muted-foreground hover:text-brand-600 hover:bg-brand-500/10 transition-colors" title="View">
            <Eye size={14} />
          </button>
          <button onClick={() => navigate(`/admin/owners/${row.uid}/edit`)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
            <Edit2 size={14} />
          </button>
          <button onClick={() => handleToggleStatus(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors" title="Toggle Status">
            {row.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-500/10 transition-colors" title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const bulkActions: BulkAction<OwnerRow>[] = [
    { label: 'Activate', icon: <Unlock size={12} />, action: handleBulkActivate },
    { label: 'Suspend', icon: <Lock size={12} />, variant: 'warning', action: handleBulkSuspend },
  ];

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserCircle size={16} className="text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Owner Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage all property owners on the platform</p>
        </div>
        <Link
          to="/admin/owners/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5"
        >
          <Plus size={16} /> Add Owner
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Owners</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-xs text-emerald-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <p className="text-xs text-red-600 mb-1">Suspended</p>
          <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        data={rows}
        columns={columns}
        searchable
        searchPlaceholder="Search owners by name or email..."
        searchKeys={['displayName', 'email', 'phoneNumber']}
        bulkActions={bulkActions}
        onRowClick={row => navigate(`/admin/owners/${row.uid}`)}
        exportFileName="owners-export"
        pageSize={10}
        emptyState={
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <UserCircle size={36} className="opacity-20" />
            <p className="text-sm font-medium">No owners yet</p>
            <Link to="/admin/owners/new" className="text-xs text-brand-500 font-semibold hover:text-brand-600">
              + Add first owner
            </Link>
          </div>
        }
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Owner Account"
        message={`Permanently delete "${deleteTarget?.displayName}"? This will remove their account and cannot be undone.`}
        confirmText="Delete Owner"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
