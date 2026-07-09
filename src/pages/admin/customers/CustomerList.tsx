import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  subscribeToUsers, updateUserProfile, getRooms, getApartments, deleteUser
} from '../../../firebase/db';
import { UserProfile, Room, Apartment } from '../../../types';
import {
  Users, Eye, Edit2, Trash2, Lock, Unlock, Plus,
  Home, Mail, Phone, CheckCircle2, XCircle, AlertCircle
} from 'lucide-react';
import { DataTable, Column, BulkAction } from '../../../components/common/DataTable';
import { SkeletonPage } from '../../../components/common/Skeleton';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

interface CustomerRow extends UserProfile {
  id: string;
  roomNumber: string;
  apartmentName: string;
  hasRoom: boolean;
}

export const CustomerList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToUsers(allUsers => {
      const custs = allUsers.filter(u => u.role === 'customer');
      buildRows(custs, rooms, apartments);
      setLoading(false);
    });
    loadAssets();
    return () => unsub();
  }, []);

  const loadAssets = async () => {
    try {
      const [allRooms, allApts] = await Promise.all([getRooms(), getApartments()]);
      setRooms(allRooms);
      setApartments(allApts);
    } catch { /* silent */ }
  };

  const buildRows = (custs: UserProfile[], rm: Room[], apts: Apartment[]) => {
    setRows(custs.map(c => {
      const room = rm.find(r => r.currentCustomerId === c.uid);
      const apt = room ? apts.find(a => a.id === room.apartmentId) : undefined;
      return {
        ...c,
        id: c.uid,
        roomNumber: room?.roomNumber ?? '',
        apartmentName: apt?.name ?? '',
        hasRoom: !!room,
      };
    }));
  };

  const handleToggleStatus = async (row: CustomerRow) => {
    const next = row.status === 'active' ? 'suspended' : 'active';
    try {
      await updateUserProfile(row.uid, { status: next });
      success(`Customer ${next === 'active' ? 'Activated' : 'Suspended'}`, `${row.displayName} is now ${next}.`);
    } catch {
      error('Update failed', 'Could not change customer status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.uid, user?.uid ?? 'admin', user?.displayName ?? 'Admin', deleteTarget.displayName);
      success('Customer Deleted', `${deleteTarget.displayName} has been removed.`);
      setDeleteTarget(null);
    } catch {
      error('Delete failed', 'Could not delete customer.');
    } finally {
      setDeleting(false);
    }
  };

  const bulkActions: BulkAction<CustomerRow>[] = [
    {
      label: 'Suspend All', icon: <Lock size={12} />, variant: 'warning',
      action: async (selected) => {
        for (const row of selected) await updateUserProfile(row.uid, { status: 'suspended' }).catch(() => {});
        success('Bulk Suspended', `${selected.length} customers suspended.`);
      },
    },
    {
      label: 'Activate All', icon: <Unlock size={12} />,
      action: async (selected) => {
        for (const row of selected) await updateUserProfile(row.uid, { status: 'active' }).catch(() => {});
        success('Bulk Activated', `${selected.length} customers activated.`);
      },
    },
  ];

  const stats = {
    total: rows.length,
    active: rows.filter(r => r.status === 'active').length,
    withRoom: rows.filter(r => r.hasRoom).length,
    suspended: rows.filter(r => r.status === 'suspended').length,
  };

  const columns: Column<CustomerRow>[] = [
    {
      key: 'displayName',
      header: 'Customer',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-purple-500/15 text-purple-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
            {row.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/admin/customers/${row.uid}`)}
              className="font-semibold text-foreground hover:text-brand-600 transition-colors text-sm text-left"
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
      header: 'Phone',
      render: (row) => (
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Phone size={11} /> {row.phoneNumber || '—'}
        </span>
      ),
    },
    {
      key: 'roomNumber',
      header: 'Room Assignment',
      render: (row) => (
        row.hasRoom ? (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Home size={11} className="text-brand-500" /> Room {row.roomNumber}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{row.apartmentName}</p>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <AlertCircle size={10} /> No room
          </span>
        )
      ),
    },
    {
      key: 'leaseStatus',
      header: 'Lease',
      render: (row) => {
        const s = row.leaseStatus;
        if (!s) return <span className="text-xs text-muted-foreground">—</span>;
        const map: Record<string, string> = {
          active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
          expired: 'bg-red-500/10 text-red-600 border-red-500/20',
          pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
          terminated: 'bg-red-500/10 text-red-600 border-red-500/20',
        };
        return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${map[s] ?? 'bg-muted text-muted-foreground border-border'}`}>{s}</span>;
      },
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
          <button onClick={() => navigate(`/admin/customers/${row.uid}`)} className="p-1.5 rounded-lg text-muted-foreground hover:text-brand-600 hover:bg-brand-500/10 transition-colors" title="View Profile">
            <Eye size={14} />
          </button>
          <button onClick={() => navigate(`/admin/customers/${row.uid}/edit`)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
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

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Users size={16} className="text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Customer Management</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage all tenants and residents on the platform</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Customers</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <p className="text-xs text-emerald-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4">
          <p className="text-xs text-brand-600 mb-1">With Room</p>
          <p className="text-2xl font-bold text-brand-600">{stats.withRoom}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <p className="text-xs text-red-600 mb-1">Suspended</p>
          <p className="text-2xl font-bold text-red-600">{stats.suspended}</p>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        searchable
        searchPlaceholder="Search customers by name, email, or room..."
        searchKeys={['displayName', 'email', 'roomNumber', 'apartmentName', 'phoneNumber']}
        bulkActions={bulkActions}
        onRowClick={row => navigate(`/admin/customers/${row.uid}`)}
        exportFileName="customers-export"
        pageSize={10}
        emptyState={
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Users size={36} className="opacity-20" />
            <p className="text-sm font-medium">No customers found</p>
          </div>
        }
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Customer Account"
        message={`Permanently delete "${deleteTarget?.displayName}"? This cannot be undone.`}
        confirmText="Delete Customer"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
