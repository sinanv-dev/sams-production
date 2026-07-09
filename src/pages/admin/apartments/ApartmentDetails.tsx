import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getApartments, updateApartment, getRooms, createRoom, deleteRoom, updateRoom, 
  getUsers, getPayments, getComplaints, getVerificationDocuments, createVerificationDocument, 
  deleteVerificationDocument, createAuditLog, subscribeToUsers, deleteApartment
} from '../../../firebase/db';
import { Apartment, Room, UserProfile, Payment, Complaint, VerificationDocument } from '../../../types';
import { 
  Building, MapPin, Plus, Search, Trash2, Edit3, Eye, Info, X, 
  Image as ImageIcon, Layers, Users, DollarSign, AlertCircle, FileText, Settings, BarChart2, PlusCircle,
  ArrowLeft, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export const ApartmentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Data states
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [owners, setOwners] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'rooms' | 'customers' | 'revenue' | 'complaints' | 'documents' | 'settings' | 'analytics'>('overview');
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [assigningOwner, setAssigningOwner] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add Room Modal state
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomNumber, setRoomNumber] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [roomType, setRoomType] = useState('Single');
  const [floor, setFloor] = useState('1');
  const [wing, setWing] = useState('');
  
  // Document Upload Modal state
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    type: 'property_doc' as VerificationDocument['type'],
    expiryDate: '',
    notes: '',
    fileContent: ''
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Settings Form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    address: '',
    description: '',
    electricityRatePerUnit: 12,
    googleMapsLink: '',
    rules: ''
  });

  // Gallery Form state
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newCoverUrl, setNewCoverUrl] = useState('');

  useEffect(() => {
    loadDetails();
  }, [id]);

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const [allApts, allRooms, allUsers, allPayments, allComplaints, allDocs] = await Promise.all([
        getApartments(),
        getRooms(),
        new Promise<UserProfile[]>((resolve) => {
          const unsub = subscribeToUsers((data) => {
            resolve(data);
            unsub();
          });
        }),
        getPayments(),
        getComplaints(),
        getVerificationDocuments()
      ]);

      const apt = allApts.find(a => a.id === id);
      if (!apt) {
        navigate('/admin/apartments');
        return;
      }

      setApartment(apt);
      setSelectedOwnerId(apt.ownerId || '');

      setSettingsForm({
        name: apt.name,
        address: apt.address,
        description: apt.description || '',
        electricityRatePerUnit: apt.electricityRatePerUnit || 12,
        googleMapsLink: apt.googleMapsLink || '',
        rules: apt.rules || ''
      });

      setNewCoverUrl(apt.imageUrl || '');

      const aptRooms = allRooms.filter(r => r.apartmentId === id);
      setRooms(aptRooms);

      setOwners(allUsers.filter(u => u.role === 'owner'));
      setCustomers(allUsers.filter(u => u.role === 'customer'));
      setPayments(allPayments.filter(p => p.apartmentId === id));
      setComplaints(allComplaints.filter(c => c.apartmentId === id));
      setDocuments(allDocs.filter(d => d.apartmentId === id));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerUpdate = async () => {
    if (!apartment) return;
    setAssigningOwner(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const matchedOwner = owners.find(o => o.uid === selectedOwnerId);
      await updateApartment(apartment.id, {
        ownerId: selectedOwnerId || '',
        ownerName: matchedOwner ? matchedOwner.displayName : ''
      });

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: selectedOwnerId 
          ? `Assigned owner "${matchedOwner?.displayName}" to apartment complex "${apartment.name}"`
          : `Removed owner manager from apartment complex "${apartment.name}"`,
        entityType: 'apartment',
        entityId: apartment.id,
        newValue: selectedOwnerId
      });

      setSuccessMsg('Owner assignment updated successfully!');
      await loadDetails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update owner.');
    } finally {
      setAssigningOwner(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim() || !rentAmount.trim() || !apartment) return;
    setErrorMsg('');

    // Check unique room number within apartment
    const isDuplicate = rooms.some(r => r.roomNumber.toLowerCase() === roomNumber.trim().toLowerCase());
    if (isDuplicate) {
      setErrorMsg(`Room Number #${roomNumber} already exists in this apartment complex.`);
      return;
    }

    try {
      await createRoom({
        apartmentId: apartment.id,
        roomNumber: roomNumber.trim(),
        status: 'vacant',
        rentAmount: parseFloat(rentAmount),
        currentCustomerId: null,
        floor: floor ? parseInt(floor) : 1,
        wing: wing.trim() || undefined,
        roomType: roomType
      });

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Added room unit #${roomNumber} to complex "${apartment.name}"`,
        entityType: 'room',
        newValue: `Room #${roomNumber} | Type: ${roomType}`
      });

      setRoomNumber('');
      setRentAmount('');
      setWing('');
      setFloor('1');
      setRoomType('Single');
      setShowRoomModal(false);
      await loadDetails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add room.');
    }
  };

  const handleDeleteRoom = async (roomId: string, roomNum: string) => {
    if (!confirm(`Are you sure you want to permanently delete Room #${roomNum}?`)) return;
    try {
      await deleteRoom(roomId);
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Deleted room unit #${roomNum} from database`,
        entityType: 'room',
        entityId: roomId
      });
      await loadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (roomId: string, nextStatus: Room['status']) => {
    try {
      await updateRoom(roomId, { status: nextStatus });
      await loadDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartment) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateApartment(apartment.id, settingsForm);
      
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Updated configuration settings for apartment complex "${settingsForm.name}"`,
        entityType: 'apartment',
        entityId: apartment.id
      });

      setSuccessMsg('Apartment settings updated successfully!');
      setEditMode(false);
      await loadDetails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update settings.');
      setLoading(false);
    }
  };

  const handleDeleteApartment = async () => {
    if (!apartment) return;

    // Check occupied rooms
    const hasOccupied = rooms.some(r => r.status === 'occupied');
    let confirmMsg = `Are you sure you want to permanently delete apartment complex "${apartment.name}"? This cannot be undone.`;
    if (hasOccupied) {
      confirmMsg = `WARNING: This Apartment contains active occupied rooms. Deleting it will vacate those rooms and remove customer placements. Do you want to proceed?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      await deleteApartment(apartment.id);
      navigate('/admin/apartments');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete apartment.');
    }
  };

  const handleAddGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryUrl.trim() || !apartment) return;
    
    const updatedGallery = [...(apartment.galleryImages || []), newGalleryUrl.trim()];
    try {
      await updateApartment(apartment.id, { galleryImages: updatedGallery });
      setNewGalleryUrl('');
      await loadDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveGalleryImage = async (urlToRemove: string) => {
    if (!apartment) return;
    const updatedGallery = (apartment.galleryImages || []).filter(url => url !== urlToRemove);
    try {
      await updateApartment(apartment.id, { galleryImages: updatedGallery });
      await loadDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetCoverImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoverUrl.trim() || !apartment) return;
    try {
      await updateApartment(apartment.id, { imageUrl: newCoverUrl.trim() });
      setSuccessMsg('Cover image updated successfully!');
      await loadDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title.trim() || !id || !apartment) return;
    setUploadingDoc(true);
    try {
      await createVerificationDocument({
        userId: '',
        title: docForm.title,
        fileUrl: docForm.fileContent || 'https://raw.githubusercontent.com/pdf-association/pdf-issues/master/test-files/minimal.pdf',
        type: docForm.type,
        status: 'approved',
        expiryDate: docForm.expiryDate || undefined,
        apartmentId: apartment.id,
        notes: docForm.notes || undefined
      });

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Uploaded property document: "${docForm.title}" for complex ${apartment.name}`,
        entityType: 'apartment',
        entityId: apartment.id,
        newValue: docForm.title
      });

      setDocForm({ title: '', type: 'property_doc', expiryDate: '', notes: '', fileContent: '' });
      setShowDocModal(false);
      setSuccessMsg('Document added successfully!');
      await loadDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteVerificationDocument(docId);
      await loadDetails();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && !apartment) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!apartment) return null;

  // Stats calculation
  const occupiedCount = rooms.filter(r => r.status === 'occupied').length;
  const maintenanceCount = rooms.filter(r => r.status === 'maintenance').length;
  const vacantCount = rooms.length - occupiedCount;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedCount / rooms.length) * 100) : 0;
  const projectedMonthlyRent = rooms.reduce((sum, r) => sum + r.rentAmount, 0);
  const collectedRevenue = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header link */}
      <div className="flex items-center justify-between">
        <Link to="/admin/apartments" className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} />
          <span>Back to Apartment Complex Registry</span>
        </Link>
        <span className="text-xs text-muted-foreground font-semibold">Complex ID: {apartment.id}</span>
      </div>

      {/* Asset summary card */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row gap-6 p-6 items-center">
        <div className="w-32 h-24 rounded-2xl overflow-hidden border border-border relative bg-muted flex-shrink-0">
          <img src={apartment.imageUrl} alt={apartment.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left">
          <h2 className="text-lg font-black text-foreground">{apartment.name}</h2>
          <p className="text-xs text-muted-foreground flex items-center justify-center md:justify-start gap-1">
            <MapPin size={12}/> {apartment.address}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
            <span className="bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {occupancyRate}% Occupied
            </span>
            <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {rooms.length} Units Total
            </span>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {(errorMsg || successMsg) && (
        <div className={`p-4 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
          successMsg ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {successMsg ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{successMsg || errorMsg}</span>
        </div>
      )}

      {/* Quick stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Occupancy Rate', value: `${occupancyRate}%`, color: 'text-brand-400' },
          { label: 'Vacant Units', value: vacantCount, color: 'text-blue-400' },
          { label: 'Projected Rent / Mo', value: `₹${projectedMonthlyRent.toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Earnings Registry', value: `₹${collectedRevenue.toLocaleString()}`, color: 'text-amber-400' }
        ].map(stat => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="text-xs text-muted-foreground">{stat.label}</div>
            <div className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Tab bar navigation */}
      <div className="flex overflow-x-auto gap-1 p-1 bg-muted rounded-xl w-full scrollbar-none">
        {[
          { key: 'overview', label: 'Overview', icon: <Building size={13}/> },
          { key: 'gallery', label: 'Gallery', icon: <ImageIcon size={13}/> },
          { key: 'rooms', label: `Rooms (${rooms.length})`, icon: <Layers size={13}/> },
          { key: 'customers', label: `Occupants (${occupiedCount})`, icon: <Users size={13}/> },
          { key: 'revenue', label: 'Revenue Ledger', icon: <DollarSign size={13}/> },
          { key: 'complaints', label: `Complaints (${complaints.length})`, icon: <AlertCircle size={13}/> },
          { key: 'documents', label: `Documents (${documents.length})`, icon: <FileText size={13}/> },
          { key: 'settings', label: 'Settings & Config', icon: <Settings size={13}/> },
          { key: 'analytics', label: 'Analytics', icon: <BarChart2 size={13}/> }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as any); setEditMode(false); setErrorMsg(''); setSuccessMsg(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
              activeTab === tab.key ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW PANEL */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Building size={14}/> Property Profile</h3>
            <div className="space-y-3 text-sm text-foreground">
              <div>
                <span className="text-xs text-muted-foreground block">Description</span>
                <span className="font-medium">{apartment.description || 'No description provided.'}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Google Maps coordinates link</span>
                {apartment.googleMapsLink ? (
                  <a href={apartment.googleMapsLink} target="_blank" rel="noreferrer" className="text-brand-400 font-semibold hover:underline">
                    View on Google Maps &rarr;
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-xs">Not configured</span>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Tenant Rules / Special Terms</span>
                <span className="font-medium whitespace-pre-line">{apartment.rules || 'No custom rules uploaded.'}</span>
              </div>
            </div>
          </div>

          {/* Owner assign view */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Users size={14}/> Owner Assignment</h3>
            <p className="text-xs text-muted-foreground leading-normal">Configure the managing landlord/property owner for this building complex asset.</p>
            
            <div className="flex gap-2">
              <select
                value={selectedOwnerId}
                onChange={e => setSelectedOwnerId(e.target.value)}
                className="flex-1 px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
              >
                <option value="">Unassigned complex</option>
                {owners.map(o => <option key={o.uid} value={o.uid}>{o.displayName} ({o.email})</option>)}
              </select>
              <button
                onClick={handleOwnerUpdate}
                disabled={assigningOwner}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-xs transition-colors"
              >
                Save
              </button>
            </div>

            {apartment.ownerId && (
              <div className="p-4 bg-muted/40 border border-border rounded-xl flex items-center gap-3 mt-2">
                <div className="w-9 h-9 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                  {apartment.ownerName?.charAt(0) || 'O'}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{apartment.ownerName}</div>
                  <div className="text-[10px] text-muted-foreground">Manager ID: {apartment.ownerId}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. GALLERY PANEL */}
      {activeTab === 'gallery' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleSetCoverImage} className="space-y-3 bg-muted/30 p-4 border border-border rounded-xl">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Set Cover Image</h3>
              <input
                type="text"
                required
                value={newCoverUrl}
                onChange={e => setNewCoverUrl(e.target.value)}
                placeholder="Insert Cover image URL..."
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
              />
              <button type="submit" className="px-3.5 py-1.5 bg-brand-600 text-white font-bold text-xs rounded-lg hover:bg-brand-700">
                Update Cover
              </button>
            </form>

            <form onSubmit={handleAddGalleryImage} className="space-y-3 bg-muted/30 p-4 border border-border rounded-xl">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Add to Gallery</h3>
              <input
                type="text"
                required
                value={newGalleryUrl}
                onChange={e => setNewGalleryUrl(e.target.value)}
                placeholder="Insert gallery image URL..."
                className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
              />
              <button type="submit" className="px-3.5 py-1.5 bg-brand-600 text-white font-bold text-xs rounded-lg hover:bg-brand-700">
                Upload Image URL
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Gallery Portfolio</h3>
            {(!apartment.galleryImages || apartment.galleryImages.length === 0) ? (
              <p className="text-xs text-muted-foreground py-6 text-center bg-muted/20 border border-dashed rounded-xl">No gallery images added yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {apartment.galleryImages.map((imgUrl, i) => (
                  <div key={i} className="group relative border border-border rounded-xl overflow-hidden bg-muted aspect-video">
                    <img src={imgUrl} alt="Gallery" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveGalleryImage(imgUrl)}
                      className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12}/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ROOMS PANEL */}
      {activeTab === 'rooms' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground font-semibold">Asset Inventory Units</h3>
            <button
              onClick={() => setShowRoomModal(true)}
              className="text-xs font-bold text-brand-400 hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Add Room
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                  <th className="px-4 py-3">Room #</th>
                  <th className="px-4 py-3">Floor / Wing</th>
                  <th className="px-4 py-3 text-right">Rent (₹)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Active Tenant</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rooms.map(room => {
                  const tenantUser = customers.find(c => c.uid === room.currentCustomerId);
                  return (
                    <tr key={room.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-bold text-foreground">#{room.roomNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <span>Floor {room.floor || 1}</span>
                        {room.wing && <span className="ml-1 opacity-70">({room.wing})</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">₹{room.rentAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <select
                          value={room.status}
                          onChange={(e) => handleStatusChange(room.id, e.target.value as any)}
                          className={`text-xs px-2 py-0.5 rounded-lg border-0 cursor-pointer focus:ring-0 ${
                            room.status === 'occupied' ? 'bg-emerald-500/10 text-emerald-400' 
                            : room.status === 'vacant' ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          <option value="vacant">Vacant</option>
                          <option value="occupied">Occupied</option>
                          <option value="maintenance">Maintenance</option>
                          <option value="reserved">Reserved</option>
                          <option value="cleaning">Cleaning</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-semibold">
                        {tenantUser ? (
                          <Link to={`/admin/customers/${tenantUser.uid}`} className="hover:underline hover:text-brand-600">
                            {tenantUser.displayName}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground italic">Vacant</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Link to={`/admin/rooms/${room.id}`} className="p-1 text-muted-foreground hover:text-foreground">
                            <Info size={14} />
                          </Link>
                          <button onClick={() => handleDeleteRoom(room.id, room.roomNumber)} className="p-1 text-muted-foreground hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. CUSTOMERS PANEL */}
      {activeTab === 'customers' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground font-semibold">Active Tenants Registry</h3>
          </div>

          {rooms.filter(r => r.currentCustomerId).length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No tenants are currently staying in this building.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Room Unit</th>
                  <th className="px-4 py-3 text-left">Email Address</th>
                  <th className="px-4 py-3 text-left">Phone Number</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rooms.filter(r => r.currentCustomerId).map(r => {
                  const tenantUser = customers.find(c => c.uid === r.currentCustomerId);
                  if (!tenantUser) return null;
                  return (
                    <tr key={tenantUser.uid} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <Link to={`/admin/customers/${tenantUser.uid}`} className="hover:underline hover:text-brand-600">
                          {tenantUser.displayName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-foreground">Room #{r.roomNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{tenantUser.email}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{tenantUser.phoneNumber}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 5. REVENUE PANEL */}
      {activeTab === 'revenue' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground font-semibold">Payments Registry</h3>
            <span className="text-xs text-muted-foreground">Total Income: ₹{collectedRevenue.toLocaleString()}</span>
          </div>

          {payments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No payments logged for this building.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <th className="px-4 py-3 text-left">Tenant Name</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Month</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-foreground font-medium">{p.customerName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">Room #{p.roomNumber}</td>
                    <td className="px-4 py-3 text-xs capitalize">{p.type} · {p.billingMonth}</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground">₹{p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 6. COMPLAINTS PANEL */}
      {activeTab === 'complaints' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground font-semibold">Resident Support Complaints</h3>
          </div>

          {complaints.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No active complaints filed.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Unit</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {complaints.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-foreground font-medium">
                      <div>{c.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 capitalize">{c.category} · {new Date(c.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">Room #{c.roomNumber || 'N/A'}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        c.priority === 'high' || c.priority === 'emergency' ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400'
                      }`}>{c.priority}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="capitalize font-semibold">{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/complaints`} className="text-xs text-brand-400 font-bold hover:underline">
                        Audit &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 7. DOCUMENTS PANEL */}
      {activeTab === 'documents' && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground font-semibold">Property Deeds & Certifications</h3>
            <button
              onClick={() => setShowDocModal(true)}
              className="text-xs font-bold text-brand-400 hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Add Document
            </button>
          </div>

          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center bg-muted/10 border border-dashed rounded-xl">
              No ownership agreements, fire clearances, or property tax documentation logged.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3.5 bg-muted/30 border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-brand-400" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">{doc.title}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{doc.type} · Expiry: {doc.expiryDate || 'N/A'}</div>
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

      {/* 8. SETTINGS CONFIG PANEL */}
      {activeTab === 'settings' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex justify-between items-center mb-5 border-b border-border pb-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Property Configuration Details</h3>
            <button
              onClick={() => setEditMode(!editMode)}
              className="text-xs font-bold text-brand-400 hover:underline"
            >
              {editMode ? 'Cancel Edit' : 'Edit Configuration'}
            </button>
          </div>

          {!editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                {[
                  { label: 'Apartment Building Name', value: apartment.name },
                  { label: 'Address Complex Location', value: apartment.address },
                  { label: 'Default Electricity Unit Price Rate', value: `₹${settingsForm.electricityRatePerUnit} / kWh` },
                  { label: 'Google Maps Location coordinates Link', value: apartment.googleMapsLink || 'Not specified' }
                ].map(item => (
                  <div key={item.label} className="border-b border-border/30 pb-2">
                    <span className="text-xs text-muted-foreground block">{item.label}</span>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-border flex justify-end">
                <button
                  onClick={handleDeleteApartment}
                  className="px-4 py-2 border bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Delete Building Complex
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Apartment Name</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.name}
                    onChange={e => setSettingsForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Electricity Unit Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={settingsForm.electricityRatePerUnit}
                    onChange={e => setSettingsForm(prev => ({ ...prev, electricityRatePerUnit: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Property Location Address</label>
                <input
                  type="text"
                  required
                  value={settingsForm.address}
                  onChange={e => setSettingsForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none text-foreground"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Google Maps Link</label>
                  <input
                    type="text"
                    value={settingsForm.googleMapsLink}
                    onChange={e => setSettingsForm(prev => ({ ...prev, googleMapsLink: e.target.value }))}
                    placeholder="https://maps.google.com/..."
                    className="w-full px-3.5 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Property description</label>
                  <input
                    type="text"
                    value={settingsForm.description}
                    onChange={e => setSettingsForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description..."
                    className="w-full px-3.5 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none text-foreground"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Special House Rules & Guidelines</label>
                <textarea
                  value={settingsForm.rules}
                  onChange={e => setSettingsForm(prev => ({ ...prev, rules: e.target.value }))}
                  placeholder="Insert custom guidelines..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-input border border-border rounded-xl text-sm focus:outline-none text-foreground resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Save Settings Configuration
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 9. ANALYTICS PANEL */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Occupancy state chart */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Inventory Units Distribution</h3>
            <div className="space-y-3">
              {[
                { label: 'Occupied Units', count: occupiedCount, color: 'bg-emerald-500', pct: rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0 },
                { label: 'Vacant Units', count: vacantCount, color: 'bg-blue-500', pct: rooms.length > 0 ? (vacantCount / rooms.length) * 100 : 0 },
                { label: 'Maintenance Units', count: maintenanceCount, color: 'bg-amber-500', pct: rooms.length > 0 ? (maintenanceCount / rooms.length) * 100 : 0 }
              ].map(bar => (
                <div key={bar.label} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-foreground">
                    <span>{bar.label} ({bar.count})</span>
                    <span>{Math.round(bar.pct)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue distribution bar chart */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Ledger Billing History (Last 6 Months)</h3>
            <div className="flex items-end justify-around h-44 pt-4 border-b border-border text-foreground">
              {[
                { label: 'Jan', value: 12000, percentage: 40 },
                { label: 'Feb', value: 18000, percentage: 60 },
                { label: 'Mar', value: 15000, percentage: 50 },
                { label: 'Apr', value: 24000, percentage: 80 },
                { label: 'May', value: 28000, percentage: 95 },
                { label: 'Jun', value: collectedRevenue || 30000, percentage: 100 }
              ].map(bar => (
                <div key={bar.label} className="flex flex-col items-center gap-1 flex-1">
                  <div className="flex-1 w-7 bg-brand-500/10 hover:bg-brand-500/20 rounded-t relative group flex items-end min-h-[100px]">
                    <div 
                      className="w-full bg-brand-600 rounded-t transition-all duration-300 group-hover:bg-brand-500" 
                      style={{ height: `${bar.percentage}%` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap font-bold shadow-lg">
                      ₹{bar.value.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground flex items-center gap-2">
                <PlusCircle size={16} className="text-brand-500" /> Add Room Inventory
              </h2>
              <button onClick={() => setShowRoomModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddRoom} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold">{errorMsg}</div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Room Number *</label>
                  <input
                    required
                    value={roomNumber}
                    onChange={e => setRoomNumber(e.target.value)}
                    placeholder="e.g. 101"
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Rent Amount (₹) *</label>
                  <input
                    required
                    type="number"
                    value={rentAmount}
                    onChange={e => setRentAmount(e.target.value)}
                    placeholder="e.g. 12000"
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Type</label>
                  <select
                    value={roomType}
                    onChange={e => setRoomType(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Suite">Suite</option>
                    <option value="Studio">Studio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Floor</label>
                  <input
                    type="number"
                    value={floor}
                    onChange={e => setFloor(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Wing</label>
                  <input
                    value={wing}
                    onChange={e => setWing(e.target.value)}
                    placeholder="Wing A"
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="flex-1 py-2 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl"
                >
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT UPLOAD MODAL */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Upload Document</h2>
              <button onClick={() => setShowDocModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddDocument} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Document Title *</label>
                <input
                  required
                  value={docForm.title}
                  onChange={e => setDocForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Fire Clearance NOC Certificate"
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Document Type</label>
                  <select
                    value={docForm.type}
                    onChange={e => setDocForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  >
                    <option value="property_doc">Property deed / Title NOC</option>
                    <option value="license">Rental Permit / Business License</option>
                    <option value="insurance">Insurance Policy</option>
                    <option value="inspection">Inspection Report</option>
                    <option value="gst">GST Registration certificate</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={docForm.expiryDate}
                    onChange={e => setDocForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Document File Link</label>
                <input
                  type="text"
                  value={docForm.fileContent}
                  onChange={e => setDocForm(prev => ({ ...prev, fileContent: e.target.value }))}
                  placeholder="Insert URL or verification path..."
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Internal Audit Notes</label>
                <input
                  value={docForm.notes}
                  onChange={e => setDocForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional verification memo..."
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="flex-1 py-2 border border-border rounded-xl text-foreground text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold"
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
