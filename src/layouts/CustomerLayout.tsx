import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToRooms, subscribeToNotifications } from '../firebase/db';
import { 
  LayoutDashboard, Building2, CreditCard, Zap, Wrench,
  FolderOpen, CalendarCheck, Bell, Settings, Search,
  LogOut, Menu, X, ShieldCheck, Building, ChevronRight, Mail
} from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, active, badge, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
      active
        ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    <div className="flex items-center space-x-3">
      <div className={`transition-transform duration-200 group-hover:scale-110 flex-shrink-0 ${active ? 'text-white' : ''}`}>
        {icon}
      </div>
      <span className="font-semibold text-sm">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
        active ? 'bg-white/20 text-white' : 'bg-brand-600/10 text-brand-600 dark:text-brand-400'
      }`}>
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </Link>
);

const SidebarSection: React.FC<{ label: string }> = ({ label }) => (
  <div className="px-3 pt-5 pb-1">
    <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.15em]">{label}</span>
  </div>
);

import { runRentReminderEngine } from '../services/reminderEngine';

export const CustomerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasRoom, setHasRoom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { sendVerificationEmail } = useAuth();

  const handleResendEmail = async () => {
    setSendingEmail(true);
    try {
      await sendVerificationEmail();
      alert("Verification email has been resent successfully. Please check your spam/junk folder if you don't receive it shortly.");
    } catch (err: any) {
      alert(err.message || "Failed to resend verification email.");
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    // Trigger client-side smart reminder engine
    runRentReminderEngine(user.uid, user.displayName);

    const unsubRooms = subscribeToRooms((rooms) => {
      const userRoom = rooms.find(r => r.currentCustomerId === user.uid);
      setHasRoom(!!userRoom);
    });
    const unsubNotifs = subscribeToNotifications(user.uid, (notifs) => {
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return () => { unsubRooms(); unsubNotifs(); };
  }, [user]);

  const handleLogout = async () => {
    try { await logout(); navigate('/login'); } catch (err) { console.error(err); }
  };

  const isActive = (path: string) => location.pathname === path;

  const NavContent = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {/* Overview */}
      <SidebarLink
        to="/customer/dashboard"
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        active={isActive('/customer/dashboard')}
        onClick={onLinkClick}
      />

      {hasRoom ? (
        <>
          {/* Room Services */}
          <SidebarSection label="Room Services" />
          <SidebarLink
            to="/customer/apartment"
            icon={<Building2 size={18} />}
            label="My Apartment"
            active={isActive('/customer/apartment')}
            onClick={onLinkClick}
          />
          <SidebarLink
            to="/customer/rent"
            icon={<CreditCard size={18} />}
            label="Rent & Payments"
            active={isActive('/customer/rent')}
            onClick={onLinkClick}
          />
          <SidebarLink
            to="/customer/electricity"
            icon={<Zap size={18} />}
            label="Electricity Bill"
            active={isActive('/customer/electricity')}
            onClick={onLinkClick}
          />
          <SidebarLink
            to="/customer/complaints"
            icon={<Wrench size={18} />}
            label="Maintenance"
            active={isActive('/customer/complaints')}
            onClick={onLinkClick}
          />
          <SidebarLink
            to="/customer/documents"
            icon={<FolderOpen size={18} />}
            label="Documents"
            active={isActive('/customer/documents')}
            onClick={onLinkClick}
          />

          {/* Account */}
          <SidebarSection label="Account" />
          <SidebarLink
            to="/customer/browse"
            icon={<Search size={18} />}
            label="Browse Apartments"
            active={isActive('/customer/browse')}
            onClick={onLinkClick}
          />
          <SidebarLink
            to="/customer/requests"
            icon={<CalendarCheck size={18} />}
            label="Visit Requests"
            active={isActive('/customer/requests')}
            onClick={onLinkClick}
          />
          <SidebarLink
            to="/customer/notifications"
            icon={<Bell size={18} />}
            label="Notifications"
            active={isActive('/customer/notifications')}
            badge={unreadCount}
            onClick={onLinkClick}
          />

          <SidebarLink
            to="/customer/settings"
            icon={<Settings size={18} />}
            label="Settings"
            active={isActive('/customer/settings')}
            onClick={onLinkClick}
          />
        </>
      ) : (
        <>
          {/* Non-tenant nav */}
          <SidebarSection label="Explore" />
          <SidebarLink
            to="/customer/browse"
            icon={<Building2 size={18} />}
            label="Find Apartments"
            active={isActive('/customer/browse')}
            onClick={onLinkClick}
          />
          <SidebarLink
            to="/customer/requests"
            icon={<CalendarCheck size={18} />}
            label="Visit Requests"
            active={isActive('/customer/requests')}
            onClick={onLinkClick}
          />
          <SidebarSection label="Account" />
          <SidebarLink
            to="/customer/notifications"
            icon={<Bell size={18} />}
            label="Notifications"
            active={isActive('/customer/notifications')}
            badge={unreadCount}
            onClick={onLinkClick}
          />
          <SidebarLink
            to="/customer/settings"
            icon={<Settings size={18} />}
            label="Settings"
            active={isActive('/customer/settings')}
            onClick={onLinkClick}
          />
        </>
      )}
    </nav>
  );

  const UserFooter = () => (
    <div className="p-3 border-t border-border space-y-2">
      <div className="flex items-center space-x-3 px-2 py-1.5">
        <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-sm border border-brand-500/20 flex-shrink-0">
          {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'C'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold truncate text-foreground">{user?.displayName}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
        </div>
        <ThemeToggle />
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center justify-center space-x-2 w-full py-2 px-3 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-all duration-200"
      >
        <LogOut size={14} />
        <span>Sign Out</span>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300">
      {/* DESKTOP SIDEBAR */}
      <aside className="w-60 bg-sidebar text-foreground flex-col hidden lg:flex border-r border-border">
        {/* Logo */}
        <div className="p-4 border-b border-border flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0">
            <Building size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight tracking-tight">SAMS</h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center gap-1">
              <ShieldCheck size={8} className="text-emerald-500" /> Tenant Portal
            </p>
          </div>
        </div>

        <NavContent />
        <UserFooter />
      </aside>

      {/* MOBILE HEADER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-navbar border-b border-border h-14 flex items-center justify-between px-4 z-20 flex-shrink-0 lg:hidden">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                <Building size={13} className="text-white" />
              </div>
              <span className="font-bold text-sm">SAMS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/customer/notifications" className="relative p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center font-bold text-sm border border-brand-500/20">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'C'}
            </div>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="bg-navbar border-b border-border h-14 hidden lg:flex items-center justify-between px-6 z-10 flex-shrink-0">
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">My Space</p>
            <h2 className="text-sm font-bold text-foreground leading-tight">
              {location.pathname === '/customer/dashboard' && 'Dashboard'}
              {location.pathname === '/customer/apartment' && 'My Apartment'}
              {location.pathname === '/customer/rent' && 'Rent & Payments'}
              {location.pathname === '/customer/electricity' && 'Electricity Bill'}
              {location.pathname === '/customer/complaints' && 'Maintenance Requests'}
              {location.pathname === '/customer/documents' && 'My Documents'}
              {location.pathname === '/customer/browse' && 'Browse Apartments'}
              {location.pathname === '/customer/requests' && 'Visit Requests'}
              {location.pathname === '/customer/notifications' && 'Notifications'}

              {location.pathname === '/customer/settings' && 'Settings'}
              {location.pathname === '/customer/browse' && 'Find Apartments'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/customer/notifications"
              className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="fixed inset-0 bg-background/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed top-0 left-0 bottom-0 w-60 bg-sidebar text-foreground flex flex-col z-50 animate-in slide-in-from-left duration-250">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center">
                    <Building size={16} className="text-white" />
                  </div>
                  <div>
                    <h1 className="font-bold text-sm">SAMS</h1>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Tenant Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X size={18} />
                </button>
              </div>
              <NavContent onLinkClick={() => setMobileMenuOpen(false)} />
              <UserFooter />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/30 transition-colors duration-300">
          {user && !user.emailVerified && (
            <div className="bg-amber-500/10 border-b border-amber-500/25 text-amber-800 dark:text-amber-400 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-amber-500 flex-shrink-0" />
                <span>Verify your registered email address to ensure full SAMS portal access rights.</span>
              </div>
              <button 
                onClick={handleResendEmail}
                disabled={sendingEmail}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-500/50 text-white font-extrabold rounded-lg transition-colors whitespace-nowrap"
              >
                {sendingEmail ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
