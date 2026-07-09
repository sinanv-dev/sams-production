import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Plus, Search, UserCog, CheckCircle2, XCircle, Clock,
  MoreHorizontal, Edit2, Trash2, Eye, Mail, Lock, Unlock,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { getAdminProfiles, updateAdminProfile, deleteAdminProfile } from '../../../firebase/db';
import { AdminProfile, ROLE_LABELS, ROLE_COLORS } from '../../../types';
import { useToast } from '../../../context/ToastContext';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';
import { SkeletonPage } from '../../../components/common/Skeleton';

const StatusBadge: React.FC<{ status: AdminProfile['status'] }> = ({ status }) => {
  const map = {
    active: { label: 'Active', icon: <CheckCircle2 size={11} />, cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    suspended: { label: 'Suspended', icon: <XCircle size={11} />, cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
    invited: { label: 'Invited', icon: <Clock size={11} />, cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  };
  const { label, icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {icon} {label}
    </span>
  );
};

export const AdminList: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAdminProfiles();
      setAdmins(data);
    } catch {
      error('Load failed', 'Could not fetch admin profiles.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (admin: AdminProfile) => {
    const newStatus = admin.status === 'active' ? 'suspended' : 'active';
    try {
      await updateAdminProfile(admin.uid, { status: newStatus });
      setAdmins(prev => prev.map(a => a.uid === admin.uid ? { ...a, status: newStatus } : a));
      success(`Admin ${newStatus === 'active' ? 'Activated' : 'Suspended'}`, `${admin.displayName} has been ${newStatus}.`);
    } catch {
      error('Update failed', 'Could not update admin status.');
    }
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminProfile(deleteTarget.uid);
      setAdmins(prev => prev.filter(a => a.uid !== deleteTarget.uid));
      success('Admin Deleted', `${deleteTarget.displayName} has been removed.`);
    } catch {
      error('Delete failed', 'Could not delete admin account.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = admins.filter(a =>
    a.displayName.toLowerCase().includes(query.toLowerCase()) ||
    a.email.toLowerCase().includes(query.toLowerCase()) ||
    ROLE_LABELS[a.role].toLowerCase().includes(query.toLowerCase()) ||
    a.department?.toLowerCase().includes(query.toLowerCase())
  );

  const stats = {
    total: admins.length,
    active: admins.filter(a => a.status === 'active').length,
    suspended: admins.filter(a => a.status === 'suspended').length,
    invited: admins.filter(a => a.status === 'invited').length,
  };

  if (loading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <UserCog size={16} className="text-violet-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
          </div>
          <p className="text-muted-foreground text-sm">Manage admin accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <Link
            to="/admin/admins/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all duration-200 hover:-translate-y-0.5"
          >
            <Plus size={16} /> Add Admin
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Admins', value: stats.total, color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'Active', value: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
          { label: 'Suspended', value: stats.suspended, color: 'text-red-600', bg: 'bg-red-500/10' },
          { label: 'Invited', value: stats.invited, color: 'text-amber-600', bg: 'bg-amber-500/10' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl border border-border p-4`}>
            <p className="text-xs text-muted-foreground font-medium mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & table */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search admins..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-8 pr-4 py-2 rounded-xl bg-muted/50 border border-border text-sm outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
            />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">2FA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <AlertCircle size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No admins found</p>
                  </td>
                </tr>
              ) : (
                filtered.map(admin => (
                  <tr key={admin.uid} className="border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
                    {/* Admin info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {admin.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => navigate(`/admin/admins/${admin.uid}`)}
                            className="font-semibold text-foreground hover:text-brand-600 transition-colors text-sm"
                          >
                            {admin.displayName}
                          </button>
                          <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${ROLE_COLORS[admin.role]}`}>
                        {ROLE_LABELS[admin.role]}
                      </span>
                    </td>
                    {/* Department */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">{admin.department ?? '—'}</span>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge status={admin.status} />
                    </td>
                    {/* 2FA */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {admin.twoFAEnabled ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 size={13} /> Enabled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <XCircle size={13} /> Disabled
                        </span>
                      )}
                    </td>
                    {/* Last login */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {admin.lastLogin
                          ? new Date(admin.lastLogin).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="relative flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/admins/${admin.uid}`)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-brand-600 hover:bg-brand-500/10 transition-colors"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/admins/${admin.uid}`)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === admin.uid ? null : admin.uid)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <MoreHorizontal size={15} />
                          </button>
                          {openMenuId === admin.uid && (
                            <div className="absolute right-0 top-8 w-44 bg-card border border-border rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in duration-150">
                              <button
                                onClick={() => handleToggleStatus(admin)}
                                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm hover:bg-muted transition-colors text-foreground"
                              >
                                {admin.status === 'active' ? <Lock size={13} className="text-amber-500" /> : <Unlock size={13} className="text-emerald-500" />}
                                {admin.status === 'active' ? 'Suspend' : 'Activate'}
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); }}
                                className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm hover:bg-muted transition-colors text-foreground"
                              >
                                <Mail size={13} className="text-blue-500" /> Send Email
                              </button>
                              <div className="border-t border-border/50 mt-1 pt-1">
                                <button
                                  onClick={() => { setDeleteTarget(admin); setOpenMenuId(null); }}
                                  className="flex items-center gap-2.5 w-full px-3.5 py-2 text-sm hover:bg-red-500/10 transition-colors text-red-500"
                                >
                                  <Trash2 size={13} /> Delete Admin
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Admin Account"
        message={`Are you sure you want to permanently delete "${deleteTarget?.displayName}"? This action cannot be undone.`}
        confirmText="Delete Admin"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
