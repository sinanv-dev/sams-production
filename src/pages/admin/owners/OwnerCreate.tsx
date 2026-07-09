import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createOwnerAccountByAdmin } from '../../../firebase/auth';
import { ArrowLeft, UserCheck, AlertCircle } from 'lucide-react';

export const OwnerCreate: React.FC = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    if (!displayName.trim() || !email.trim() || !phoneNumber.trim()) {
      setErrorMsg('All fields are required.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      setErrorMsg('Please enter a valid phone number (minimum 7 digits).');
      setLoading(false);
      return;
    }

    try {
      await createOwnerAccountByAdmin(email.trim(), displayName.trim(), phoneNumber.trim());
      setSuccessMsg('Owner registered successfully!');
      setTimeout(() => {
        navigate('/admin/owners');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register owner.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <Link to="/admin/owners" className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        <span>Back to Owner Registry</span>
      </Link>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-black text-foreground mb-1">Register Owner Account</h2>
        <p className="text-xs text-muted-foreground mb-6">Create a profile for an owner or property manager to assign properties.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Full Name</label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@sams.com"
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. +1 (555) 123-4567"
              className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-xl text-xs font-semibold text-red-800 flex items-start space-x-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center">
              <UserCheck size={16} className="mr-1.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/50">
            <Link
              to="/admin/owners"
              className="px-4 py-2 border border-border dark:border-slate-700 text-foreground hover:text-foreground rounded-xl text-sm font-semibold hover:bg-table-row-hover dark:bg-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !!successMsg}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-500/10 transition-colors"
            >
              {loading ? 'Creating...' : 'Register Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
