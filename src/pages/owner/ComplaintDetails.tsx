import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getComplaints, updateComplaint, getApartments, getUsers } from '../../firebase/db';
import { Complaint, Apartment, UserProfile } from '../../types';
import { ArrowLeft, ChevronRight, AlertCircle, Clock, CheckCircle2, User, Building2, Save } from 'lucide-react';

export const ComplaintDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit fields
  const [statusVal, setStatusVal] = useState<'open' | 'in-progress' | 'resolved' | 'rejected'>('open');
  const [ownerNotes, setOwnerNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const [allComplaints, allApts, allUsers] = await Promise.all([
        getComplaints(),
        getApartments(),
        getUsers()
      ]);

      const comp = allComplaints.find(c => c.id === id);
      if (!comp) {
        navigate('/owner/complaints');
        return;
      }

      setComplaint(comp);
      setStatusVal(comp.status);
      setOwnerNotes(comp.ownerNotes || '');

      setApartment(allApts.find(a => a.id === comp.apartmentId) || null);
      setCustomer(allUsers.find(u => u.uid === comp.customerId) || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!complaint) return;
    setSaving(true);
    try {
      await updateComplaint(complaint.id, {
        status: statusVal,
        ownerNotes: ownerNotes,
        ...(statusVal === 'resolved' ? { resolvedAt: Date.now() } : {})
      });
      // reload
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!complaint) return null;

  return (
    <div className="space-y-6">
      {/* ── BREADCRUMBS & BACK BUTTON ────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-slate-800 dark:hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft size={14} className="mr-1" /> Back
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>Owner</span>
          <ChevronRight size={12} />
          <Link to="/owner/complaints" className="hover:underline">Complaints</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-bold">Complaint #{complaint.id.slice(-5)}</span>
        </div>
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          Complaint Ticket Detail
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Audit maintenance problems, edit updates, and view logging details.
        </p>
      </div>

      {/* ── MAIN COMPLAINT CARD ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Description */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border ${
                complaint.priority === 'high' ? 'bg-red-50 dark:bg-red-950 text-red-650 dark:text-red-400 border-red-200' :
                complaint.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950 text-amber-650 dark:text-amber-450 border-amber-200' :
                'bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400'
              }`}>
                {complaint.priority} Priority
              </span>
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{complaint.category}</span>
            </div>
            
            <h3 className="text-lg font-black text-foreground">{complaint.title}</h3>
            <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed font-medium">
              {complaint.description}
            </p>

            <div className="border-t border-border pt-4 mt-2 grid grid-cols-2 gap-4 text-xs font-semibold text-muted-foreground">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logged On</p>
                <p className="text-foreground mt-0.5">{new Date(complaint.createdAt).toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution Date</p>
                <p className="text-foreground mt-0.5">
                  {complaint.resolvedAt ? new Date(complaint.resolvedAt).toLocaleString('en-IN') : 'Awaiting resolution'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Log / Owner Response */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-base font-bold text-foreground">Owner Response & Action</h4>
            <div className="space-y-4">
              {/* Select Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-550 dark:text-slate-400 mb-1.5">Ticket Status</label>
                <select
                  value={statusVal}
                  onChange={e => setStatusVal(e.target.value as any)}
                  className="w-full text-sm px-3.5 py-2.5 bg-table-header border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:border-brand-500 text-foreground font-semibold"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              {/* Response Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Action Notes / Owner Notes</label>
                <textarea
                  value={ownerNotes}
                  onChange={e => setOwnerNotes(e.target.value)}
                  placeholder="Describe vendor schedules, maintenance progress notes, or resolution updates here..."
                  className="w-full text-sm px-3.5 py-2.5 bg-table-header border border-slate-250 dark:border-slate-700 rounded-xl focus:outline-none focus:border-brand-500 text-foreground font-medium min-h-[100px]"
                />
              </div>

              <button
                onClick={handleUpdate}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'Updating Ticket...' : 'Save Ticket Updates'}
              </button>
            </div>
          </div>
        </div>

        {/* Customer / Property Info Panel */}
        <div className="space-y-6">
          {/* Customer profile card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User size={15} /> Customer Information
            </h4>
            {customer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 font-black text-sm flex items-center justify-center">
                    {customer.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <Link 
                      to={`/owner/customers/${customer.uid}`}
                      className="font-bold text-sm text-blue-650 dark:text-blue-400 hover:underline"
                    >
                      {customer.displayName}
                    </Link>
                    <p className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold">{customer.role}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 space-y-2 text-xs font-semibold text-muted-foreground">
                  <p className="flex items-center justify-between"><span>Email:</span> <span className="text-foreground font-bold">{customer.email}</span></p>
                  <p className="flex items-center justify-between"><span>Phone:</span> <span className="text-foreground font-bold">{customer.phoneNumber || '—'}</span></p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">No customer profile linked to this complaint.</p>
            )}
          </div>

          {/* Property Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={15} /> Property Reference
            </h4>
            {apartment ? (
              <div className="space-y-3">
                <div>
                  <Link 
                    to={`/owner/apartments/${apartment.id}`}
                    className="font-bold text-sm text-blue-600 dark:text-blue-450 hover:underline block"
                  >
                    {apartment.name}
                  </Link>
                  <p className="text-xs text-slate-550 dark:text-slate-400 font-medium mt-0.5 truncate">{apartment.address}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-bold text-foreground">Room Number: {complaint.roomNumber}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">No apartment references linked.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
