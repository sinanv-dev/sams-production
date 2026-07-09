import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUser, updateUserProfile } from '../../../firebase/db';
import { useAuth } from '../../../context/AuthContext';
import { UserProfile } from '../../../types';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const CustomerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [role, setRole] = useState<'admin' | 'owner' | 'customer'>('customer');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const loadCustomerData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getUser(id);
      if (!data) {
        navigate('/admin/customers');
        return;
      }
      setDisplayName(data.displayName);
      setEmail(data.email || '');
      setPhoneNumber(data.phoneNumber || '');
      setStatus(data.status);
      setRole(data.role);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    try {
      // Pass the caller's role so the backend grants admin full access
      await updateUserProfile(id, {
        displayName,
        email,
        phoneNumber,
        status,
        role
      }, user?.role);
      setSuccessMsg('Customer profile updated successfully!');
      setTimeout(() => {
        if (role === 'customer') {
          navigate(`/admin/customers/${id}`);
        } else if (role === 'owner') {
          navigate(`/admin/owners/${id}`);
        } else {
          navigate('/admin/customers');
        }
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Link to={`/admin/customers/${id}`} className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        <span>Back to Details</span>
      </Link>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-foreground mb-1">Edit User Profile</h2>
        <p className="text-xs text-muted-foreground mb-6">Modify profile details, credentials, or role configurations.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Full Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex Customer"
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors text-foreground"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alex.customer@example.com"
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors text-foreground"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +1 (555) 123-4567"
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors text-foreground"
            />
          </div>

          {/* Account Status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Account Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-semibold focus:outline-none text-foreground"
            >
              <option value="active">Active (Access Enabled)</option>
              <option value="suspended">Suspended (Access Disabled)</option>
            </select>
          </div>

          {/* User Role */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">System Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-semibold focus:outline-none text-foreground"
            >
              <option value="customer">Customer</option>
              <option value="owner">Owner</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-start space-x-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center">
              <Save size={16} className="mr-1.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/50">
            <Link
              to={`/admin/customers/${id}`}
              className="px-4 py-2 border border-border dark:border-slate-700 text-foreground hover:text-foreground rounded-xl text-sm font-semibold hover:bg-table-row-hover dark:bg-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || !!successMsg}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-500/10 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
