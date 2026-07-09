import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getUser, updateUserProfile } from '../../../firebase/db';
import { useAuth } from '../../../context/AuthContext';
import { UserProfile } from '../../../types';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

export const OwnerEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [role, setRole] = useState<'admin' | 'owner' | 'customer'>('owner');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadOwnerData();
  }, [id]);

  const loadOwnerData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getUser(id);
      if (!data) {
        navigate('/admin/owners');
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

    if (!displayName.trim() || !email.trim() || !phoneNumber.trim()) {
      setErrorMsg('All fields are required.');
      setSaving(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      setSaving(false);
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      setErrorMsg('Please enter a valid phone number (minimum 7 digits).');
      setSaving(false);
      return;
    }

    try {
      // Pass the caller's role so the backend grants admin full access
      await updateUserProfile(id, {
        displayName: displayName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        status,
        role
      }, user?.role);
      setSuccessMsg('Owner profile updated successfully!');
      setTimeout(() => {
        if (role === 'owner') {
          navigate(`/admin/owners/${id}`);
        } else if (role === 'customer') {
          navigate(`/admin/customers/${id}`);
        } else {
          navigate('/admin/owners');
        }
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update owner profile.');
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
      <Link to={`/admin/owners/${id}`} className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        <span>Back to Details</span>
      </Link>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-foreground mb-1">Edit Owner Profile</h2>
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
              placeholder="e.g. John Doe"
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
              placeholder="e.g. john.owner@example.com"
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
              to={`/admin/owners/${id}`}
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
