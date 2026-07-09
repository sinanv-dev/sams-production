import React, { useState, useEffect } from 'react';
import { getSystemSettings, updateSystemSettings } from '../../firebase/db';
import { SystemSettings } from '../../types';
import { Settings as SettingsIcon, Save, CheckCircle, AlertTriangle, Globe, Building, Moon, Sun, FileText } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const InputField: React.FC<{
  label: string; name: string; value: string | number; onChange: (e: any) => void;
  type?: string; placeholder?: string; hint?: string; prefix?: string;
}> = ({ label, name, value, onChange, type = 'text', placeholder, hint, prefix }) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full py-2.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500 ${prefix ? 'pl-8 pr-4' : 'px-4'}`}
      />
    </div>
    {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
  </div>
);

export const AdminSettings: React.FC = () => {
  const { themePreference, setThemePreference } = useTheme();
  const [settings, setSettings] = useState<SystemSettings>({
    electricityRatePerKWh: 12,
    lateFeeRate: 50,
    lateFeeGraceDays: 5,
    contactPhone: '',
    contactEmail: '',
    platformName: 'SAMS',
    currency: '₹',
    taxRate: 0,
    rentDueDay: 1,
    maintenanceMode: false,
    defaultSecurityDeposit: 0,
    website: '',
    address: '',
    firebaseApiKey: '',
    firebaseProjectId: '',
    firebaseAuthDomain: '',
    firebaseStorageBucket: '',
    firebaseMessagingSenderId: '',
    firebaseAppId: '',
    welcomeEmailSubject: 'Welcome to SAMS!',
    welcomeEmailBody: 'Hi {name}, your account has been successfully created. You can log in using your email.',
    rentDueSubject: 'Rent Invoice Reminder',
    rentDueBody: 'Hi {name}, this is a friendly reminder that your monthly rent invoice is due on {due_date}.',
    complaintResolvedSubject: 'Complaint Resolved',
    complaintResolvedBody: 'Hi {name}, your complaint concerning {category} has been successfully resolved.'
  });
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeSection, setActiveSection] = useState<'platform' | 'financial' | 'contact' | 'theme' | 'firebase_templates'>('platform');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSystemSettings();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked
        : (['electricityRatePerKWh', 'lateFeeRate', 'lateFeeGraceDays', 'taxRate', 'rentDueDay', 'defaultSecurityDeposit'].includes(name) ? Number(value) : value)
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await updateSystemSettings(settings);
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg('Failed to save settings.');
    }
  };

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const sections = [
    { key: 'platform', label: 'Platform', icon: <Globe size={14}/> },
    { key: 'financial', label: 'Financial', icon: <SettingsIcon size={14}/> },
    { key: 'contact', label: 'Contact', icon: <Building size={14}/> },
    { key: 'theme', label: 'Theme', icon: <Sun size={14}/> },
    { key: 'firebase_templates', label: 'Templates & Firebase', icon: <FileText size={14}/> }
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon size={22} className="text-brand-500" /> System Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Configure platform settings, billing rules, and contact information.</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm">
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      {/* Maintenance Mode Banner */}
      {settings.maintenanceMode && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-3 rounded-xl">
          <AlertTriangle size={18} />
          <div>
            <div className="font-semibold">Maintenance Mode is Active</div>
            <div className="text-sm opacity-80">The platform is currently in maintenance mode. Users cannot log in.</div>
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeSection === s.key ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        {activeSection === 'platform' && (
          <>
            <h2 className="font-bold text-foreground">Platform Settings</h2>
            <InputField label="Platform Name" name="platformName" value={settings.platformName || ''} onChange={handleInputChange} placeholder="SAMS" />
            <InputField label="Default Currency Symbol" name="currency" value={settings.currency || ''} onChange={handleInputChange} placeholder="₹" />
            <InputField label="Tax Rate (%)" name="taxRate" value={settings.taxRate || 0} onChange={handleInputChange} type="number" placeholder="0" hint="Tax rate applied to bills (0 = no tax)" />
            <InputField label="Rent Due Day (1–28)" name="rentDueDay" value={settings.rentDueDay || 1} onChange={handleInputChange} type="number" hint="Day of month when rent is due" />
            <InputField label="Default Security Deposit" name="defaultSecurityDeposit" value={settings.defaultSecurityDeposit || 0} onChange={handleInputChange} type="number" prefix={settings.currency || '₹'} />
            <div>
              <div className="flex items-center justify-between p-4 bg-muted/50 border border-border rounded-xl">
                <div>
                  <div className="font-medium text-foreground">Maintenance Mode</div>
                  <div className="text-xs text-muted-foreground">Disable user access to the platform temporarily</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="maintenanceMode"
                    checked={settings.maintenanceMode || false}
                    onChange={handleInputChange}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-muted peer-checked:bg-amber-500 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
            </div>
          </>
        )}

        {activeSection === 'financial' && (
          <>
            <h2 className="font-bold text-foreground">Financial & Billing Rules</h2>
            <InputField
              label="Electricity Rate per Unit (kWh)"
              name="electricityRatePerKWh"
              value={settings.electricityRatePerKWh}
              onChange={handleInputChange}
              type="number"
              prefix={settings.currency || '₹'}
              hint="Cost per kilowatt-hour for electricity billing"
            />
            <InputField
              label="Late Fee Amount"
              name="lateFeeRate"
              value={settings.lateFeeRate}
              onChange={handleInputChange}
              type="number"
              prefix={settings.currency || '₹'}
              hint="Flat fee charged when rent is paid after the grace period"
            />
            <InputField
              label="Late Fee Grace Days"
              name="lateFeeGraceDays"
              value={settings.lateFeeGraceDays}
              onChange={handleInputChange}
              type="number"
              hint="Number of days after the due date before late fee is applied"
            />
          </>
        )}

        {activeSection === 'contact' && (
          <>
            <h2 className="font-bold text-foreground">Contact & Company Info</h2>
            <InputField label="Contact Phone" name="contactPhone" value={settings.contactPhone} onChange={handleInputChange} placeholder="+91 98765 43210" />
            <InputField label="Contact Email" name="contactEmail" value={settings.contactEmail} onChange={handleInputChange} placeholder="support@sams.com" type="email" />
            <InputField label="Website" name="website" value={settings.website || ''} onChange={handleInputChange} placeholder="https://sams.com" />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Company Address</label>
              <textarea
                name="address"
                value={settings.address || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
                rows={3}
                placeholder="Full company address..."
                className="w-full px-4 py-2.5 bg-input border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500 resize-none"
              />
            </div>
          </>
        )}

        {activeSection === 'theme' && (
          <>
            <h2 className="font-bold text-foreground">Theme & Appearance</h2>
            <p className="text-sm text-muted-foreground">Choose the default theme for your portal. Users can also toggle this individually.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Light Mode', icon: <Sun size={20}/> },
                { value: 'dark', label: 'Dark Mode', icon: <Moon size={20}/> },
                { value: 'system', label: 'System Default', icon: <SettingsIcon size={20}/> },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setThemePreference(opt.value as any)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                    themePreference === opt.value
                      ? 'bg-brand-600/10 border-brand-500/50 text-brand-400'
                      : 'bg-muted border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.icon}
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {activeSection === 'firebase_templates' && (
          <>
            <h2 className="font-bold text-foreground">Firebase Configuration Keys</h2>
            <p className="text-xs text-muted-foreground mb-4">Set connection parameters for real-time Firebase services sync.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Firebase API Key" name="firebaseApiKey" value={settings.firebaseApiKey || ''} onChange={handleInputChange} placeholder="AIzaSy..." />
              <InputField label="Firebase Project ID" name="firebaseProjectId" value={settings.firebaseProjectId || ''} onChange={handleInputChange} placeholder="sams-app-123" />
              <InputField label="Firebase Auth Domain" name="firebaseAuthDomain" value={settings.firebaseAuthDomain || ''} onChange={handleInputChange} placeholder="sams-app-123.firebaseapp.com" />
              <InputField label="Firebase Storage Bucket" name="firebaseStorageBucket" value={settings.firebaseStorageBucket || ''} onChange={handleInputChange} placeholder="sams-app-123.appspot.com" />
              <InputField label="Firebase Messaging Sender ID" name="firebaseMessagingSenderId" value={settings.firebaseMessagingSenderId || ''} onChange={handleInputChange} placeholder="9876543210" />
              <InputField label="Firebase App ID" name="firebaseAppId" value={settings.firebaseAppId || ''} onChange={handleInputChange} placeholder="1:9876543210:web:abc123xyz" />
            </div>

            <h2 className="font-bold text-foreground border-t border-border pt-5 mt-5">Email Alert Notifications Templates</h2>
            <p className="text-xs text-muted-foreground mb-4">Customize subject headings and body message texts for system notification alerts.</p>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
                <h3 className="text-xs font-bold text-foreground">Welcome Greeting Template</h3>
                <InputField label="Email Subject" name="welcomeEmailSubject" value={settings.welcomeEmailSubject || ''} onChange={handleInputChange} placeholder="Welcome Subject" />
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Body Text</label>
                  <textarea
                    name="welcomeEmailBody"
                    value={settings.welcomeEmailBody || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, welcomeEmailBody: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
                <h3 className="text-xs font-bold text-foreground">Rent Due Reminder Template</h3>
                <InputField label="Email Subject" name="rentDueSubject" value={settings.rentDueSubject || ''} onChange={handleInputChange} placeholder="Rent Due Subject" />
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Body Text</label>
                  <textarea
                    name="rentDueBody"
                    value={settings.rentDueBody || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, rentDueBody: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-3">
                <h3 className="text-xs font-bold text-foreground">Complaint Resolution Template</h3>
                <InputField label="Email Subject" name="complaintResolvedSubject" value={settings.complaintResolvedSubject || ''} onChange={handleInputChange} placeholder="Complaint Resolved Subject" />
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Body Text</label>
                  <textarea
                    name="complaintResolvedBody"
                    value={settings.complaintResolvedBody || ''}
                    onChange={(e) => setSettings(prev => ({ ...prev, complaintResolvedBody: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={loadSettings}
            className="px-4 py-2.5 border border-border rounded-xl text-foreground hover:bg-muted transition-colors text-sm font-medium"
          >
            Reset
          </button>
          <button
            type="submit"
            className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} /> Save Settings
          </button>
        </div>
      </form>
    </div>
  );
};
