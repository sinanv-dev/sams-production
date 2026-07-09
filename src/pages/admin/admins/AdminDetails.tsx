import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, CheckCircle2, XCircle, Clock, Edit2, Save,
  Lock, Unlock, Trash2, Check, Mail, Monitor, Smartphone, RefreshCw,
  UserCog, Activity, Key, AlertTriangle
} from 'lucide-react';
import { getAdminProfile, updateAdminProfile, deleteAdminProfile } from '../../../firebase/db';
import {
  AdminProfile, AdminRole, Permission, ROLE_LABELS, ROLE_COLORS, DEFAULT_ROLE_PERMISSIONS
} from '../../../types';
import { useToast } from '../../../context/ToastContext';
import { ConfirmDialog } from '../../../components/common/ConfirmDialog';

const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: 'apartments.read', label: 'View Apartments', group: 'Apartments' },
  { key: 'apartments.write', label: 'Create/Edit Apartments', group: 'Apartments' },
  { key: 'apartments.delete', label: 'Delete Apartments', group: 'Apartments' },
  { key: 'rooms.read', label: 'View Rooms', group: 'Rooms' },
  { key: 'rooms.write', label: 'Create/Edit Rooms', group: 'Rooms' },
  { key: 'rooms.delete', label: 'Delete Rooms', group: 'Rooms' },
  { key: 'customers.read', label: 'View Customers', group: 'Customers' },
  { key: 'customers.write', label: 'Edit Customers', group: 'Customers' },
  { key: 'customers.delete', label: 'Delete Customers', group: 'Customers' },
  { key: 'owners.read', label: 'View Owners', group: 'Owners' },
  { key: 'owners.write', label: 'Edit Owners', group: 'Owners' },
  { key: 'owners.delete', label: 'Delete Owners', group: 'Owners' },
  { key: 'billing.read', label: 'View Billing', group: 'Finance' },
  { key: 'billing.write', label: 'Manage Billing', group: 'Finance' },
  { key: 'electricity.read', label: 'View Electricity', group: 'Finance' },
  { key: 'electricity.write', label: 'Manage Electricity', group: 'Finance' },
  { key: 'complaints.read', label: 'View Complaints', group: 'Operations' },
  { key: 'complaints.write', label: 'Manage Complaints', group: 'Operations' },
  { key: 'documents.read', label: 'View Documents', group: 'Operations' },
  { key: 'documents.write', label: 'Upload/Approve Docs', group: 'Operations' },
  { key: 'analytics.read', label: 'View Analytics', group: 'Insights' },
  { key: 'notifications.send', label: 'Send Notifications', group: 'Insights' },
  { key: 'audit.read', label: 'View Audit Logs', group: 'Insights' },
  { key: 'settings.manage', label: 'System Settings', group: 'Admin' },
  { key: 'admins.manage', label: 'Manage Admins', group: 'Admin' },
  { key: 'export.all', label: 'Export Data', group: 'Admin' },
];

const GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

const ROLES: AdminRole[] = ['super_admin', 'platform_admin', 'finance_admin', 'customer_support', 'owner_support', 'operations', 'read_only'];

