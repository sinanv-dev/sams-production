import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createOwnerAccountByAdmin } from '../../../firebase/auth';
import { ArrowLeft, UserCheck, AlertCircle, Eye, EyeOff, Lock, Check, X } from 'lucide-react';

const PasswordCheck: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <div className="flex items-center gap-1.5 text-[11px] font-semibold">
    {ok
      ? <Check size={11} className="text-emerald-500 flex-shrink-0" />
      : <X size={11} className="text-muted-foreground flex-shrink-0" />}
    <span className={ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>{label}</span>
  </div>
);

export const OwnerCreate: React.FC = () => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Password strength checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const satisfied = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;

  const strengthLabel = satisfied >= 5 ? 'Strong' : satisfied >= 3 ? 'Medium' : 'Weak';
  const strengthColor = satisfied >= 5 ? 'bg-emerald-500' : satisfied >= 3 ? 'bg-amber-500' : 'bg-red-500';
  const strengthTextColor = satisfied >= 5 ? 'text-emerald-600' : satisfied >= 3 ? 'text-amber-600' : 'text-red-500';

  const inputClass = 'w-full bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl py-2.5 px-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-colors';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!displayName.trim() || !email.trim() || !phoneNumber.trim() || !password) {
      setErrorMsg('All fields are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      setErrorMsg('Please enter a valid phone number.');
      return;
    }

    if (satisfied < 5) {
      setErrorMsg('Password does not meet all strength requirements.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await createOwnerAccountByAdmin(email.trim(), displayName.trim(), phoneNumber.trim(), password);
      setSuccessMsg('Owner account created successfully! They can now log in with their email and password.');
      setTimeout(() => navigate('/admin/owners'), 2000);
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

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-black text-foreground mb-1">Register Owner Account</h2>
          <p className="text-xs text-muted-foreground">Create a Firebase account for the owner. They will log in with their email and password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className={labelClass}>Full Name *</label>
            <input
              type="text" required value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>Email Address *</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. rahul@sams.com"
              className={inputClass}
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelClass}>Phone Number *</label>
            <input
              type="text" required value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div>
            <label className={labelClass}>Password *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a strong password"
                className={`${inputClass} pl-9 pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 flex-1 mr-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= satisfied ? strengthColor : 'bg-border'}`}
                      />
                    ))}
                  </div>
                  <span className={`text-[11px] font-bold ${strengthTextColor}`}>{strengthLabel}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <PasswordCheck ok={hasMinLength} label="8-64 characters" />
                  <PasswordCheck ok={hasUppercase} label="Uppercase letter" />
                  <PasswordCheck ok={hasLowercase} label="Lowercase letter" />
                  <PasswordCheck ok={hasNumber} label="Number" />
                  <PasswordCheck ok={hasSpecial} label="Special character" />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className={labelClass}>Confirm Password *</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat the password"
                className={`${inputClass} pl-9 pr-10 ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:border-red-400' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 font-semibold mt-1">Passwords do not match.</p>
            )}
          </div>

          {/* Error / Success */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-800 dark:text-red-400 flex items-start space-x-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center space-x-2">
              <UserCheck size={16} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/50">
            <Link
              to="/admin/owners"
              className="px-4 py-2 border border-border dark:border-slate-700 text-foreground rounded-xl text-sm font-semibold hover:bg-muted dark:bg-slate-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !!successMsg}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
            >
              {loading ? 'Creating Account...' : 'Register Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
