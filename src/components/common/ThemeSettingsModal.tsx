import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { updateUserProfile } from '../../firebase/db';
import { X, Sun, Moon, Monitor, Check, User, Phone, CheckCircle, Save } from 'lucide-react';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { themePreference, setThemePreference } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    try {
      await updateUserProfile(user.uid, {
        displayName,
        phoneNumber
      });
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile details.');
    } finally {
      setLoading(false);
    }
  };

  const themeOptions = [
    {
      id: 'light',
      label: 'Light Mode',
      description: 'Clean light styles optimized for daytime use.',
      icon: <Sun size={20} className="text-amber-500" />
    },
    {
      id: 'dark',
      label: 'Dark Mode',
      description: 'Stunning dark colors soft on eyes in dark rooms.',
      icon: <Moon size={20} className="text-blue-400" />
    },
    {
      id: 'system',
      label: 'System Preference',
      description: 'Automatically adjust to follow device preferences.',
      icon: <Monitor size={20} className="text-muted-foreground dark:text-slate-400" />
    }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm dark:bg-slate-950/60" onClick={onClose}></div>
      
      {/* Modal Container */}
      <div className="bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-700 rounded-3xl w-full max-w-md shadow-2xl p-6 relative z-10 animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-navy-50 dark:border-slate-700/50">
          <h2 className="text-base font-black text-foreground dark:text-slate-50 tracking-tight">Account & Visual Settings</h2>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-muted-foreground hover:bg-navy-50 dark:hover:bg-slate-700 hover:text-navy-700 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5 mt-4 overflow-y-auto pr-1 flex-1">
          {/* Profile fields */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-slate-400">Profile Details</h3>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-slate-300 mb-1">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3.5 text-xs font-semibold text-foreground dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-slate-300 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Not set"
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3.5 text-xs font-semibold text-foreground dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Theme Settings cards */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:text-slate-400">Application Theme</h3>
            <div className="grid grid-cols-1 gap-2.5">
              {themeOptions.map((opt) => {
                const isActive = themePreference === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setThemePreference(opt.id)}
                    className={`flex items-start text-left p-3 rounded-2xl border transition-all duration-300 relative group ${
                      isActive 
                        ? 'bg-brand-50/20 border-brand-500 shadow-md shadow-brand-500/5 dark:bg-brand-500/5 dark:border-brand-500' 
                        : 'bg-white dark:bg-transparent border-navy-100 dark:border-slate-700 hover:border-navy-200 dark:hover:border-slate-600'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-navy-50 dark:bg-slate-800 flex items-center justify-center mr-3 mt-0.5">
                      {opt.icon}
                    </div>
                    <div className="flex-1 pr-6">
                      <h4 className="text-xs font-bold text-foreground dark:text-slate-100">{opt.label}</h4>
                      <p className="text-[10px] text-muted-foreground dark:text-slate-400 mt-0.5 leading-relaxed">{opt.description}</p>
                    </div>
                    {isActive && (
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Success / Error alerts */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center">
              <CheckCircle size={14} className="mr-1.5" /> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-800 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Footer controls */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-navy-50 dark:border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-navy-200 dark:border-slate-700 text-navy-700 dark:text-slate-300 hover:text-foreground dark:hover:text-slate-100 rounded-xl text-xs font-semibold hover:bg-navy-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-navy-200 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/10 flex items-center space-x-1.5 transition-colors"
            >
              <Save size={14} />
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
