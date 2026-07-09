import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  subscribeToRooms, subscribeToApartments, subscribeToUsers, 
  subscribeToComplaints, subscribeToPayments, subscribeToElectricityBills
} from '../firebase/db';
import { Room, Apartment, UserProfile, Complaint, Payment, ElectricityBill } from '../types';
import { 
  LayoutDashboard, Building2, Users, AlertCircle, LogOut, Bell,
  Menu, X, ShieldAlert, Settings, CreditCard, Zap, FileText,
  BarChart2, HelpCircle, ChevronDown, ChevronRight, Search, Eye, Home, Moon, Sun
} from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';

interface SidebarLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
      active 
        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`}
  >
    <div className={`transition-transform duration-150 group-hover:scale-105 flex-shrink-0 ${active ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}`}>
      {icon}
    </div>
    <span className="font-semibold text-sm">{label}</span>
  </Link>
);

export const OwnerLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  // Collapsible sidebar groups state
  const [collapsedGroups, setCollapsedGroups] = useState({
    main: false,
    operations: false,
    analytics: false
  });

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Firestore datasets for global search
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to SAMS datasets for global search
    const unsubApts = subscribeToApartments(setApartments);
    const unsubRooms = subscribeToRooms(setRooms);
    const unsubUsers = subscribeToUsers((usersList) => {
      setCustomers(usersList.filter(u => u.role === 'customer'));
    });
    const unsubComplaints = subscribeToComplaints(setComplaints);
    const unsubPayments = subscribeToPayments(setPayments);
    const unsubBills = subscribeToElectricityBills(setBills);

    return () => {
      unsubApts();
      unsubRooms();
      unsubUsers();
      unsubComplaints();
      unsubPayments();
      unsubBills();
    };
  }, [user]);

  // Filter datasets based on owner's portfolio
  const getOwnerAptIds = () => {
    if (!user) return [];
    if (user.uid === 'owner-john-id') return ['apt-1', 'apt-2'];
    if (user.uid === 'owner-jane-id') return ['apt-3'];
    return apartments.map(a => a.id);
  };

  const ownerAptIds = getOwnerAptIds();
  const filteredApts = apartments.filter(a => ownerAptIds.includes(a.id));
  const filteredRooms = rooms.filter(r => ownerAptIds.includes(r.apartmentId));
  const filteredCustomers = customers.filter(c => {
    const userRoom = rooms.find(r => r.currentCustomerId === c.uid);
    return userRoom && ownerAptIds.includes(userRoom.apartmentId);
  });
  const filteredComplaints = complaints.filter(c => ownerAptIds.includes(c.apartmentId));
  const filteredPayments = payments.filter(p => ownerAptIds.includes(p.apartmentId));
  const filteredBills = bills.filter(b => {
    const userRoom = rooms.find(r => r.id === b.roomId);
    return userRoom && ownerAptIds.includes(userRoom.apartmentId);
  });

  // Calculate search results
  const searchResults = (() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: { title: string; subtitle: string; type: string; route: string; badge?: string }[] = [];

    // Search Apartments
    filteredApts.forEach(apt => {
      if (apt.name.toLowerCase().includes(q) || apt.address.toLowerCase().includes(q)) {
        results.push({
          title: apt.name,
          subtitle: apt.address,
          type: 'Apartment',
          route: `/owner/apartments/${apt.id}`
        });
      }
    });

    // Search Rooms
    filteredRooms.forEach(room => {
      const apt = filteredApts.find(a => a.id === room.apartmentId);
      if (room.roomNumber.includes(q) || (apt && apt.name.toLowerCase().includes(q))) {
        results.push({
          title: `Room ${room.roomNumber}`,
          subtitle: apt ? apt.name : 'Unknown Apartment',
          type: 'Room',
          route: `/owner/rooms/${room.id}`,
          badge: room.status
        });
      }
    });

    // Search Customers
    filteredCustomers.forEach(c => {
      if ((c.displayName || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phoneNumber || '').includes(q)) {
        results.push({
          title: c.displayName || 'Unknown Customer',
          subtitle: c.email || 'No email',
          type: 'Customer',
          route: `/owner/customers/${c.uid}`
        });
      }
    });

    // Search Complaints
    filteredComplaints.forEach(c => {
      if (c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.status.toLowerCase().includes(q)) {
        results.push({
          title: c.title,
          subtitle: `Priority: ${c.priority} • Category: ${c.category}`,
          type: 'Complaint',
          route: `/owner/complaints/${c.id}`,
          badge: c.status
        });
      }
    });

    // Search Payments
    filteredPayments.forEach(p => {
      if (p.billingMonth.toLowerCase().includes(q) || p.status.toLowerCase().includes(q)) {
        results.push({
          title: `Rent Payment - ${p.billingMonth}`,
          subtitle: `₹${p.amount.toLocaleString('en-IN')} • Customer: ${p.customerName}`,
          type: 'Rent',
          route: '/owner/rent',
          badge: p.status
        });
      }
    });

    // Search Bills
    filteredBills.forEach(b => {
      if (b.billingMonth.toLowerCase().includes(q) || b.status.toLowerCase().includes(q)) {
        results.push({
          title: `Electricity Bill - ${b.billingMonth}`,
          subtitle: `₹${b.totalAmount.toLocaleString('en-IN')} • Customer: ${b.customerName}`,
          type: 'Electricity',
          route: `/owner/electricity/${b.id}`,
          badge: b.status
        });
      }
    });

    return results.slice(0, 8);
  })();

  const handleLogout = async () => {
    try { 
      await logout(); 
      navigate('/login'); 
    } catch (err) { 
      console.error(err); 
    }
  };

  const isActive = (path: string) => location.pathname === path || (path !== '/owner/dashboard' && location.pathname.startsWith(path));

  // Collapsible toggle helper
  const toggleGroup = (group: 'main' | 'operations' | 'analytics') => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Keyboard navigation for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const Sidebar = ({ onLinkClick }: { onLinkClick?: () => void }) => (
    <div className="space-y-4">
      {/* Group 1: Business Core */}
      <div>
        <button 
          onClick={() => toggleGroup('main')}
          className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Business Overview</span>
          {collapsedGroups.main ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
        </button>
        {!collapsedGroups.main && (
          <div className="space-y-0.5 mt-1">
            <SidebarLink to="/owner/dashboard" icon={<LayoutDashboard size={18}/>} label="Dashboard" active={isActive('/owner/dashboard')} onClick={onLinkClick} />
            <SidebarLink to="/owner/apartments" icon={<Building2 size={18}/>} label="Apartments" active={isActive('/owner/apartments') && !isActive('/owner/apartments/occupancy')} onClick={onLinkClick} />
            <SidebarLink to="/owner/rooms" icon={<Home size={18}/>} label="Rooms" active={isActive('/owner/rooms')} onClick={onLinkClick} />
            <SidebarLink to="/owner/customers" icon={<Users size={18}/>} label="Customers" active={isActive('/owner/customers')} onClick={onLinkClick} />
          </div>
        )}
      </div>

      {/* Group 2: Operations */}
      <div>
        <button 
          onClick={() => toggleGroup('operations')}
          className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Operations</span>
          {collapsedGroups.operations ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
        </button>
        {!collapsedGroups.operations && (
          <div className="space-y-0.5 mt-1">
            <SidebarLink to="/owner/rent" icon={<CreditCard size={18}/>} label="Rent" active={isActive('/owner/rent')} onClick={onLinkClick} />
            <SidebarLink to="/owner/electricity" icon={<Zap size={18}/>} label="Electricity" active={isActive('/owner/electricity')} onClick={onLinkClick} />
            <SidebarLink to="/owner/complaints" icon={<AlertCircle size={18}/>} label="Complaints" active={isActive('/owner/complaints')} onClick={onLinkClick} />
          </div>
        )}
      </div>

      {/* Group 3: Analytics & Accounts */}
      <div>
        <button 
          onClick={() => toggleGroup('analytics')}
          className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Analytics & Alerts</span>
          {collapsedGroups.analytics ? <ChevronRight size={10} /> : <ChevronDown size={10} />}
        </button>
        {!collapsedGroups.analytics && (
          <div className="space-y-0.5 mt-1">
            <SidebarLink to="/owner/reports" icon={<BarChart2 size={18}/>} label="Reports" active={isActive('/owner/reports')} onClick={onLinkClick} />
            <SidebarLink to="/owner/notifications" icon={<Bell size={18}/>} label="Notifications" active={isActive('/owner/notifications')} onClick={onLinkClick} />
            <SidebarLink to="/owner/settings" icon={<Settings size={18}/>} label="Settings" active={isActive('/owner/settings')} onClick={onLinkClick} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300">
      {/* DESKTOP SIDEBAR */}
      <aside className="w-60 bg-sidebar text-foreground flex flex-col hidden lg:flex border-r border-border shadow-xl flex-shrink-0">
        <div className="p-5 border-b border-border flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 flex-shrink-0">
            <Building2 size={18} className="text-white"/>
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight">SAMS</h1>
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold flex items-center">
              <ShieldAlert size={9} className="mr-1 text-emerald-500"/> Owner Portal
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <Sidebar/>
        </nav>

        <div className="p-4 border-t border-border bg-sidebar flex flex-col space-y-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-450 flex items-center justify-center font-bold text-sm border border-emerald-500/30 flex-shrink-0">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{user?.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 w-full py-2 px-4 rounded-xl text-sm font-semibold bg-red-650/10 hover:bg-red-600 text-red-400 hover:text-white transition-all duration-200"
          >
            <LogOut size={15}/>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP HEADER */}
        <header className="bg-navbar border-b border-border h-16 flex items-center justify-between px-5 z-20 flex-shrink-0">
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Menu size={22}/>
            </button>

            {/* Global Search Input */}
            <div className="relative max-w-md w-full hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                <Search size={15} />
              </div>
              <input
                type="text"
                placeholder="Search portal (Ctrl+K)..."
                onClick={() => setSearchOpen(true)}
                readOnly
                className="w-full pl-9 pr-4 py-1.5 bg-muted/65 border border-border rounded-xl text-xs font-semibold placeholder:text-muted-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-card text-muted-foreground border border-border">
              Owner Portal
            </span>
            <ThemeToggle/>
            
            {/* User drop dropdown */}
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-8 h-8 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-650 flex items-center justify-center font-bold text-sm border border-emerald-500/20 transition-all focus:outline-none"
              >
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'O'}
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-xl z-40 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 border-b border-border">
                      <p className="text-sm font-semibold truncate text-foreground">{user?.displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    
                    <div className="py-1">
                      <Link 
                        to="/owner/settings" 
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <UserIcon size={14} className="mr-2 text-muted-foreground" />
                        <span>Profile</span>
                      </Link>
                      <Link 
                        to="/owner/settings" 
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <Settings size={14} className="mr-2 text-muted-foreground" />
                        <span>Business Settings</span>
                      </Link>
                      <Link 
                        to="/owner/notifications" 
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                      >
                        <Bell size={14} className="mr-2 text-muted-foreground" />
                        <span>Notifications</span>
                      </Link>
                    </div>

                    <div className="border-t border-border py-1">
                      <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-foreground">
                        <span className="flex items-center">
                          <Moon size={14} className="mr-2 text-muted-foreground" />
                          <span>Dark Theme</span>
                        </span>
                        <ThemeToggle />
                      </div>
                    </div>

                    <div className="border-t border-border pt-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center w-full text-left px-4 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut size={14} className="mr-2" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}/>
            <aside className="fixed top-0 left-0 bottom-0 w-64 bg-sidebar text-foreground flex flex-col z-50 animate-in slide-in-from-left duration-200">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                    <Building2 size={18}/>
                  </div>
                  <div>
                    <h1 className="font-bold text-base">SAMS</h1>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Owner Portal</p>
                  </div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X size={20}/>
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 overflow-y-auto">
                <Sidebar onLinkClick={() => setMobileMenuOpen(false)}/>
              </nav>

              <div className="p-4 border-t border-border space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-650 flex items-center justify-center font-bold border border-emerald-500/30 flex-shrink-0">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'O'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{user?.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="flex items-center justify-center space-x-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-red-600/10 hover:bg-red-650 text-red-400 hover:text-white transition-all duration-200">
                  <LogOut size={15}/><span>Sign Out</span>
                </button>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto bg-slate-50/40 dark:bg-slate-950/20 p-5 md:p-7">
          {children}
        </main>
      </div>

      {/* ── SAMS SPOTLIGHT GLOBAL SEARCH MODAL ───────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0" onClick={() => setSearchOpen(false)}></div>
          
          <div className="bg-card border border-border w-full max-w-2xl rounded-3xl shadow-2xl z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-border flex items-center">
              <Search size={18} className="text-muted-foreground mr-3" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across customers, apartments, rooms, complaints, payments..."
                className="w-full bg-transparent text-sm text-foreground font-semibold placeholder:text-muted-foreground placeholder:font-medium focus:outline-none"
              />
              <span className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground font-bold">ESC</span>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-4">
              {!searchQuery.trim() ? (
                <div className="text-center py-10 text-muted-foreground text-xs font-semibold">
                  Type query to search apartments, rooms, customers, complaints, and bills...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs font-semibold">
                  No results found for "{searchQuery}"
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((res, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery('');
                        navigate(res.route);
                      }}
                      className="flex items-center justify-between p-3 hover:bg-muted rounded-xl cursor-pointer transition-colors"
                    >
                      <div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider block">
                          {res.type}
                        </span>
                        <h4 className="text-sm font-semibold text-foreground mt-0.5">{res.title}</h4>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{res.subtitle}</p>
                      </div>
                      
                      {res.badge && (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                          res.badge === 'paid' || res.badge === 'resolved' || res.badge === 'occupied'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : res.badge === 'pending' || res.badge === 'open' || res.badge === 'vacant'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-455 border-rose-500/20'
                        }`}>
                          {res.badge}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Dummy icon placeholder for link component compatibility
const UserIcon = ({ size, className }: { size?: number; className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: size, height: size }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
