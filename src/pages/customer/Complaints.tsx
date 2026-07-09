import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getComplaints, createComplaint, getRooms, createNotification } from '../../firebase/db';
import { Complaint } from '../../types';
import { AlertCircle, CheckCircle, Clock, Plus, Search, Trash2 } from 'lucide-react';

export const CustomerComplaints: React.FC = () => {
  const { user } = useAuth();
  
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoomId, setUserRoomId] = useState('');
  const [userAptId, setUserAptId] = useState('');
  const [userRoomNum, setUserRoomNum] = useState('');

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'plumbing' | 'electricity' | 'noise' | 'maintenance' | 'other'>('plumbing');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [description, setDescription] = useState('');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [allComplaints, allRooms] = await Promise.all([
        getComplaints(),
        getRooms()
      ]);

      // Filter complaints by current customer
      setComplaints(allComplaints.filter(c => c.customerId === user.uid));

      // Fetch user's room details
      const r = allRooms.find(rm => rm.currentCustomerId === user.uid);
      if (r) {
        setUserRoomId(r.id);
        setUserAptId(r.apartmentId);
        setUserRoomNum(r.roomNumber);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setTitle('');
    setCategory('plumbing');
    setPriority('medium');
    setDescription('');
    setSuccessMsg('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!user || !userRoomId) {
      setErrorMsg("Error: You must be assigned to an active room to log complaints.");
      return;
    }

    if (!title || !description) {
      setErrorMsg("All fields are required.");
      return;
    }

    try {
      // 1. Log Complaint
      await createComplaint({
        customerId: user.uid,
        customerName: user.displayName,
        roomId: userRoomId,
        roomNumber: userRoomNum,
        apartmentId: userAptId,
        title,
        description,
        category,
        priority
      });

      // 2. Alert Admin
      await createNotification({
        recipientId: 'admin-id',
        title: 'New Complaint Logged',
        message: `${user.displayName} (Room ${userRoomNum}) filed complaint: "${title}".`,
        type: 'complaint'
      });

      // 3. Alert Owner John or Jane (mock routing)
      const targetOwnerId = userAptId === 'apt-3' ? 'owner-jane-id' : 'owner-john-id';
      await createNotification({
        recipientId: targetOwnerId,
        title: 'New Complaint Filed',
        message: `A complaint was filed for Room ${userRoomNum}: "${title}".`,
        type: 'complaint'
      });

      setSuccessMsg('Complaint ticket logged successfully! Staff will investigate.');
      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg('');
        loadData();
      }, 2000);

    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit complaint.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Maintenance Tickets</h1>
          <p className="text-muted-foreground text-sm font-medium">Log repair request tickets and coordinate troubleshooting progress.</p>
        </div>
        <button
          onClick={handleOpenModal}
          disabled={!userRoomId}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-navy-200 disabled:text-muted-foreground text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-md shadow-brand-500/10"
        >
          <Plus size={18} />
          <span>Submit Complaint</span>
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : complaints.length === 0 ? (
        <div className="bg-input border border-border rounded-2xl p-12 text-center shadow-sm">
          <CheckCircle className="mx-auto text-emerald-500 w-12 h-12 mb-3" />
          <h3 className="font-bold text-foreground">All Systems Clear</h3>
          <p className="text-navy-450 dark:text-slate-400 text-xs mt-1">You have no pending complaints. Log issues whenever they arise.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {complaints.map((c) => (
            <div 
              key={c.id} 
              className={`bg-input border rounded-2xl p-6 shadow-sm transition-all duration-200 ${
                c.status === 'open' ? 'border-l-4 border-l-red-500 border-slate-200 dark:border-slate-750' :
                c.status === 'in-progress' ? 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-750' :
                'border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-750'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      c.priority === 'high' ? 'bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/30' :
                      c.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-border'
                    }`}>
                      {c.priority} Priority
                    </span>
                    <span className="text-xs text-muted-foreground font-semibold">{c.category.toUpperCase()}</span>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{c.title}</h3>
                  <p className="text-xs text-foreground font-medium leading-relaxed">{c.description}</p>
                  
                  <div className="flex items-center space-x-4 text-[11px] text-muted-foreground font-semibold pt-1 border-t border-navy-50 dark:border-slate-750/50 mt-3">
                    <span>Ticket: {c.id}</span>
                    <span>•</span>
                    <span>Logged: {new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                    c.status === 'open' ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30' :
                    c.status === 'in-progress' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30' :
                    'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                  }`}>
                    {c.status}
                  </span>
                </div>
              </div>

              {/* Progress responses notes display */}
              {(c.adminNotes || c.ownerNotes) && (
                <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-foreground bg-slate-100/50 dark:bg-slate-950/40 p-3 rounded-xl">
                  {c.ownerNotes && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-navy-450 dark:text-slate-400 block font-sans">Owner Update:</span>
                      <p className="text-foreground font-medium">{c.ownerNotes}</p>
                    </div>
                  )}
                  {c.adminNotes && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Admin Action Taken:</span>
                      <p className="text-foreground font-medium">{c.adminNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SUBMIT COMPLAINT DIALOG MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-card rounded-2xl w-full max-w-md border border-border shadow-2xl p-6 relative z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-foreground mb-1">Submit Repair Ticket</h2>
            <p className="text-xs text-muted-foreground mb-4">Please detail the issue for dispatching assistance.</p>

            <form onSubmit={handleSubmitComplaint} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Issue Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Water leak, AC blown"
                  className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
                  >
                    <option value="plumbing">Plumbing</option>
                    <option value="electricity">Electricity</option>
                    <option value="noise">Noise</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Details & Description</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the issue fully (e.g. Kitchen tap is dripping twice per second...)"
                  className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 px-3.5 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors"
                />
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2.5 rounded-lg border border-red-200">{errorMsg}</p>
              )}
              {successMsg && (
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-200 flex items-center">
                  <CheckCircle size={16} className="mr-1.5" /> {successMsg}
                </p>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-navy-200 dark:border-slate-700 text-foreground hover:text-foreground rounded-xl text-sm font-semibold hover:bg-table-row-hover dark:bg-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-brand-500/10 transition-colors"
                >
                  Log Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
