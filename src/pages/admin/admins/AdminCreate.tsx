import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserCog, ArrowLeft, Save, Shield, Check } from 'lucide-react';
import { createAdminProfile } from '../../../firebase/db';
import {
  AdminRole, Permission, ROLE_LABELS, ROLE_COLORS, DEFAULT_ROLE_PERMISSIONS
} from '../../../types';
import { useToast } from '../../../context/ToastContext';

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

const DEPARTMENTS = ['Platform', 'Finance', 'Support', 'Operations', 'Security', 'Marketing', 'Engineering'];

export const AdminCreate: React.FC = () => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    displayName: '',
    email: '',
    role: 'read_only' as AdminRole,
    department: '',
    notes: '',
    twoFAEnabled: false,
    emailVerified: false,
    status: 'invited' as 'active' | 'suspended' | 'invited',
    permissions: DEFAULT_ROLE_PERMISSIONS['read_only'] as Permission[],
  });

  const handleRoleChange = (role: AdminRole) => {
    setForm(f => ({ ...f, role, permissions: [...DEFAULT_ROLE_PERMISSIONS[role]] }));
  };

  const togglePermission = (perm: Permission) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const handleSave = async () => {
    if (!form.displayName.trim() || !form.email.trim()) {
      error('Validation Error', 'Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await createAdminProfile(form);
      success('Admin Created', `${form.displayName} has been added successfully.`);
      navigate('/admin/admins');
    } catch {
      error('Save Failed', 'Could not create admin account.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin/admins" className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Admin Account</h1>
          <p className="text-sm text-muted-foreground">Invite a new team member to the admin portal</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left – basic info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic Details */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <UserCog size={16} className="text-brand-500" /> Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="John Smith"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@company.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Department</label>
                <select
                  value={form.department}
                  onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
                >
                  <option value="">Select department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Initial Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all"
                >
                  <option value="invited">Invited</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes about this admin..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/40 transition-all resize-none"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, twoFAEnabled: !f.twoFAEnabled }))}
                  className={`w-10 h-5.5 rounded-full transition-colors duration-200 flex items-center ${form.twoFAEnabled ? 'bg-brand-600' : 'bg-muted'}`}
                  style={{ height: '22px', cursor: 'pointer' }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 mx-0.5 ${form.twoFAEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-foreground">Require 2FA</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, emailVerified: !f.emailVerified }))}
                  className={`w-10 rounded-full transition-colors duration-200 flex items-center ${form.emailVerified ? 'bg-emerald-600' : 'bg-muted'}`}
                  style={{ height: '22px', cursor: 'pointer' }}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 mx-0.5 ${form.emailVerified ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-foreground">Email Verified</span>
              </label>
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
              <Shield size={16} className="text-violet-500" /> Permission Matrix
              <span className="ml-auto text-xs text-muted-foreground font-normal">{form.permissions.length} granted</span>
            </h2>
            <div className="space-y-4">
              {GROUPS.map(group => (
                <div key={group}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {ALL_PERMISSIONS.filter(p => p.group === group).map(perm => {
                      const active = form.permissions.includes(perm.key);
                      return (
                        <button
                          key={perm.key}
                          onClick={() => togglePermission(perm.key)}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 text-left ${
                            active
                              ? 'bg-brand-500/10 border-brand-500/30 text-brand-600 dark:text-brand-400'
                              : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${active ? 'bg-brand-600 border-brand-600' : 'bg-card border-border'}`}>
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
        </div>

        {/* Right – Role selector */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 sticky top-6">
            <h2 className="font-semibold text-foreground text-sm flex items-center gap-2 mb-4">
              <Shield size={16} className="text-brand-500" /> Select Role
            </h2>
            <div className="space-y-2">
              {ROLES.map(role => (
                <button
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl border text-sm font-medium transition-all duration-150 ${
                    form.role === role
                      ? 'border-brand-500/50 bg-brand-500/10 text-brand-600 dark:text-brand-400'
                      : 'border-border bg-muted/30 text-foreground hover:bg-muted'
                  }`}
                >
                  <span>{ROLE_LABELS[role]}</span>
                  {form.role === role && <Check size={14} />}
                </button>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-border space-y-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-lg shadow-brand-500/20 transition-all disabled:opacity-60"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
                {saving ? 'Creating...' : 'Create Admin'}
              </button>
              <Link
                to="/admin/admins"
                className="flex items-center justify-center w-full py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium text-foreground transition-all"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
