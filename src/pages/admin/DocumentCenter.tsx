import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, Upload, Download, Eye, 
  Trash2, RefreshCw, CheckCircle2, AlertTriangle, X, Calendar, Plus, Info
} from 'lucide-react';
import { 
  getVerificationDocuments, createVerificationDocument, 
  deleteVerificationDocument, updateVerificationDocumentStatus,
  getUsers, getApartments, getRooms, createAuditLog
} from '../../firebase/db';
import { useAuth } from '../../context/AuthContext';
import { VerificationDocument, UserProfile, Apartment, Room } from '../../types';

export const DocumentCenter: React.FC = () => {
  const { user } = useAuth();
  
  // Data lists
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  // States
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'lease' | 'id_proof' | 'invoice' | 'receipt' | 'inspection' | 'inventory' | 'maintenance'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeDoc, setActiveDoc] = useState<VerificationDocument | null>(null);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    type: 'other' as VerificationDocument['type'],
    userId: '',
    apartmentId: '',
    roomId: '',
    expiryDate: '',
    notes: '',
    fileContent: '', // simulated file
  });
  
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [docs, usrs, apts, rms] = await Promise.all([
        getVerificationDocuments(),
        getUsers(),
        getApartments(),
        getRooms()
      ]);
      setDocuments(docs);
      setUsers(usrs);
      setApartments(apts);
      setRooms(rms);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 4000);
  };

  // Create document
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title.trim()) {
      showToast('error', 'Title is required');
      return;
    }
    setActionLoading(true);
    try {
      const selectedUser = users.find(u => u.uid === uploadForm.userId);
      const url = uploadForm.fileContent || 'https://raw.githubusercontent.com/pdf-association/pdf-issues/master/test-files/minimal.pdf';
      
      await createVerificationDocument({
        userId: uploadForm.userId,
        userName: selectedUser?.displayName || 'System Admin',
        title: uploadForm.title,
        fileUrl: url,
        type: uploadForm.type,
        status: 'pending',
        expiryDate: uploadForm.expiryDate || undefined,
        apartmentId: uploadForm.apartmentId || undefined,
        roomId: uploadForm.roomId || undefined,
        notes: uploadForm.notes || undefined
      });

      await createAuditLog({
        adminId: user?.uid || '',
        adminName: user?.displayName || 'Admin',
        action: `Uploaded document: "${uploadForm.title}" of type ${uploadForm.type}`,
        entityType: 'system',
        newValue: uploadForm.title
      });

      showToast('success', 'Document uploaded successfully');
      setShowUploadModal(false);
      setUploadForm({
        title: '',
        type: 'other',
        userId: '',
        apartmentId: '',
        roomId: '',
        expiryDate: '',
        notes: '',
        fileContent: '',
      });
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Upload failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Update status
  const handleStatusUpdate = async (id: string, nextStatus: 'approved' | 'rejected') => {
    try {
      const docName = documents.find(d => d.id === id)?.title || 'Document';
      await updateVerificationDocumentStatus(id, nextStatus);
      await createAuditLog({
        adminId: user?.uid || '',
        adminName: user?.displayName || 'Admin',
        action: `Updated status of "${docName}" to ${nextStatus.toUpperCase()}`,
        entityType: 'system',
        newValue: nextStatus
      });
      showToast('success', `Document ${nextStatus} successfully`);
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Status change failed');
    }
  };

  // Delete document
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the document "${name}"?`)) return;
    try {
      await deleteVerificationDocument(id);
      await createAuditLog({
        adminId: user?.uid || '',
        adminName: user?.displayName || 'Admin',
        action: `Deleted document "${name}"`,
        entityType: 'system',
        newValue: 'Deleted'
      });
      showToast('success', 'Document deleted successfully');
      await loadAllData();
    } catch (err: any) {
      showToast('error', err.message || 'Deletion failed');
    }
  };

  const getEntityLabel = (doc: VerificationDocument) => {
    if (doc.roomId) {
      const rm = rooms.find(r => r.id === doc.roomId);
      const apt = apartments.find(a => a.id === doc.apartmentId);
      return `Room ${rm?.roomNumber || doc.roomId} (${apt?.name || 'Apt'})`;
    }
    if (doc.apartmentId) {
      const apt = apartments.find(a => a.id === doc.apartmentId);
      return apt?.name || 'Apartment';
    }
    if (doc.userId) {
      const usr = users.find(u => u.uid === doc.userId);
      return usr ? `${usr.displayName} (${usr.role})` : 'Unknown User';
    }
    return 'General';
  };

  const filteredDocs = documents.filter(d => {
    const matchesSearch = 
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      d.type.toLowerCase().includes(search.toLowerCase());
      
    const matchesCategory = categoryFilter === 'all' || d.type === categoryFilter;
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <FileText size={24} className="text-brand-500" />
            Document Center
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Manage, review, approve, and upload agreements, property deeds, IDs, and billing receipts.</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-md shadow-brand-500/10"
        >
          <Upload size={16} />
          <span>Upload Document</span>
        </button>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-xl text-sm border flex gap-2 items-center ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents by title, uploader..."
            className="w-full pl-9 pr-4 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-brand-500"
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as any)}
          className="px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Document Types</option>
          <option value="lease">Leases & Agreements</option>
          <option value="id_proof">Identity Proofs</option>
          <option value="invoice">Invoices</option>
          <option value="receipt">Receipts</option>
          <option value="inspection">Inspection Reports</option>
          <option value="inventory">Inventory Lists</option>
          <option value="maintenance">Maintenance Records</option>
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2.5 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none focus:border-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center text-muted-foreground">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-foreground">No documents found</p>
          <p className="text-xs mt-1">Try relaxing filters or upload a new record.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg hover:border-brand-500/20 transition-all duration-200">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${getStatusBadge(doc.status)}`}>
                    {doc.status}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase bg-muted px-2 py-0.5 rounded">
                    {doc.type.replace('_', ' ')}
                  </span>
                </div>
                
                <h3 className="font-bold text-foreground text-base line-clamp-1">{doc.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span>Owner:</span>
                  <span className="font-medium text-foreground">{getEntityLabel(doc)}</span>
                </p>
                
                {doc.expiryDate && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Expires: {doc.expiryDate}</span>
                  </p>
                )}
                
                {doc.notes && (
                  <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50 mt-3 italic line-clamp-2">
                    {doc.notes}
                  </p>
                )}
              </div>
              
              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveDoc(doc);
                      setShowPreviewModal(true);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-brand-500 hover:bg-brand-500/10 rounded-lg transition-colors"
                    title="Preview Document"
                  >
                    <Eye size={15} />
                  </button>
                  <a
                    href={doc.fileUrl}
                    download={doc.title}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    title="Download File"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {doc.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleStatusUpdate(doc.id, 'approved')}
                      className="px-2.5 py-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold hover:bg-emerald-600 hover:text-white transition-all"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(doc.id, 'rejected')}
                      className="px-2.5 py-1 bg-red-600/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition-all"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <Upload size={18} className="text-brand-500" />
                Upload New Document
              </h2>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Document Title *</label>
                <input
                  required
                  value={uploadForm.title}
                  onChange={e => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Lease Agreement - Room 101"
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Document Category</label>
                  <select
                    value={uploadForm.type}
                    onChange={e => setUploadForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  >
                    <option value="lease">Lease Agreement</option>
                    <option value="id_proof">Identity Proof</option>
                    <option value="invoice">Invoice</option>
                    <option value="receipt">Receipt</option>
                    <option value="inspection">Inspection Report</option>
                    <option value="inventory">Inventory List</option>
                    <option value="maintenance">Maintenance Record</option>
                    <option value="other">Other File</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={uploadForm.expiryDate}
                    onChange={e => setUploadForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-border/50 pt-3">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Link Entity (Optional)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select
                      value={uploadForm.userId}
                      onChange={e => setUploadForm(prev => ({ ...prev, userId: e.target.value, apartmentId: '', roomId: '' }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    >
                      <option value="">Link to User</option>
                      {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>)}
                    </select>
                  </div>
                  <div>
                    <select
                      value={uploadForm.apartmentId}
                      onChange={e => setUploadForm(prev => ({ ...prev, apartmentId: e.target.value, userId: '', roomId: '' }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    >
                      <option value="">Link to Complex</option>
                      {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {uploadForm.apartmentId && (
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Link Room</label>
                  <select
                    value={uploadForm.roomId}
                    onChange={e => setUploadForm(prev => ({ ...prev, roomId: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  >
                    <option value="">Select Room</option>
                    {rooms.filter(r => r.apartmentId === uploadForm.apartmentId).map(r => (
                      <option key={r.id} value={r.id}>Room #{r.roomNumber}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Document File (URL or Text Content)</label>
                <textarea
                  value={uploadForm.fileContent}
                  onChange={e => setUploadForm(prev => ({ ...prev, fileContent: e.target.value }))}
                  placeholder="Paste document text or direct file URL..."
                  rows={3}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Internal Notes</label>
                <input
                  value={uploadForm.notes}
                  onChange={e => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Review notes, comments..."
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
                >
                  {actionLoading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && activeDoc && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-3xl h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground text-base">{activeDoc.title}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Uploaded on {new Date(activeDoc.createdAt).toLocaleDateString()}</p>
              </div>
              <button 
                onClick={() => {
                  setShowPreviewModal(false);
                  setActiveDoc(null);
                }}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 bg-muted p-4 overflow-auto flex items-center justify-center">
              {activeDoc.fileUrl.startsWith('http') && activeDoc.fileUrl.endsWith('.pdf') ? (
                <iframe 
                  src={activeDoc.fileUrl} 
                  className="w-full h-full border-0 rounded-lg shadow-sm"
                  title="PDF Document Preview"
                />
              ) : (
                <div className="w-full h-full bg-card border border-border rounded-xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-brand-400">
                      <Info size={16} />
                      <span className="text-xs font-semibold uppercase tracking-wider">Document Preview Console</span>
                    </div>
                    <div className="text-foreground text-sm font-mono whitespace-pre-wrap bg-muted/65 p-4 rounded-xl border border-border/50 max-h-[50vh] overflow-y-auto">
                      {activeDoc.fileUrl || 'No content provided.'}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right italic">
                    Type: {activeDoc.type} · Status: {activeDoc.status}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