export const AdminDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error, info } = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'security' | 'activity'>('overview');

  // Editable form state
  const [form, setForm] = useState<Partial<AdminProfile>>({});

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  const load = async (uid: string) => {
    setLoading(true);
    try {
      const data = await getAdminProfile(uid);
      if (!data) { error('Not found', 'Admin profile not found.'); navigate('/admin/admins'); return; }
      setAdmin(data);
      setForm(data);
    } catch {
      error('Load failed', 'Could not load admin profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!admin) return;
    setSaving(true);
    try {
      await updateAdminProfile(admin.uid, form);
      setAdmin(prev => prev ? { ...prev, ...form } : prev);
      setEditing(false);
      success('Profile Updated', 'Admin profile saved successfully.');
    } catch {
      error('Save failed', 'Could not update admin profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!admin) return;
    const newStatus = admin.status === 'active' ? 'suspended' : 'active';
    try {
      await updateAdminProfile(admin.uid, { status: newStatus });
      setAdmin(prev => prev ? { ...prev, status: newStatus } : prev);
      success(`Admin ${newStatus === 'active' ? 'Activated' : 'Suspended'}`, `Status updated to ${newStatus}.`);
    } catch {
      error('Update failed', 'Could not change admin status.');
    }
  };

  const handleDelete = async () => {
    if (!admin) return;
    setDeleting(true);
    try {
      await deleteAdminProfile(admin.uid);
      success('Deleted', 'Admin account removed.');
      navigate('/admin/admins');
    } catch {
      error('Delete failed', 'Could not delete admin.');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const togglePermission = (perm: Permission) => {
    const current = (form.permissions ?? []) as Permission[];
    setForm(f => ({
      ...f,
      permissions: current.includes(perm)
        ? current.filter(p => p !== perm)
        : [...current, perm],
    }));
  };

  const handleRoleChange = (role: AdminRole) => {
    setForm(f => ({ ...f, role, permissions: [...DEFAULT_ROLE_PERMISSIONS[role]] }));
  };

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 bg-muted rounded-lg" />
            <div className="h-4 w-64 bg-muted rounded-lg" />
          </div>
        </div>
        <div className="h-64 rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!admin) return null;

  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    suspended: 'bg-red-500/10 text-red-600 border-red-500/20',
    invited: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  };

  const TABS = [
    { id: 'overview', label: 'Overview', icon: <UserCog size={14} /> },
    { id: 'permissions', label: 'Permissions', icon: <Key size={14} /> },
    { id: 'security', label: 'Security', icon: <Shield size={14} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={14} /> },
  ] as const;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <Link to="/admin/admins" className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mt-1">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 text-brand-600 flex items-center justify-center font-bold text-xl">
              {admin.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{admin.displayName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${ROLE_COLORS[admin.role]}`}>
                  <Shield size={9} /> {ROLE_LABELS[admin.role]}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusColors[admin.status]}`}>
                  {admin.status === 'active' ? <CheckCircle2 size={9} /> : admin.status === 'suspended' ? <XCircle size={9} /> : <Clock size={9} />}
                  {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground ml-15">{admin.email}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setForm(admin); }}
                className="px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-all disabled:opacity-60"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-all"
              >
                <Edit2 size={14} /> Edit
              </button>
              <button
                onClick={handleToggleStatus}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                  admin.status === 'active'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                }`}
              >
                {admin.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                {admin.status === 'active' ? 'Suspend' : 'Activate'}
              </button>
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-medium transition-all"
              >
                <Trash2 size={14} /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm">Profile Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Name</label>
                {editing ? (
                  <input type="text" value={form.displayName ?? ''} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" />
                ) : (
                  <p className="text-sm text-foreground font-medium">{admin.displayName}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email</label>
                {editing ? (
                  <input type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" />
                ) : (
                  <p className="text-sm text-foreground font-medium">{admin.email}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Department</label>
                {editing ? (
                  <input type="text" value={form.department ?? ''} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 transition-all" />
                ) : (
                  <p className="text-sm text-foreground font-medium">{admin.department ?? '—'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Role</label>
                {editing ? (
                  <select value={form.role} onChange={e => handleRoleChange(e.target.value as AdminRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 transition-all">
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${ROLE_COLORS[admin.role]}`}>
                    {ROLE_LABELS[admin.role]}
                  </span>
                )}
              </div>
            </div>
            {editing && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Notes</label>
                <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 transition-all resize-none" />
              </div>
            )}
          </div>

          {/* Side info */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Account Details</h3>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Member since</span>
                  <span className="text-xs font-medium text-foreground">{new Date(admin.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Last login</span>
                  <span className="text-xs font-medium text-foreground">{admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">IP Address</span>
                  <span className="text-xs font-mono text-foreground">{admin.ipAddress ?? '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">2FA</span>
                  {admin.twoFAEnabled ? (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={11} /> Enabled</span>
                  ) : (
                    <span className="text-xs text-red-500 font-medium flex items-center gap-1"><XCircle size={11} /> Disabled</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Email verified</span>
                  {admin.emailVerified ? (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 size={11} /> Yes</span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><AlertTriangle size={11} /> No</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Permissions</span>
                  <span className="text-xs font-semibold text-brand-600">{admin.permissions.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Permissions */}
      {activeTab === 'permissions' && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-foreground">Permission Matrix</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{(form.permissions ?? []).length} permissions granted</span>
              {!editing && (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-600 hover:bg-brand-500/20 transition-colors">
                  <Edit2 size={12} /> Edit
                </button>
              )}
            </div>
          </div>
          <div className="space-y-5">
            {GROUPS.map(group => (
              <div key={group}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{group}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => {
                    const active = (form.permissions ?? []).includes(perm.key);
                    return (
                      <button
                        key={perm.key}
                        onClick={() => editing && togglePermission(perm.key)}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                          active
                            ? 'bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400'
                            : 'bg-muted/30 border-border text-muted-foreground'
                        } ${editing ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${active ? 'bg-brand-600 border-brand-600' : 'bg-card border-border'}`}>
                          {active && <Check size={10} className="text-white" />}
                        </div>
                        {perm.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Security */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Shield size={15} className="text-violet-500" /> Security Settings
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">Extra login security layer</p>
                </div>
                {admin.twoFAEnabled
                  ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 size={13} /> Active</span>
                  : <span className="flex items-center gap-1 text-xs text-red-500 font-semibold"><XCircle size={13} /> Inactive</span>
                }
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Email Verification</p>
                  <p className="text-xs text-muted-foreground">Account email confirmed</p>
                </div>
                {admin.emailVerified
                  ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><CheckCircle2 size={13} /> Verified</span>
                  : <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold"><AlertTriangle size={13} /> Pending</span>
                }
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Account Status</p>
                  <p className="text-xs text-muted-foreground">Current login access</p>
                </div>
                <button onClick={handleToggleStatus} className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  admin.status === 'active'
                    ? 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                }`}>
                  {admin.status === 'active' ? <><Lock size={11} className="inline mr-1" />Suspend</> : <><Unlock size={11} className="inline mr-1" />Activate</>}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Monitor size={15} className="text-blue-500" /> Session Info
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Last Known IP</p>
                <p className="text-sm font-mono text-foreground">{admin.ipAddress ?? 'Unknown'}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Last Login</p>
                <p className="text-sm text-foreground">{admin.lastLogin ? new Date(admin.lastLogin).toLocaleString() : 'Never logged in'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Activity */}
      {activeTab === 'activity' && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
            <Activity size={15} className="text-brand-500" /> Recent Activity
          </h3>
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3 text-muted-foreground">
            <Activity size={36} className="opacity-20" />
            <p className="text-sm font-medium">Activity logging coming soon</p>
            <p className="text-xs">All admin actions will be tracked here once audit logging is fully enabled.</p>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Admin Account"
        message={`Permanently delete "${admin.displayName}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
