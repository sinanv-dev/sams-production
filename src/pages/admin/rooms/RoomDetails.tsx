import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, DoorOpen, Building, User, Zap, CreditCard,
  UserPlus, UserMinus, Edit2, Wrench, CheckCircle, XCircle, AlertCircle,
  FileText, Plus, Trash2, Eye, ShieldCheck, HelpCircle, Layers, CheckSquare, X
} from 'lucide-react';
import { 
  getRooms, getApartments, getUsers, getPayments, getElectricityBills,
  assignRoomToCustomer, removeRoomFromCustomer, updateRoom, transferCustomer,
  getVerificationDocuments, createVerificationDocument, deleteVerificationDocument, createAuditLog
} from '../../../firebase/db';
import { useAuth } from '../../../context/AuthContext';
import { Room, Apartment, UserProfile, Payment, ElectricityBill, VerificationDocument } from '../../../types';

export const RoomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [room, setRoom] = useState<Room | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [tenant, setTenant] = useState<UserProfile | null>(null);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'media' | 'documents' | 'billing'>('overview');

  // Modal / forms states
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    type: 'inspection' as VerificationDocument['type'],
    expiryDate: '',
    notes: '',
    fileContent: '',
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [rooms, apts, users, pmts, elecs, docs] = await Promise.all([
        getRooms(), getApartments(), getUsers(), getPayments(), getElectricityBills(), getVerificationDocuments()
      ]);
      const r = rooms.find(r => r.id === id);
      if (!r) { navigate('/admin/rooms'); return; }
      setRoom(r);
      setApartment(apts.find(a => a.id === r.apartmentId) || null);
      const tenantUser = r.currentCustomerId ? users.find(u => u.uid === r.currentCustomerId) : null;
      setTenant(tenantUser || null);
      setCustomers(users.filter(u => u.role === 'customer'));
      setPayments(pmts.filter(p => p.roomId === id).sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0)));
      setBills(elecs.filter(b => b.roomId === id).sort((a, b) => b.billingMonth.localeCompare(a.billingMonth)));
      setDocuments(docs.filter(d => d.roomId === id));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleAssign = async () => {
    if (!selectedCustomer || !room) return;
    setAssigning(true);
    try {
      const customer = customers.find(c => c.uid === selectedCustomer);
      await assignRoomToCustomer(room.id, selectedCustomer, customer?.displayName || '', user?.uid || '', user?.displayName || 'Admin');
      setMsg({ type: 'success', text: 'Customer assigned successfully!' });
      setSelectedCustomer('');
      await loadData();
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally { setAssigning(false); }
  };

  const handleRemove = async () => {
    if (!room || !confirm('Remove customer from this room?')) return;
    await removeRoomFromCustomer(room.id, user?.uid || '', user?.displayName || 'Admin');
    setMsg({ type: 'success', text: 'Customer removed. Room is now vacant.' });
    await loadData();
  };

  // Room doc upload
  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim()) return;
    setUploadingDoc(true);
    try {
      await createVerificationDocument({
        userId: '',
        title: docForm.title,
        fileUrl: docForm.fileContent || 'https://raw.githubusercontent.com/pdf-association/pdf-issues/master/test-files/minimal.pdf',
        type: docForm.type,
        status: 'approved',
        expiryDate: docForm.expiryDate || undefined,
        apartmentId: room?.apartmentId,
        roomId: room?.id,
        notes: docForm.notes || undefined
      });

      await createAuditLog({
        adminId: user?.uid || '',
        adminName: user?.displayName || 'Admin',
        action: `Uploaded room document: "${docForm.title}" for room ${room?.roomNumber}`,
        entityType: 'room',
        entityId: room?.id,
        newValue: docForm.title
      });

      setDocForm({ title: '', type: 'inspection', expiryDate: '', notes: '', fileContent: '' });
      setShowDocModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete "${docName}"?`)) return;
    try {
      await deleteVerificationDocument(docId);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return (
    <div className="h-96 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!room) return null;

  const statusColors: Record<string, string> = {
    occupied: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    vacant: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    reserved: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    maintenance: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    cleaning: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/admin/rooms" className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <DoorOpen size={22} className="text-brand-500" />
              Room #{room.roomNumber}
            </h1>
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${statusColors[room.status]}`}>
              {room.status}
            </span>
          </div>
          {apartment && (
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building size={12} /> {apartment.name} · {apartment.address}
            </p>
          )}
        </div>
        <Link to={`/admin/rooms/${id}/edit`} className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 border border-border rounded-xl text-sm font-medium text-foreground transition-colors">
          <Edit2 size={14} /> Edit
        </Link>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm border flex gap-2 items-center ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {msg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'media', label: `Gallery (${(room.images || []).length + (room.coverPhoto ? 1 : 0)})` },
          { key: 'documents', label: `Documents (${documents.length})` },
          { key: 'billing', label: `Billing & Transactions` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              activeTab === t.key ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left main contents */}
        <div className="lg:col-span-2 space-y-5">
          {activeTab === 'overview' && (
            <>
              {/* Details */}
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h2 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Room Specifications</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Room Number', value: `#${room.roomNumber}` },
                    { label: 'Floor', value: room.floor ? `Floor ${room.floor}` : 'Not set' },
                    { label: 'Wing / Block', value: room.wing || 'Not set' },
                    { label: 'Room Type', value: room.roomType || 'Single' },
                    { label: 'Monthly Rent', value: `₹${room.rentAmount.toLocaleString()}` },
                    { label: 'Deposit Settings', value: room.securityDeposit ? `₹${room.securityDeposit.toLocaleString()}` : 'Not set' },
                    { label: 'Maintenance Fee', value: room.maintenanceCharge ? `₹${room.maintenanceCharge.toLocaleString()}/mo` : 'Included' },
                    { label: 'Utility Billing', value: room.electricityBillingType === 'flat' ? 'Flat monthly rate' : 'Metered reading' },
                    { label: 'Meter ID', value: room.electricityMeterId || 'Not set' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="text-foreground font-semibold mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
                {room.description && (
                  <div className="pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">Description</div>
                    <p className="text-foreground text-sm bg-muted/30 p-3 rounded-xl border border-border/50">{room.description}</p>
                  </div>
                )}
              </div>

              {/* Features checklist */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wider text-muted-foreground">Included Amenities & Features</h2>
                {!room.features || room.features.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No specific features listed for this room.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {room.features.map(feat => (
                      <div key={feat} className="flex items-center gap-2 p-2.5 bg-muted/40 border border-border rounded-xl text-sm text-foreground">
                        <CheckSquare size={14} className="text-brand-500" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignment Card */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider text-muted-foreground">Customer Assignment</h2>
                {tenant ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        {tenant.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{tenant.displayName}</div>
                        <div className="text-xs text-muted-foreground">{tenant.email}</div>
                        <div className="text-xs text-muted-foreground">{tenant.phoneNumber}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/admin/customers/${tenant.uid}`} className="px-3 py-1.5 bg-muted hover:bg-muted/80 border border-border rounded-lg text-xs font-medium text-foreground transition-colors">
                        View Profile
                      </Link>
                      <button
                        onClick={handleRemove}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs font-medium text-red-400 transition-colors flex items-center gap-1"
                      >
                        <UserMinus size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">No customer assigned to this room.</p>
                    <div className="flex gap-2">
                      <select
                        value={selectedCustomer}
                        onChange={e => setSelectedCustomer(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-500"
                      >
                        <option value="">Select Customer to Assign</option>
                        {customers.filter(c => c.status === 'active').map(c => (
                          <option key={c.uid} value={c.uid}>{c.displayName} – {c.email}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleAssign}
                        disabled={!selectedCustomer || assigning}
                        className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <UserPlus size={14} /> {assigning ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'media' && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <h2 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Room Media & Photos</h2>
              
              {room.coverPhoto && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-2">Cover Image</h3>
                  <div className="h-48 w-full rounded-xl overflow-hidden border border-border relative bg-muted">
                    <img src={room.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {(!room.images || room.images.length === 0) ? (
                <p className="text-sm text-muted-foreground">No gallery images added yet.</p>
              ) : (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground mb-2">Gallery Photos</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {room.images.map((img, idx) => (
                      <div key={idx} className="h-24 rounded-xl overflow-hidden border border-border bg-muted">
                        <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Room Documents</h2>
                <button
                  onClick={() => setShowDocModal(true)}
                  className="flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300"
                >
                  <Plus size={14} /> Add Document
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <FileText size={32} className="mx-auto mb-2 opacity-30" />
                  No inspection logs, inventories, or records uploaded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-brand-400" />
                        <div>
                          <div className="text-sm font-semibold text-foreground">{doc.title}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{doc.type} · {new Date(doc.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="p-1 text-muted-foreground hover:text-foreground">
                          <Eye size={14} />
                        </a>
                        <button onClick={() => handleDeleteDocument(doc.id, doc.title)} className="p-1 text-muted-foreground hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-4">
              {/* Payment History */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider text-muted-foreground">Rent Payment Records</h2>
                {payments.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">No transaction logs logged.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {payments.map(p => (
                      <div key={p.id} className="flex justify-between py-2.5 items-center">
                        <div>
                          <div className="text-sm font-medium text-foreground capitalize">{p.type} Billing · {p.billingMonth}</div>
                          <div className="text-xs text-muted-foreground">Due: {p.dueDate}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-foreground">₹{p.amount.toLocaleString()}</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Electricity readings */}
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider text-muted-foreground">Electricity Utility Consumption</h2>
                {bills.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">No utility bills logged yet.</div>
                ) : (
                  <div className="divide-y divide-border">
                    {bills.map(b => (
                      <div key={b.id} className="flex justify-between py-2.5 items-center">
                        <div>
                          <div className="text-sm font-medium text-foreground">{b.billingMonth} Consumed</div>
                          <div className="text-xs text-muted-foreground">{b.unitsConsumed} units · Prev: {b.previousReading} / Curr: {b.currentReading}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-foreground">₹{b.totalAmount.toLocaleString()}</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            b.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider text-muted-foreground">Overview Stats</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pricing / Rent</span>
                <span className="font-bold text-foreground">₹{room.rentAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Security Deposit</span>
                <span className="font-bold text-foreground">₹{(room.securityDeposit || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Maintenance Charge</span>
                <span className="font-bold text-foreground">₹{(room.maintenanceCharge || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Electricity Mode</span>
                <span className="font-bold text-foreground capitalize">{room.electricityBillingType || 'Metered'}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground mb-4 text-sm uppercase tracking-wider text-muted-foreground">Quick Status Updates</h2>
            <div className="space-y-2">
              <button
                onClick={() => updateRoom(room.id, { status: 'vacant' }).then(loadData)}
                className="w-full py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm font-semibold text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
              >
                Mark Vacant
              </button>
              <button
                onClick={() => updateRoom(room.id, { status: 'reserved' }).then(loadData)}
                className="w-full py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-sm font-semibold text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
              >
                Mark Reserved
              </button>
              <button
                onClick={() => updateRoom(room.id, { status: 'maintenance' }).then(loadData)}
                className="w-full py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm font-semibold text-amber-400 hover:bg-amber-500 hover:text-white transition-all"
              >
                Mark Maintenance
              </button>
              <button
                onClick={() => updateRoom(room.id, { status: 'cleaning' }).then(loadData)}
                className="w-full py-2 bg-teal-500/10 border border-teal-500/20 rounded-xl text-sm font-semibold text-teal-400 hover:bg-teal-500 hover:text-white transition-all"
              >
                Mark Cleaning
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-250">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Upload Room Document</h2>
              <button onClick={() => setShowDocModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddDocument} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 font-bold uppercase tracking-wider text-xs text-muted-foreground">Document Title *</label>
                <input
                  required
                  value={docForm.title}
                  onChange={e => setDocForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Room Inspection Checklist"
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5 font-bold uppercase tracking-wider text-xs text-muted-foreground">Category</label>
                  <select
                    value={docForm.type}
                    onChange={e => setDocForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  >
                    <option value="inspection">Inspection Report</option>
                    <option value="inventory">Inventory List</option>
                    <option value="maintenance">Maintenance Record</option>
                    <option value="other">Other Record</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5 font-bold uppercase tracking-wider text-xs text-muted-foreground">Expiry Date</label>
                  <input
                    type="date"
                    value={docForm.expiryDate}
                    onChange={e => setDocForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 font-bold uppercase tracking-wider text-xs text-muted-foreground">File Link / Content</label>
                <textarea
                  value={docForm.fileContent}
                  onChange={e => setDocForm(prev => ({ ...prev, fileContent: e.target.value }))}
                  placeholder="Insert direct URL or copy-paste text reports..."
                  rows={3}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5 font-bold uppercase tracking-wider text-xs text-muted-foreground">Review Notes</label>
                <input
                  value={docForm.notes}
                  onChange={e => setDocForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional logs..."
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="flex-1 py-2 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl"
                >
                  {uploadingDoc ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
