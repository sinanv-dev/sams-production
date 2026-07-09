import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../firebase/db';
import { UserProfile } from '../../types';
import { User, Mail, Phone, Lock, Save, CheckCircle, Moon, Sun, Monitor, Calendar, HeartHandshake, MapPin } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const CustomerSettings: React.FC = () => {
  const { user } = useAuth();
  const { themePreference, setThemePreference } = useTheme();
  
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    photoUrl: '',
    dob: '',
    emergencyContact: '',
    address: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile'|'theme'|'notifications'>('profile');

  useEffect(() => {
    if (user) {
      setProfile({
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        photoUrl: user.photoUrl || '',
        dob: user.dob || '',
        emergencyContact: user.emergencyContact || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, {
        displayName: profile.displayName,
        photoUrl: profile.photoUrl,
        dob: profile.dob,
        emergencyContact: profile.emergencyContact,
        address: profile.address
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch(err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun, desc: 'Always use light theme' },
    { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always use dark theme' },
    { value: 'system', label: 'System', icon: Monitor, desc: 'Follow system preference' },
  ] as const;

  const tabs = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'theme' as const, label: 'Appearance' },
    { key: 'notifications' as const, label: 'Notifications' },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Settings & Profile</h1>
        <p className="text-muted-foreground text-sm font-medium mt-0.5">Manage your personal credentials, UI theme, and notifications.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded-2xl p-1.5 w-fit shadow-sm">
        {tabs.map(t => (
          <button 
            key={t.key} 
            onClick={() => setActiveTab(t.key)} 
            className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all duration-150 ${
              activeTab === t.key 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'text-muted-foreground hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Customer Profile</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Update your personal and contact details</p>
          </div>
          <form onSubmit={handleSaveProfile} className="p-6 space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-black border border-emerald-500/30">
                {profile.displayName ? profile.displayName.charAt(0).toUpperCase() : 'C'}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{profile.displayName || 'Customer'}</p>
                <p className="text-xs text-muted-foreground">Tenant Member Portal</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-3 text-slate-400"/>
                  <input 
                    type="text" 
                    value={profile.displayName} 
                    onChange={e => setProfile(p => ({ ...p, displayName: e.target.value }))} 
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-table-header border border-border rounded-xl focus:outline-none focus:border-emerald-500 text-foreground" 
                    placeholder="Your full name" 
                    required
                  />
                </div>
              </div>

              {/* Registered Email (Disabled) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  Registered Email <Lock size={11} className="text-slate-400" />
                </label>
                <div className="relative group">
                  <Mail size={15} className="absolute left-3 top-3 text-slate-400"/>
                  <input 
                    type="email" 
                    value={profile.email} 
                    disabled 
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/40 border border-border rounded-xl text-slate-500 dark:text-slate-500 cursor-not-allowed"
                    title="Only the administrator can update this information."
                  />
                  <span 
                    title="Only the administrator can update this information."
                    className="absolute right-3 top-3"
                  >
                    <Lock size={14} className="text-slate-400 cursor-help" />
                  </span>
                </div>
              </div>

              {/* Registered Phone (Disabled) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                  Registered Phone <Lock size={11} className="text-slate-400" />
                </label>
                <div className="relative group">
                  <Phone size={15} className="absolute left-3 top-3 text-slate-400"/>
                  <input 
                    type="tel" 
                    value={profile.phoneNumber} 
                    disabled 
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/40 border border-border rounded-xl text-slate-500 dark:text-slate-500 cursor-not-allowed"
                    title="Only the administrator can update this information."
                  />
                  <span 
                    title="Only the administrator can update this information."
                    className="absolute right-3 top-3"
                  >
                    <Lock size={14} className="text-slate-400 cursor-help" />
                  </span>
                </div>
              </div>

              {/* Informational Message */}
              <div className="md:col-span-2 p-3.5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-150/40 dark:border-blue-900/20 rounded-2xl text-[11px] text-blue-700 dark:text-blue-400 leading-normal font-semibold">
                Your registered email address and phone number can only be updated by the system administrator. Please contact the administrator if changes are required.
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Date of Birth</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3 top-3 text-slate-400"/>
                  <input 
                    type="date" 
                    value={profile.dob} 
                    onChange={e => setProfile(p => ({ ...p, dob: e.target.value }))} 
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-table-header border border-border rounded-xl focus:outline-none focus:border-emerald-500 text-foreground"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Emergency Contact</label>
                <div className="relative">
                  <HeartHandshake size={15} className="absolute left-3 top-3 text-slate-400"/>
                  <input 
                    type="text" 
                    value={profile.emergencyContact} 
                    onChange={e => setProfile(p => ({ ...p, emergencyContact: e.target.value }))} 
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-table-header border border-border rounded-xl focus:outline-none focus:border-emerald-500 text-foreground" 
                    placeholder="e.g. Spouse (+91 XXXXX XXXXX)"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Address Location</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3 top-3 text-slate-400"/>
                  <input 
                    type="text" 
                    value={profile.address} 
                    onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} 
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-table-header border border-border rounded-xl focus:outline-none focus:border-emerald-500 text-foreground" 
                    placeholder="Your address details"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {saved && (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold animate-pulse">
                  <CheckCircle size={16}/> Settings saved successfully!
                </div>
              )}
              <button 
                type="submit" 
                disabled={saving} 
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-sm transition-all disabled:opacity-50"
              >
                <Save size={15}/> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Appearance Theme Tab */}
      {activeTab === 'theme' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Appearance Preference</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle UI themes for light or dark modes</p>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4">
            {themeOptions.map(({ value, label, icon: Icon, desc }) => (
              <button 
                key={value} 
                onClick={() => setThemePreference(value)} 
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 ${
                  themePreference === value 
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' 
                    : 'border-border hover:border-slate-350 dark:hover:border-slate-600'
                }`}
              >
                <Icon size={28} className={themePreference === value ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}/>
                <span className={`text-sm font-bold ${themePreference === value ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'}`}>{label}</span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight">{desc}</span>
                {themePreference === value && <span className="w-2 h-2 rounded-full bg-emerald-500"/>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Service Notifications</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Select what service alerts SAMS sends you</p>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Electricity Bills Published', desc: 'When the owner posts monthly utility reports' },
              { label: 'Payment Invoices Due', desc: 'Alerts before monthly rent cycles close' },
              { label: 'Complaint Ticket Activity', desc: 'Updates on plumbers, handymen, and work logs' },
              { label: 'Building Broadcasts', desc: 'General announcements and maintenance alerts' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-secondary last:border-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer"/>
                  <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"/>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
