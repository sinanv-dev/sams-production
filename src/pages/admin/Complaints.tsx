import React, { useState, useEffect } from 'react';
import { 
  getComplaints, updateComplaint, getUsers, getApartments, createAuditLog 
} from '../../firebase/db';
import { Complaint, UserProfile, Apartment } from '../../types';
import { 
  AlertCircle, CheckCircle, Clock, MessageSquare, Search, Filter, 
  User, ShieldAlert, Sparkles, X, ChevronRight, Send, AlertTriangle
} from 'lucide-react';

export const AdminComplaints: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [owners, setOwners] = useState<UserProfile[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in-progress' | 'resolved' | 'rejected'>('all');
  
  // Timeline and resolution states
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusVal, setStatusVal] = useState<'open' | 'in-progress' | 'resolved' | 'rejected'>('open');
  const [assignedOwnerId, setAssignedOwnerId] = useState('');
  const [priorityVal, setPriorityVal] = useState<'low' | 'medium' | 'high' | 'emergency'>('medium');

  // Customer replies simulation
  const [customerMsg, setCustomerMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allComplaints, allUsers, allApts] = await Promise.all([
        getComplaints(),
        getUsers(),
        getApartments()
      ]);
      setComplaints(allComplaints);
      setOwners(allUsers.filter(u => u.role === 'owner'));
      setApartments(allApts);
      if (activeComplaint) {
        const updated = allComplaints.find(c => c.id === activeComplaint.id);
        if (updated) setActiveComplaint(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTimeline = (comp: Complaint) => {
    setActiveComplaint(comp);
    setAdminNotes(comp.adminNotes || '');
    setStatusVal(comp.status);
    setAssignedOwnerId(comp.assignedOwnerId || '');
    setPriorityVal(comp.priority);
    setShowTimelineModal(true);
  };

  const handleSaveResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeComplaint) return;

    try {
      const selectedOwner = owners.find(o => o.uid === assignedOwnerId);
      
      await updateComplaint(activeComplaint.id, {
        status: statusVal,
        adminNotes,
        priority: priorityVal,
        assignedOwnerId: assignedOwnerId || undefined,
        assignedOwnerName: selectedOwner?.displayName || undefined,
        ...(statusVal === 'resolved' ? { resolvedAt: Date.now() } : {}),
        ...(statusVal === 'rejected' ? { rejectedAt: Date.now() } : {})
      });

      await createAuditLog({
        adminId: 'admin-id',
        adminName: 'System Admin',
        action: `Updated complaint "${activeComplaint.title}" status to ${statusVal.toUpperCase()}`,
        entityType: 'complaint',
        entityId: activeComplaint.id,
        newValue: statusVal
      });

      setShowTimelineModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateReply = async () => {
    if (!activeComplaint || !customerMsg.trim()) return;
    try {
      const updatedNotes = `${activeComplaint.ownerNotes || ''}\n[Customer Reply]: ${customerMsg.trim()}`;
      await updateComplaint(activeComplaint.id, {
        ownerNotes: updatedNotes
      });
      setCustomerMsg('');
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'emergency':
        return 'bg-red-600 text-white animate-pulse border border-red-700';
      case 'high':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'rejected':
        return 'bg-muted text-muted-foreground border border-border';
      case 'in-progress':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.customerName && c.customerName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Maintenance & Complaints</h1>
        <p className="text-muted-foreground text-sm mt-1">Review tenant maintenance requests, assign hosts, track priority levels, and log internal updates.</p>
      </div>

      {/* Filter toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search complaints by title, customer..."
            className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          <AlertCircle size={40} className="mx-auto mb-3 opacity-30 text-brand-500" />
          <p className="font-semibold text-foreground">No complaints filed</p>
          <p className="text-xs mt-1">Tenant support queues are currently clear.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredComplaints.map(comp => (
            <div key={comp.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/20 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getPriorityBadge(comp.priority)}`}>
                    {comp.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(comp.status)}`}>
                    {comp.status}
                  </span>
                </div>

                <h3 className="font-bold text-foreground text-base line-clamp-1">{comp.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 font-semibold flex items-center gap-1">
                  <span>Logged by:</span>
                  <span className="text-foreground">{comp.customerName}</span>
                  <span className="opacity-50">·</span>
                  <span>Room {comp.roomNumber}</span>
                </p>

                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/40">
                  {comp.description}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  Date: {new Date(comp.createdAt).toLocaleDateString()}
                </span>
                
                <button
                  onClick={() => handleOpenTimeline(comp)}
                  className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Manage Timeline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Timeline Modal */}
      {showTimelineModal && activeComplaint && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground text-base flex items-center gap-2">
                  <Sparkles size={16} className="text-brand-400" />
                  Timeline & Logs
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">{activeComplaint.title} (Room {activeComplaint.roomNumber})</p>
              </div>
              <button 
                onClick={() => { setShowTimelineModal(false); setActiveComplaint(null); }}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Timeline chart */}
              <div className="border-l-2 border-brand-500/30 pl-4 ml-2 space-y-4 text-xs font-medium">
                <div className="relative">
                  <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-brand-500 ring-4 ring-brand-500/20" />
                  <div className="text-slate-400 font-semibold">{new Date(activeComplaint.createdAt).toLocaleString()}</div>
                  <div className="text-foreground mt-0.5">Complaint opened by tenant {activeComplaint.customerName}.</div>
                  <p className="text-muted-foreground mt-1 text-[11px] italic bg-muted/40 p-2 rounded-lg border border-border/50">"{activeComplaint.description}"</p>
                </div>

                {activeComplaint.assignedOwnerId && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-blue-400" />
                    <div className="text-slate-400 font-semibold">Assigned Staff</div>
                    <div className="text-foreground mt-0.5">Assigned to Owner manager "{activeComplaint.assignedOwnerName}" for on-site reviews.</div>
                  </div>
                )}

                {activeComplaint.adminNotes && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-amber-400" />
                    <div className="text-slate-400 font-semibold">Admin Internal Note</div>
                    <p className="text-foreground font-semibold bg-amber-500/5 border border-amber-500/10 p-2 rounded-lg mt-0.5">
                      {activeComplaint.adminNotes}
                    </p>
                  </div>
                )}

                {activeComplaint.ownerNotes && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-purple-400" />
                    <div className="text-slate-400 font-semibold">Tenant-Owner Chat History</div>
                    <div className="text-foreground whitespace-pre-wrap mt-0.5 bg-muted/50 p-2.5 rounded-lg border border-border/50">
                      {activeComplaint.ownerNotes}
                    </div>
                  </div>
                )}

                {activeComplaint.resolvedAt && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                    <div className="text-slate-400 font-semibold">{new Date(activeComplaint.resolvedAt).toLocaleString()}</div>
                    <div className="text-emerald-400 font-semibold">Issue marked RESOLVED.</div>
                  </div>
                )}

                {activeComplaint.rejectedAt && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-red-500" />
                    <div className="text-slate-400 font-semibold">{new Date(activeComplaint.rejectedAt).toLocaleString()}</div>
                    <div className="text-red-400 font-semibold">Complaint declined / closed without resolution.</div>
                  </div>
                )}
              </div>

              {/* Chat Simulation Panel */}
              <div className="border-t border-border pt-4">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Simulate Tenant Reply (Sandbox Testing)</label>
                <div className="flex gap-2">
                  <input
                    value={customerMsg}
                    onChange={e => setCustomerMsg(e.target.value)}
                    placeholder="Type simulated tenant reply..."
                    className="flex-1 px-3 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={handleSimulateReply}
                    className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-all"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

              {/* Updates Form */}
              <form onSubmit={handleSaveResolution} className="border-t border-border pt-4 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modify Status & Parameters</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Priority Level</label>
                    <select
                      value={priorityVal}
                      onChange={e => setPriorityVal(e.target.value as any)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="emergency">Emergency Priority</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Workflow Status</label>
                    <select
                      value={statusVal}
                      onChange={e => setStatusVal(e.target.value as any)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs text-foreground focus:outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Assign Owner Manager</label>
                  <select
                    value={assignedOwnerId}
                    onChange={e => setAssignedOwnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs text-foreground focus:outline-none"
                  >
                    <option value="">Select Owner</option>
                    {owners.map(o => <option key={o.uid} value={o.uid}>{o.displayName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Internal Admin Notes</label>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Log review comments, internal resolutions..."
                    rows={2}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => { setShowTimelineModal(false); setActiveComplaint(null); }}
                    className="flex-1 py-2 border border-border text-foreground hover:bg-muted text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl"
                  >
                    Save Resolutions
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
