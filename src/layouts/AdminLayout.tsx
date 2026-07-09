import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Building, Users, CreditCard,
  AlertCircle, Settings, LogOut, Bell, Menu, X, CheckSquare, Shield,
  DoorOpen, BarChart2, ScrollText, Send, FileText, Zap, Search,
  ChevronDown, ChevronRight, UserCircle, HelpCircle, Keyboard,
  Building2, UserCog
} from 'lucide-react';
import { getNotifications, markNotificationRead } from '../firebase/db';
import { Notification } from '../types';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { ThemeSettingsModal } from '../components/common/ThemeSettingsModal';
import { CommandPalette } from '../components/common/CommandPalette';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
  badge?: number | string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, active, onClick, badge }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
      active
        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    <div className="flex items-center space-x-3 min-w-0">
      <div className={`flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}`}>
        {icon}
      </div>
      <span className="font-medium text-sm truncate">{label}</span>
    </div>
    {badge !== undefined && (
      <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
        {badge}
      </span>
    )}
  </Link>
);

interface SidebarGroupProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  hasActive?: boolean;
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({ label, icon, children, defaultOpen = true, hasActive = false }) => {
  const [open, setOpen] = useState(defaultOpen || hasActive);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider mb-1 transition-colors ${
          hasActive ? 'text-brand-500' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div className="space-y-0.5 mb-2">{children}</div>}
    </div>
  );
};

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const isActive = useCallback((path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/'), [location.pathname]);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  // Global Ctrl+K
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(v => !v);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => {
      setShowNotifications(false);
      setShowUserMenu(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await getNotifications(user.uid);
      setNotifications(data.filter(n => !n.read).slice(0, 10));
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const handleNotificationClick = async (notifId: string) => {
    try {
      await markNotificationRead(notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const NavLinks = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
      {/* Main */}
      <SidebarLink
        to="/admin/dashboard"
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        active={isActive('/admin/dashboard')}
        onClick={onLinkClick}
      />

      <SidebarGroup
        label="People"
        icon={<Users size={11} />}
        hasActive={isActive('/admin/owners') || isActive('/admin/customers') || isActive('/admin/admins')}
      >
        <SidebarLink to="/admin/owners" icon={<UserCircle size={17} />} label="Owners" active={isActive('/admin/owners')} onClick={onLinkClick} />
        <SidebarLink to="/admin/customers" icon={<Users size={17} />} label="Customers" active={isActive('/admin/customers')} onClick={onLinkClick} />
        <SidebarLink to="/admin/admins" icon={<UserCog size={17} />} label="Admin Accounts" active={isActive('/admin/admins')} onClick={onLinkClick} />
      </SidebarGroup>

      <SidebarGroup
        label="Properties"
        icon={<Building size={11} />}
        hasActive={isActive('/admin/apartments') || isActive('/admin/rooms') || isActive('/admin/requests')}
      >
        <SidebarLink to="/admin/apartments" icon={<Building2 size={17} />} label="Apartments" active={isActive('/admin/apartments')} onClick={onLinkClick} />
        <SidebarLink to="/admin/rooms" icon={<DoorOpen size={17} />} label="Rooms" active={isActive('/admin/rooms')} onClick={onLinkClick} />
        <SidebarLink to="/admin/requests" icon={<CheckSquare size={17} />} label="Visit Requests" active={isActive('/admin/requests')} onClick={onLinkClick} badge={0} />
      </SidebarGroup>

      <SidebarGroup
        label="Finance"
        icon={<CreditCard size={11} />}
        hasActive={isActive('/admin/rent') || isActive('/admin/electricity')}
      >
        <SidebarLink to="/admin/rent" icon={<CreditCard size={17} />} label="Rent & Billing" active={isActive('/admin/rent')} onClick={onLinkClick} />
        <SidebarLink to="/admin/electricity" icon={<Zap size={17} />} label="Electricity" active={isActive('/admin/electricity')} onClick={onLinkClick} />
      </SidebarGroup>

      <SidebarGroup
        label="Operations"
        icon={<AlertCircle size={11} />}
        hasActive={isActive('/admin/complaints') || isActive('/admin/documents') || isActive('/admin/notifications')}
      >
        <SidebarLink to="/admin/complaints" icon={<AlertCircle size={17} />} label="Complaints" active={isActive('/admin/complaints')} onClick={onLinkClick} />
        <SidebarLink to="/admin/documents" icon={<FileText size={17} />} label="Documents" active={isActive('/admin/documents')} onClick={onLinkClick} />
        <SidebarLink to="/admin/notifications" icon={<Send size={17} />} label="Notifications" active={isActive('/admin/notifications')} onClick={onLinkClick} />
      </SidebarGroup>

      <SidebarGroup
        label="Insights"
        icon={<BarChart2 size={11} />}
        hasActive={isActive('/admin/reports') || isActive('/admin/audit')}
      >
        <SidebarLink to="/admin/reports" icon={<BarChart2 size={17} />} label="Reports & Analytics" active={isActive('/admin/reports')} onClick={onLinkClick} />
        <SidebarLink to="/admin/audit" icon={<ScrollText size={17} />} label="Audit Logs" active={isActive('/admin/audit')} onClick={onLinkClick} />
      </SidebarGroup>

      <div className="pt-2 border-t border-border">
        <SidebarLink to="/admin/settings" icon={<Settings size={17} />} label="Settings" active={isActive('/admin/settings')} onClick={onLinkClick} />
      </div>
    </nav>
  );

  const SidebarBrand = () => (
    <div className="p-5 border-b border-border">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
          <Building size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight tracking-tight">SAMS</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
            <Shield size={9} className="text-emerald-500" /> Super Admin
          </p>
        </div>
      </div>

      {/* Search bar in sidebar */}
      <button
        onClick={() => setCmdOpen(true)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted hover:border-brand-500/30 transition-all duration-200 group"
      >
        <Search size={14} className="flex-shrink-0" />
        <span className="flex-1 text-left text-xs">Search anything...</span>
        <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-card rounded border border-border opacity-60 group-hover:opacity-100 transition-opacity">
          ⌘K
        </kbd>
      </button>
    </div>
  );

  const SidebarFooter = ({ onSettingsClick }: { onSettingsClick: () => void }) => (
    <div className="p-4 border-t border-border bg-sidebar flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-sm border border-brand-500/30 flex-shrink-0">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onSettingsClick}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
          title="Theme Settings"
          type="button"
        >
          <Settings size={15} />
        </button>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center justify-center space-x-2 w-full py-2 px-4 rounded-xl text-sm font-semibold bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white transition-all duration-200"
      >
        <LogOut size={15} />
        <span>Sign Out</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-sidebar text-foreground flex-col hidden lg:flex border-r border-border shadow-xl flex-shrink-0">
        <SidebarBrand />
        <NavLinks />
        <SidebarFooter onSettingsClick={() => setSettingsOpen(true)} />
      </aside>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-navbar border-b border-border h-14 flex items-center justify-between px-4 lg:px-6 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu size={22} />
            </button>
            {/* Breadcrumb area */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Admin</span>
              <ChevronRight size={14} className="text-muted-foreground" />
              <span className="font-semibold text-foreground capitalize">
                {location.pathname.split('/').filter(Boolean).slice(1).join(' › ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Ctrl+K trigger */}
            <button
              onClick={() => setCmdOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted hover:border-brand-500/30 transition-all duration-200"
            >
              <Search size={13} />
              <span>Search</span>
              <kbd className="flex items-center gap-0.5 px-1 py-0.5 text-[9px] font-mono bg-card rounded border border-border">⌘K</kbd>
            </button>

            <ThemeToggle />

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowNotifications(v => !v); setShowUserMenu(false); }}
                className="relative p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  onClick={e => e.stopPropagation()}
                  className="absolute right-0 top-11 w-80 bg-card border border-border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="px-4 pb-2 border-b border-border/50 flex items-center justify-between">
                    <h3 className="font-bold text-sm">Notifications</h3>
                    <button onClick={loadNotifications} className="text-xs text-brand-500 hover:text-brand-600 font-semibold">Refresh</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <Bell size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">All caught up!</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n.id)}
                          className="px-4 py-3 hover:bg-muted/50 cursor-pointer flex flex-col gap-1 transition-colors border-b border-border/30 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">{n.title}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 pt-2 border-t border-border/50">
                    <Link to="/admin/notifications" onClick={() => setShowNotifications(false)} className="text-xs text-brand-500 hover:text-brand-600 font-semibold">
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={e => { e.stopPropagation(); setShowUserMenu(v => !v); setShowNotifications(false); }}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm border border-brand-500/30">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
                </div>
                <ChevronDown size={13} className="text-muted-foreground hidden sm:block" />
              </button>

              {showUserMenu && (
                <div
                  onClick={e => e.stopPropagation()}
                  className="absolute right-0 top-11 w-56 bg-card border border-border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="px-4 py-3 border-b border-border/50">
                    <p className="text-sm font-semibold text-foreground">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-bold uppercase">
                      <Shield size={9} /> Super Admin
                    </span>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setSettingsOpen(true); setShowUserMenu(false); }} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                      <Settings size={14} className="text-muted-foreground" /> Preferences
                    </button>
                    <button onClick={() => setCmdOpen(true)} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                      <Keyboard size={14} className="text-muted-foreground" /> Command Palette
                    </button>
                    <Link to="/admin/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors">
                      <HelpCircle size={14} className="text-muted-foreground" /> System Settings
                    </Link>
                  </div>
                  <div className="pt-1 border-t border-border/50">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="fixed top-0 left-0 bottom-0 w-72 bg-sidebar text-foreground flex flex-col z-50 shadow-2xl animate-in slide-in-from-left duration-250">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
                    <Building size={18} className="text-white" />
                  </div>
                  <div>
                    <h1 className="font-bold text-base">SAMS</h1>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Admin Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <X size={20} />
                </button>
              </div>
              <NavLinks onLinkClick={() => setMobileMenuOpen(false)} />
              <SidebarFooter onSettingsClick={() => { setMobileMenuOpen(false); setSettingsOpen(true); }} />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-5 md:p-7 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      <ThemeSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
};
