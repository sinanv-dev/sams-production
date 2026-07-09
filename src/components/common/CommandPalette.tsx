import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Building, Users, DoorOpen, CreditCard,
  Zap, AlertCircle, FileText, Send, BarChart2, ScrollText, Settings,
  Plus, UserPlus, Bell, ChevronRight, ArrowRight, CheckSquare,
  Shield, X
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  keywords?: string[];
  shortcut?: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryOrder = ['Navigation', 'Create', 'Quick Actions'];

const categoryColors: Record<string, string> = {
  'Navigation': 'text-blue-500',
  'Create': 'text-emerald-500',
  'Quick Actions': 'text-violet-500',
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback((path: string) => {
    navigate(path);
    onClose();
  }, [navigate, onClose]);

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-dashboard', label: 'Admin Dashboard', description: 'Go to main dashboard overview', icon: <LayoutDashboard size={16} />, category: 'Navigation', action: () => go('/admin/dashboard'), keywords: ['home', 'overview'] },
    { id: 'nav-owners', label: 'Owner Management', description: 'Manage property owners', icon: <Users size={16} />, category: 'Navigation', action: () => go('/admin/owners'), keywords: ['property owners'] },
    { id: 'nav-customers', label: 'Customer Management', description: 'View and manage tenants', icon: <Users size={16} />, category: 'Navigation', action: () => go('/admin/customers'), keywords: ['tenants', 'residents'] },
    { id: 'nav-apartments', label: 'Apartment Management', description: 'Manage properties', icon: <Building size={16} />, category: 'Navigation', action: () => go('/admin/apartments'), keywords: ['properties', 'buildings'] },
    { id: 'nav-rooms', label: 'Room Management', description: 'View all rooms & status', icon: <DoorOpen size={16} />, category: 'Navigation', action: () => go('/admin/rooms'), keywords: ['units', 'rooms'] },
    { id: 'nav-requests', label: 'Visit Requests', description: 'Approve or reject visit bookings', icon: <CheckSquare size={16} />, category: 'Navigation', action: () => go('/admin/requests'), keywords: ['visits', 'bookings', 'schedule'] },
    { id: 'nav-rent', label: 'Rent Management', description: 'View rent invoices & payments', icon: <CreditCard size={16} />, category: 'Navigation', action: () => go('/admin/rent'), keywords: ['billing', 'invoices', 'payments'] },
    { id: 'nav-electricity', label: 'Electricity Billing', description: 'Utility bills & meter readings', icon: <Zap size={16} />, category: 'Navigation', action: () => go('/admin/electricity'), keywords: ['utility', 'meter', 'units'] },
    { id: 'nav-complaints', label: 'Complaint Management', description: 'Review open complaints', icon: <AlertCircle size={16} />, category: 'Navigation', action: () => go('/admin/complaints'), keywords: ['tickets', 'issues', 'support'] },
    { id: 'nav-documents', label: 'Document Center', description: 'Manage uploaded documents', icon: <FileText size={16} />, category: 'Navigation', action: () => go('/admin/documents'), keywords: ['files', 'docs', 'contracts'] },
    { id: 'nav-notifications', label: 'Notification Center', description: 'Send & manage notifications', icon: <Send size={16} />, category: 'Navigation', action: () => go('/admin/notifications'), keywords: ['alerts', 'messages', 'broadcast'] },
    { id: 'nav-reports', label: 'Reports & Analytics', description: 'Business intelligence reports', icon: <BarChart2 size={16} />, category: 'Navigation', action: () => go('/admin/reports'), keywords: ['analytics', 'charts', 'stats'] },
    { id: 'nav-audit', label: 'Audit Logs', description: 'Full system activity trail', icon: <ScrollText size={16} />, category: 'Navigation', action: () => go('/admin/audit'), keywords: ['logs', 'history', 'activity'] },
    { id: 'nav-admins', label: 'Admin Management', description: 'Manage admin accounts & roles', icon: <Shield size={16} />, category: 'Navigation', action: () => go('/admin/admins'), keywords: ['roles', 'permissions', 'staff'] },
    { id: 'nav-settings', label: 'System Settings', description: 'Platform configuration', icon: <Settings size={16} />, category: 'Navigation', action: () => go('/admin/settings'), keywords: ['config', 'preferences'] },

    // Create
    { id: 'create-owner', label: 'Create New Owner', description: 'Add a new property owner account', icon: <UserPlus size={16} />, category: 'Create', action: () => go('/admin/owners/new'), keywords: ['add owner', 'new owner'] },
    { id: 'create-apartment', label: 'Add New Apartment', description: 'Register a new property', icon: <Plus size={16} />, category: 'Create', action: () => go('/admin/apartments/new'), keywords: ['add apartment', 'new property'] },
    { id: 'create-room', label: 'Add New Room', description: 'Create a room entry', icon: <DoorOpen size={16} />, category: 'Create', action: () => go('/admin/rooms/new'), keywords: ['add room', 'new unit'] },
    { id: 'create-admin', label: 'Create New Admin', description: 'Invite a new admin user', icon: <Shield size={16} />, category: 'Create', action: () => go('/admin/admins/new'), keywords: ['invite admin', 'add staff'] },

    // Quick Actions
    { id: 'action-notify', label: 'Send Notification', description: 'Broadcast message to users', icon: <Bell size={16} />, category: 'Quick Actions', action: () => go('/admin/notifications'), keywords: ['broadcast', 'message', 'alert'] },
    { id: 'action-reports', label: 'View Revenue Report', description: 'Check monthly financials', icon: <BarChart2 size={16} />, category: 'Quick Actions', action: () => go('/admin/reports'), keywords: ['revenue', 'income', 'financial'] },
    { id: 'action-complaints-open', label: 'Open Complaints', description: 'View all unresolved tickets', icon: <AlertCircle size={16} />, category: 'Quick Actions', action: () => go('/admin/complaints'), keywords: ['pending', 'open tickets'] },
  ];

  const filtered = query.trim()
    ? commands.filter(cmd => {
        const q = query.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(q) ||
          cmd.description?.toLowerCase().includes(q) ||
          cmd.keywords?.some(k => k.includes(q)) ||
          cmd.category.toLowerCase().includes(q)
        );
      })
    : commands;

  const grouped = categoryOrder.reduce<Record<string, CommandItem[]>>((acc, cat) => {
    const items = filtered.filter(c => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flatList = Object.values(grouped).flat();

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, flatList.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        flatList[activeIndex]?.action();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, flatList, activeIndex, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-active="true"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Palette box */}
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
          <Search size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, actions, or type a command..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono bg-muted rounded border border-border text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {flatList.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No results for "<span className="font-semibold">{query}</span>"
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider ${categoryColors[category] ?? 'text-muted-foreground'}`}>
                  {category}
                </div>
                {items.map(item => {
                  const isActive = flatIndex === activeIndex;
                  const currentIndex = flatIndex++;
                  return (
                    <button
                      key={item.id}
                      data-active={isActive ? 'true' : undefined}
                      onClick={item.action}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 ${
                        isActive ? 'bg-brand-600/10 text-brand-700 dark:text-brand-300' : 'text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive ? 'bg-brand-600/20 text-brand-600' : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none mb-0.5">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        )}
                      </div>
                      {isActive && <ArrowRight size={14} className="flex-shrink-0 text-brand-500" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-t border-border bg-muted/30 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">↑↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">↵</kbd> Open</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">ESC</kbd> Close</span>
          </div>
          <span className="flex items-center gap-1">
            <ChevronRight size={10} /> {flatList.length} result{flatList.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
