import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building, Shield, Lock, Mail, AlertCircle, ShieldAlert } from 'lucide-react';
import { PublicLayout } from '../../layouts/PublicLayout';

export const AdminLogin: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const userProfile = await login(email, password);
      if (userProfile.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        // Redirection for non-admin accounts to block access
        setErrorMsg('Unauthorized role. This portal is restricted to SAMS Admins.');
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please verify admin credentials.');
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center p-4 md:p-6 my-12 animate-fadeIn">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border-2 border-red-500/30 dark:border-red-500/20 shadow-2xl rounded-3xl overflow-hidden p-8 space-y-6 relative transition-colors">
          
          {/* Security Alert Header */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-[10px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mx-auto w-fit">
            <ShieldAlert size={14} className="flex-shrink-0" />
            <span>Restricted Gateway</span>
          </div>

          {/* Brand Icon and Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 bg-red-600 dark:bg-red-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shield size={24} />
            </div>
            <h1 className="text-2xl font-black text-navy-900 dark:text-slate-50 tracking-tight transition-colors">SAMS Admin Access</h1>
            <p className="text-xs text-navy-450 dark:text-slate-455 font-medium transition-colors">Provide authentication credentials to verify administrative privileges.</p>
          </div>

          {/* Security Notice Card */}
          <div className="p-4 bg-navy-50/50 dark:bg-transparent border border-navy-100/50 dark:border-slate-700/55 rounded-2xl space-y-1.5 text-navy-500 dark:text-slate-400">
            <h4 className="font-extrabold text-[11px] uppercase tracking-wider text-navy-950 dark:text-slate-200">Security Warning</h4>
            <p className="text-[10px] leading-relaxed">
              This terminal is reserved for authorized platform administrators. Access attempts are monitored and recorded. Unauthorized entries will be logged and blocked.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1 transition-colors">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-navy-400 dark:text-slate-500 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@sams.in"
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm font-medium text-navy-850 dark:text-slate-100 focus:outline-none focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1 transition-colors">Secret Key</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-navy-400 dark:text-slate-500 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 pl-10 pr-4 text-sm font-medium text-navy-850 dark:text-slate-100 focus:outline-none focus:border-red-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-850 dark:text-red-400 flex items-start space-x-2 transition-colors">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-650 hover:bg-red-750 disabled:bg-navy-200 dark:disabled:bg-slate-700 disabled:text-navy-400 dark:disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/10 hover:shadow-red-500/20 active:scale-95 transition-all duration-200"
            >
              {loading ? 'Authorizing Access...' : 'Verify & Log In'}
            </button>
          </form>

        </div>
      </div>
    </PublicLayout>
  );
};
