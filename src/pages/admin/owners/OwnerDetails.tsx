import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  updateUserProfile, updateApartment, updateRoom, deleteRoom, deleteApartment, deleteUser,
  createVerificationDocument, deleteVerificationDocument, createAuditLog, 
  subscribeToUsers, subscribeToApartments, subscribeToRooms, subscribeToPayments, 
  subscribeToVerificationDocuments, subscribeToAuditLogs, subscribeToElectricityBills,
  subscribeToComplaints, updateVerificationDocumentStatus,
  createApartment, createRoom, assignRoomToCustomer, transferCustomer, removeRoomFromCustomer,
  uploadFile, getStorageItem, setStorageItem
} from '../../../firebase/db';
import { isFirebaseConfigured, db } from '../../../firebase/config';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { UserProfile, Apartment, Room, Payment, VerificationDocument, AuditLog, ElectricityBill, Complaint } from '../../../types';
import { 
  Building, Mail, Phone, ArrowLeft, Edit3, Settings, FileText, 
  DollarSign, CheckCircle2, ShieldCheck, X, Eye, Trash2, Plus, Calendar, 
  Landmark, User, Users, Clock, AlertTriangle, FileCode, Check, RefreshCw, Layers, MapPin,
  Download, Upload, ArrowRightLeft, UserMinus, AlertCircle, Bell, ExternalLink, Printer, Search, ChevronRight,
  Camera, Edit2, Shield
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

// Helper component for loading skeletons
const SkeletonLoader: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-16 bg-muted dark:bg-slate-800 rounded-2xl w-full" />
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-muted dark:bg-slate-800 rounded-2xl" />
      ))}
    </div>
    <div className="h-80 bg-muted dark:bg-slate-800 rounded-3xl w-full" />
  </div>
);

// Helper component for friendly empty states
const EmptyState: React.FC<{ title: string; desc: string; icon?: React.ReactNode }> = ({ title, desc, icon }) => (
  <div className="bg-card border border-border rounded-2xl p-10 text-center shadow-sm max-w-lg mx-auto my-6">
    <div className="mx-auto w-12 h-12 mb-3 text-muted-foreground flex items-center justify-center bg-muted dark:bg-slate-800 rounded-full">
      {icon || <Building size={20} />}
    </div>
    <h3 className="font-bold text-foreground text-sm">{title}</h3>
    <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{desc}</p>
  </div>
);

// File Uploader Component integrating with storage / sandbox
const FileUploader: React.FC<{
  label: string;
  path: string;
  accept?: string;
  onUploadComplete: (url: string) => void;
  className?: string;
}> = ({ label, path, accept = '*/*', onUploadComplete, className }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setProgress(10);
    try {
      const interval = setInterval(() => {
        setProgress(prev => (prev >= 90 ? 90 : prev + 15));
      }, 80);

      const downloadUrl = await uploadFile(file, path);
      clearInterval(interval);
      setProgress(100);
      onUploadComplete(downloadUrl);
    } catch (err: any) {
      console.error('Upload failed: ', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 500);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold text-muted-foreground uppercase">{label}</label>
      <div className="relative border-2 border-dashed border-border hover:border-brand-500/50 rounded-xl p-4 flex flex-col items-center justify-center bg-input/20 dark:bg-slate-800/10 hover:bg-input/40 dark:hover:bg-slate-800/20 transition-all duration-200">
        {uploading ? (
          <div className="flex flex-col items-center space-y-2 py-1">
            <RefreshCw size={22} className="text-brand-500 animate-spin" />
            <span className="text-[10px] font-bold text-muted-foreground">Uploading ({progress}%)</span>
          </div>
        ) : (
          <label className="flex flex-col items-center cursor-pointer py-1 space-y-1.5 w-full text-center">
            <Upload size={20} className="text-muted-foreground" />
            <span className="text-[11px] font-bold text-brand-500 dark:text-brand-400 hover:underline">Select or Drop File</span>
            <input type="file" accept={accept} onChange={handleFileChange} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
};

export const OwnerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Real-time states
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [allApartments, setAllApartments] = useState<Apartment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [electricityBills, setElectricityBills] = useState<ElectricityBill[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Search & Filters
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({
    rooms: '',
    customers: '',
    payments: '',
    complaints: '',
    documents: '',
    timeline: ''
  });
  const [filters, setFilters] = useState<Record<string, string>>({
    roomsStatus: 'all',
    roomsType: 'all',
    customersStatus: 'all',
    paymentsType: 'all',
    paymentsStatus: 'all',
    complaintsPriority: 'all',
    complaintsStatus: 'all',
    documentsType: 'all'
  });
  const [sortOptions, setSortOptions] = useState<Record<string, { field: string; direction: 'asc' | 'desc' }>>({
    rooms: { field: 'roomNumber', direction: 'asc' },
    customers: { field: 'displayName', direction: 'asc' },
    payments: { field: 'dueDate', direction: 'desc' },
    complaints: { field: 'createdAt', direction: 'desc' },
    documents: { field: 'createdAt', direction: 'desc' }
  });

  // Pagination states
  const [pageIndices, setPageIndices] = useState<Record<string, number>>({
    rooms: 1,
    customers: 1,
    payments: 1,
    complaints: 1,
    documents: 1,
    timeline: 1
  });
  const itemsPerPage = 5;

  // Selected references for Modals
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<UserProfile | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [previewDoc, setPreviewDoc] = useState<VerificationDocument | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPortalPreview, setShowPortalPreview] = useState(false);

  // Forms states
  const [personalForm, setPersonalForm] = useState<any>({});
  const [businessForm, setBusinessForm] = useState<any>({});
  const [bankForm, setBankForm] = useState<any>({});
  const [settingsForm, setSettingsForm] = useState<any>({});
  const [headerForm, setHeaderForm] = useState<any>({});
  
  const [apartmentForm, setApartmentForm] = useState({ name: '', address: '', description: '', electricityRatePerUnit: 12, imageUrl: '', totalRooms: 0 });
  const [roomForm, setRoomForm] = useState({ roomNumber: '', rentAmount: 10000, securityDeposit: 10000, roomType: 'Single', floor: 1, wing: '' });
  const [assignCustomerForm, setAssignCustomerForm] = useState({ customerId: '' });
  const [transferForm, setTransferForm] = useState({ newRoomId: '' });
  const [billForm, setBillForm] = useState({ customerId: '', type: 'rent' as 'rent' | 'electricity', amount: 10000, billingMonth: '', dueDate: '' });
  const [recordPaymentForm, setRecordPaymentForm] = useState({ paidAt: '', referenceId: '', paymentMethod: 'UPI' });
  const [docUploadForm, setDocUploadForm] = useState({ title: '', type: 'pan' as VerificationDocument['type'], expiryDate: '', fileUrl: '', notes: '' });
  const [notificationForm, setNotificationForm] = useState({ title: '', message: '' });

  // Database Subscriptions Setup
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMsg({ type: '', text: '' });

    const unsubUsers = subscribeToUsers((usersList) => {
      const profile = usersList.find(u => u.uid === id);
      if (profile) {
        if (profile.role !== 'owner') {
          navigate('/admin/owners');
          return;
        }
        setOwner(profile);
        setHeaderForm({
          displayName: profile.displayName || '',
          email: profile.email || '',
          phoneNumber: profile.phoneNumber || '',
          status: profile.status || 'active',
          photoUrl: profile.photoUrl || ''
        });

        // Parse nested metadata structure
        let metadata = { personal: {}, business: {}, bank: {}, settings: {} };
        try {
          if (profile.parentDetails && profile.parentDetails.startsWith('{')) {
            metadata = JSON.parse(profile.parentDetails);
          }
        } catch (e) {}

        setPersonalForm({
          displayName: profile.displayName || '',
          dob: profile.dob || (metadata.personal as any)?.dob || '',
          gender: profile.gender || (metadata.personal as any)?.gender || '',
          nationality: profile.nationality || (metadata.personal as any)?.nationality || '',
          email: profile.email || '',
          phoneNumber: profile.phoneNumber || '',
          alternatePhone: (metadata.personal as any)?.alternatePhone || '',
          address: profile.address || (metadata.personal as any)?.address || '',
          city: (metadata.personal as any)?.city || '',
          state: (metadata.personal as any)?.state || '',
          country: (metadata.personal as any)?.country || '',
          postalCode: (metadata.personal as any)?.postalCode || '',
          emergencyContact: profile.emergencyContact || (metadata.personal as any)?.emergencyContact || '',
          emergencyPhone: (metadata.personal as any)?.emergencyPhone || '',
          notes: (metadata.personal as any)?.notes || '',
          photoUrl: profile.photoUrl || ''
        });

        setBusinessForm({
          businessName: (metadata.business as any)?.businessName || '',
          companyName: (metadata.business as any)?.companyName || '',
          officeAddress: (metadata.business as any)?.officeAddress || '',
          businessRegistrationNumber: (metadata.business as any)?.businessRegistrationNumber || '',
          gst: (metadata.business as any)?.gst || '',
          pan: (metadata.business as any)?.pan || '',
          taxId: (metadata.business as any)?.taxId || '',
          website: (metadata.business as any)?.website || '',
          businessEmail: (metadata.business as any)?.businessEmail || '',
          businessPhone: (metadata.business as any)?.businessPhone || '',
          notes: (metadata.business as any)?.notes || ''
        });

        setBankForm({
          bankAccountName: (metadata.bank as any)?.bankAccountName || '',
          bankName: (metadata.bank as any)?.bankName || '',
          bankAccountNumber: (metadata.bank as any)?.bankAccountNumber || '',
          bankIFSC: (metadata.bank as any)?.bankIFSC || '',
          bankBranch: (metadata.bank as any)?.bankBranch || '',
          upiId: (metadata.bank as any)?.upiId || '',
          paymentQrUrl: (metadata.bank as any)?.paymentQrUrl || '',
          preferredPaymentMethod: (metadata.bank as any)?.preferredPaymentMethod || 'UPI'
        });

        setSettingsForm({
          emailNotifications: (metadata.settings as any)?.emailNotifications !== false,
          smsNotifications: (metadata.settings as any)?.smsNotifications !== false,
          accountVisibility: (metadata.settings as any)?.accountVisibility || 'public',
          defaultCurrency: (metadata.settings as any)?.defaultCurrency || 'INR',
          defaultElectricityRate: (metadata.settings as any)?.defaultElectricityRate || 12,
          defaultDeposit: (metadata.settings as any)?.defaultDeposit || 10000,
          defaultRentCollectionDate: (metadata.settings as any)?.defaultRentCollectionDate || 5
        });
      }
      setAllUsers(usersList);
      setLoading(false);
    });

    const unsubApts = subscribeToApartments((allApts) => {
      setAllApartments(allApts);
      setApartments(allApts.filter(a => a.ownerId === id));
    });

    const unsubRooms = subscribeToRooms((allRooms) => setRooms(allRooms));
    const unsubPmts = subscribeToPayments((allPmts) => setPayments(allPmts));
    const unsubElec = subscribeToElectricityBills((allBills) => setElectricityBills(allBills));
    const unsubDocs = subscribeToVerificationDocuments((allDocs) => setDocuments(allDocs));
    const unsubLogs = subscribeToAuditLogs((logs) => setTimeline(logs));
    const unsubComplaints = subscribeToComplaints((complaintsList) => setComplaints(complaintsList));

    return () => {
      unsubUsers();
      unsubApts();
      unsubRooms();
      unsubPmts();
      unsubElec();
      unsubDocs();
      unsubLogs();
      unsubComplaints();
    };
  }, [id]);

  // Dynamic Calculations (Single Source of Truth)
  const ownerAptIds = apartments.map(a => a.id);
  const ownerRooms = rooms.filter(r => r.ownerId === id || ownerAptIds.includes(r.apartmentId));
  const ownerCustomers = allUsers.filter(u => 
    u.role === 'customer' && 
    (u.ownerId === id || ownerRooms.some(r => r.currentCustomerId === u.uid))
  );

  const occupiedCount = ownerRooms.filter(r => r.status === 'occupied').length;
  const vacantCount = ownerRooms.filter(r => r.status === 'vacant').length;
  const maintenanceCount = ownerRooms.filter(r => r.status === 'maintenance').length;
  
  const monthlyRevenue = ownerRooms
    .filter(r => r.status === 'occupied')
    .reduce((sum, r) => sum + (r.rentAmount || r.rent || 0), 0);

  const electricityRevenue = electricityBills
    .filter(b => b.status === 'paid' && ownerAptIds.includes(b.apartmentId))
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const pendingRent = payments
    .filter(p => p.type === 'rent' && p.status === 'pending' && ownerAptIds.includes(p.apartmentId))
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingElectricity = electricityBills
    .filter(b => b.status === 'unpaid' && ownerAptIds.includes(b.apartmentId))
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const totalSecurityDeposits = ownerRooms
    .filter(r => r.status === 'occupied')
    .reduce((sum, r) => sum + (r.securityDeposit || 0), 0);

  const ownerPayments = payments.filter(p => ownerAptIds.includes(p.apartmentId));
  const ownerDocuments = documents.filter(d => d.userId === id || (d.apartmentId && ownerAptIds.includes(d.apartmentId)));
  const ownerTimeline = timeline.filter(l => l.entityId === id || ownerAptIds.includes(l.entityId || ''));
  const ownerComplaints = complaints.filter(c => ownerAptIds.includes(c.apartmentId));

  const openComplaintsCount = ownerComplaints.filter(c => c.status === 'open' || c.status === 'in-progress').length;
  const resolvedComplaintsCount = ownerComplaints.filter(c => c.status === 'resolved').length;
  const assignableApartments = allApartments.filter(a => !a.ownerId);

  // Form saving logic nested parentDetails structure
  const handleSaveNestedMetadata = async (section: 'personal' | 'business' | 'bank' | 'settings', payload: any) => {
    if (!id || !owner) return;
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      let currentMetadata: any = { personal: {}, business: {}, bank: {}, settings: {} };
      try {
        if (owner.parentDetails && owner.parentDetails.startsWith('{')) {
          currentMetadata = JSON.parse(owner.parentDetails);
        }
      } catch (e) {}

      currentMetadata[section] = payload;

      const flatUpdates: any = {
        parentDetails: JSON.stringify(currentMetadata)
      };

      // Sync root attributes
      if (section === 'personal') {
        flatUpdates.displayName = payload.displayName || owner.displayName;
        flatUpdates.dob = payload.dob;
        flatUpdates.gender = payload.gender;
        flatUpdates.nationality = payload.nationality;
        flatUpdates.address = payload.address;
        flatUpdates.emergencyContact = payload.emergencyContact;
        flatUpdates.photoUrl = payload.photoUrl;
        flatUpdates.phoneNumber = payload.phoneNumber;
      }
      if (section === 'business') {
        flatUpdates.businessInfo = payload.businessName;
      }

      await updateUserProfile(id, flatUpdates, user?.role);
      
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Modified ${section} information of owner "${owner.displayName}"`,
        entityType: 'user',
        entityId: id
      });

      setMsg({ type: 'success', text: `Owner ${section} profile saved successfully.` });
      setActiveDrawer(null);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !owner) return;
    setSaving(true);
    try {
      await updateUserProfile(id, {
        displayName: headerForm.displayName,
        email: headerForm.email,
        phoneNumber: headerForm.phoneNumber,
        status: headerForm.status,
        photoUrl: headerForm.photoUrl
      }, user?.role);

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Updated basic profile information for "${headerForm.displayName}"`,
        entityType: 'user',
        entityId: id
      });

      setMsg({ type: 'success', text: 'Profile headers saved successfully!' });
      setActiveDrawer(null);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Headers update failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPasswordAction = async () => {
    if (!owner) return;
    if (!confirm(`Are you sure you want to dispatch a password reset recovery link to ${owner.email}?`)) return;
    try {
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Dispatched password reset recovery mail to owner "${owner.displayName}"`,
        entityType: 'user',
        entityId: id
      });
      alert(`Simulation: Password reset email successfully dispatched to ${owner.email}!`);
    } catch (e) {}
  };

  const handleToggleStatus = async () => {
    if (!owner || !id) return;
    const nextStatus = owner.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to change this Owner's status to ${nextStatus.toUpperCase()}?`)) return;
    try {
      await updateUserProfile(id, { status: nextStatus }, user?.role);
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Toggled status of owner "${owner.displayName}" to ${nextStatus}`,
        entityType: 'user',
        entityId: id
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOwner = async () => {
    if (!owner || !id) return;
    let confirmMsg = `Are you sure you want to permanently delete owner "${owner.displayName}"? This action cannot be undone.`;
    if (apartments.length > 0) {
      confirmMsg = `WARNING: This Owner has ${apartments.length} active assigned apartments. Deleting them will leave those apartments unassigned. Do you want to proceed?`;
    }
    if (!confirm(confirmMsg)) return;

    try {
      for (const apt of apartments) {
        await updateApartment(apt.id, { ownerId: '', ownerName: '' });
      }
      await deleteUser(id, user?.uid || 'admin-id', user?.displayName || 'Admin', owner.displayName);
      navigate('/admin/owners');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to delete owner.' });
    }
  };

  const handleAssignExistingApt = async (aptId: string) => {
    if (!aptId || !owner) return;
    try {
      await updateApartment(aptId, { ownerId: id, ownerName: owner.displayName });
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Assigned existing apartment complex "${allApartments.find(a => a.id === aptId)?.name}" to "${owner.displayName}"`,
        entityType: 'apartment',
        entityId: aptId
      });
      setMsg({ type: 'success', text: 'Complex assigned successfully!' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateNewApt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apartmentForm.name.trim() || !owner) return;
    try {
      const created = await createApartment({
        name: apartmentForm.name.trim(),
        address: apartmentForm.address.trim(),
        description: apartmentForm.description.trim(),
        imageUrl: apartmentForm.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400',
        electricityRatePerUnit: apartmentForm.electricityRatePerUnit,
        ownerId: id,
        ownerName: owner.displayName,
        totalRooms: 0,
        amenities: ['Parking', 'Water', 'WiFi']
      });

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Created new complex asset "${apartmentForm.name}" directly owned by "${owner.displayName}"`,
        entityType: 'apartment',
        entityId: created.id
      });

      setApartmentForm({ name: '', address: '', description: '', electricityRatePerUnit: 12, imageUrl: '', totalRooms: 0 });
      setMsg({ type: 'success', text: 'Apartment created and assigned successfully!' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditApartmentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartment) return;
    try {
      await updateApartment(selectedApartment.id, apartmentForm);
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Edited configuration parameters of complex "${selectedApartment.name}"`,
        entityType: 'apartment',
        entityId: selectedApartment.id
      });
      setMsg({ type: 'success', text: 'Apartment updated successfully!' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRemoveApartment = async (aptId: string, aptName: string) => {
    if (!confirm(`Are you sure you want to remove management credentials of "${aptName}"?`)) return;
    try {
      await updateApartment(aptId, { ownerId: '', ownerName: '' });
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Removed owner management from apartment "${aptName}"`,
        entityType: 'apartment',
        entityId: aptId,
        oldValue: id
      });
      setMsg({ type: 'success', text: 'Apartment removed from owner registry.' });
    } catch (err: any) {
      alert(err.message || 'Action failed');
    }
  };

  const handleDeleteApartment = async (aptId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete apartment "${name}" and all of its rooms/customer leases?`)) return;
    try {
      await deleteApartment(aptId);
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Permanently deleted complex asset "${name}" and all associated units`,
        entityType: 'apartment',
        entityId: aptId
      });
      setMsg({ type: 'success', text: 'Apartment and all associated rooms/tenants deleted.' });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateRoomInApt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartment || !roomForm.roomNumber.trim()) return;
    try {
      await createRoom({
        apartmentId: selectedApartment.id,
        roomNumber: roomForm.roomNumber.trim(),
        rentAmount: roomForm.rentAmount,
        securityDeposit: roomForm.securityDeposit,
        roomType: roomForm.roomType,
        floor: roomForm.floor,
        wing: roomForm.wing,
        status: 'vacant',
        currentCustomerId: null
      });

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Added new room #${roomForm.roomNumber} in apartment complex "${selectedApartment.name}"`,
        entityType: 'room'
      });

      setMsg({ type: 'success', text: `Room unit #${roomForm.roomNumber} added successfully!` });
      setRoomForm({ roomNumber: '', rentAmount: settingsForm.defaultDeposit || 10000, securityDeposit: settingsForm.defaultDeposit || 10000, roomType: 'Single', floor: 1, wing: '' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEditRoomSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      await updateRoom(selectedRoom.id, {
        roomNumber: roomForm.roomNumber,
        rentAmount: roomForm.rentAmount,
        securityDeposit: roomForm.securityDeposit,
        roomType: roomForm.roomType,
        floor: roomForm.floor,
        wing: roomForm.wing
      });

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Edited parameters for room unit #${roomForm.roomNumber}`,
        entityType: 'room',
        entityId: selectedRoom.id
      });

      setMsg({ type: 'success', text: 'Room unit configured successfully!' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
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
      setMsg({ type: 'success', text: `Room #${roomNum} deleted successfully.` });
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Delete failed' });
    }
  };

  const handleAssignCustomerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !assignCustomerForm.customerId) return;
    const targetC = allUsers.find(u => u.uid === assignCustomerForm.customerId);
    if (!targetC) return;
    try {
      await assignRoomToCustomer(selectedRoom.id, targetC.uid, targetC.displayName, user?.uid || 'admin-id', user?.displayName || 'Admin');
      setMsg({ type: 'success', text: 'Customer allocated to room unit!' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleTransferCustomerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !transferForm.newRoomId) return;
    try {
      await transferCustomer(selectedCustomer.uid, transferForm.newRoomId, selectedCustomer.displayName, user?.uid || 'admin-id', user?.displayName || 'Admin');
      setMsg({ type: 'success', text: 'Customer transferred successfully!' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRemoveCustomerAction = async (roomId: string, customerId: string, name: string) => {
    if (!confirm(`Are you sure you want to vacate customer ${name} from this room?`)) return;
    try {
      await removeRoomFromCustomer(roomId, user?.uid || 'admin-id', user?.displayName || 'Admin');
      setMsg({ type: 'success', text: 'Customer vacated successfully.' });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleGenerateBillSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.customerId || !billForm.billingMonth) return;
    const targetC = allUsers.find(u => u.uid === billForm.customerId);
    const room = rooms.find(r => r.currentCustomerId === billForm.customerId);
    const apt = apartments.find(a => a.id === room?.apartmentId);
    if (!targetC || !room) return;

    try {
      const payload = {
        customerId: targetC.uid,
        customerName: targetC.displayName,
        roomId: room.id,
        roomNumber: room.roomNumber,
        apartmentId: room.apartmentId,
        apartmentName: apt?.name || 'Complex',
        amount: Number(billForm.amount),
        type: billForm.type,
        status: 'pending' as const,
        dueDate: billForm.dueDate,
        paidAt: null,
        billingMonth: billForm.billingMonth
      };

      if (isFirebaseConfigured) {
        await addDoc(collection(db, 'payments'), payload);
      } else {
        const localPmts = getStorageItem<any[]>('payments', []);
        localPmts.push({ id: `pmt-${Math.random().toString(36).substr(2, 9)}`, ...payload, createdAt: Date.now() });
        setStorageItem('payments', localPmts);
      }

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Generated manual ${billForm.type} bill for customer "${targetC.displayName}"`,
        entityType: 'payment'
      });

      setMsg({ type: 'success', text: 'Invoice generated successfully!' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRecordPaymentSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    try {
      const updated = {
        status: 'paid' as const,
        paidAt: recordPaymentForm.paidAt ? Date.parse(recordPaymentForm.paidAt) : Date.now(),
        paymentMethod: recordPaymentForm.paymentMethod,
        referenceId: recordPaymentForm.referenceId
      };

      if (isFirebaseConfigured) {
        await setDoc(doc(db, 'payments', selectedPayment.id), { ...selectedPayment, ...updated });
      } else {
        const localPmts = getStorageItem<Payment[]>('payments', []);
        const idx = localPmts.findIndex(p => p.id === selectedPayment.id);
        if (idx !== -1) {
          localPmts[idx] = { ...localPmts[idx], ...updated };
          setStorageItem('payments', localPmts);
        }
      }

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Recorded invoice payment for customer "${selectedPayment.customerName}"`,
        entityType: 'payment',
        entityId: selectedPayment.id
      });

      setMsg({ type: 'success', text: 'Payment logged successfully.' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docUploadForm.title.trim() || !id) return;
    try {
      await createVerificationDocument({
        userId: id,
        userName: owner?.displayName || 'Owner',
        title: docUploadForm.title.trim(),
        fileUrl: docUploadForm.fileUrl || 'https://raw.githubusercontent.com/pdf-association/pdf-issues/master/test-files/minimal.pdf',
        type: docUploadForm.type,
        status: 'approved',
        expiryDate: docUploadForm.expiryDate || undefined,
        notes: docUploadForm.notes || undefined
      });

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Uploaded owner verification document: "${docUploadForm.title}"`,
        entityType: 'user',
        entityId: id
      });

      setDocUploadForm({ title: '', type: 'pan', expiryDate: '', fileUrl: '', notes: '' });
      setMsg({ type: 'success', text: 'Document uploaded successfully!' });
      setActiveDrawer(null);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
  };

  const handleDeleteDocument = async (docId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteVerificationDocument(docId);
      setMsg({ type: 'success', text: 'Document removed.' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendNotificationSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !notificationForm.title.trim()) return;
    try {
      const payload = {
        id: `notif-${Math.random().toString(36).substr(2, 9)}`,
        userId: id,
        title: notificationForm.title.trim(),
        message: notificationForm.message.trim(),
        read: false,
        createdAt: Date.now()
      };

      if (isFirebaseConfigured) {
        await setDoc(doc(db, 'notifications', payload.id), payload);
      } else {
        const localNotifs = getStorageItem<any[]>('notifications', []);
        localNotifs.push(payload);
        setStorageItem('notifications', localNotifs);
      }

      setNotificationForm({ title: '', message: '' });
      setMsg({ type: 'success', text: 'Custom notification dispatched successfully!' });
      setActiveDrawer(null);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleGetPrintableReport = () => {
    setShowReportModal(true);
  };

  const handleImpersonatePortal = () => {
    setShowPortalPreview(true);
  };

  // Advanced Sorting and Filtering logic
  const handleSort = (listKey: string, field: string) => {
    const current = sortOptions[listKey];
    const direction = current.field === field && current.direction === 'asc' ? 'desc' : 'asc';
    setSortOptions({
      ...sortOptions,
      [listKey]: { field, direction }
    });
  };

  const getSortedList = <T,>(list: T[], listKey: string): T[] => {
    const option = sortOptions[listKey];
    if (!option) return list;
    return [...list].sort((a: any, b: any) => {
      let valA = a[option.field];
      let valB = b[option.field];
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return option.direction === 'asc' ? -1 : 1;
      if (valA > valB) return option.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // List getters with Search, Filtering and Sorting
  const getFilteredRooms = () => {
    let list = ownerRooms;
    const search = searchQueries.rooms.trim().toLowerCase();
    const status = filters.roomsStatus;
    const type = filters.roomsType;

    if (status !== 'all') {
      list = list.filter(r => r.status === status);
    }
    if (type !== 'all') {
      list = list.filter(r => r.roomType === type);
    }
    if (search) {
      list = list.filter(r => r.roomNumber.toLowerCase().includes(search));
    }
    return getSortedList(list, 'rooms');
  };

  const getFilteredCustomers = () => {
    let list = ownerCustomers;
    const search = searchQueries.customers.trim().toLowerCase();
    const status = filters.customersStatus;

    if (status !== 'all') {
      list = list.filter(c => c.leaseStatus === status);
    }
    if (search) {
      list = list.filter(c => c.displayName.toLowerCase().includes(search) || c.email.toLowerCase().includes(search));
    }
    return getSortedList(list, 'customers');
  };

  const getFilteredPayments = () => {
    let list = ownerPayments;
    const search = searchQueries.payments.trim().toLowerCase();
    const type = filters.paymentsType;
    const status = filters.paymentsStatus;

    if (type !== 'all') {
      list = list.filter(p => p.type === type);
    }
    if (status !== 'all') {
      list = list.filter(p => p.status === status);
    }
    if (search) {
      list = list.filter(p => p.customerName?.toLowerCase().includes(search));
    }
    return getSortedList(list, 'payments');
  };

  const getFilteredComplaints = () => {
    let list = ownerComplaints;
    const search = searchQueries.complaints.trim().toLowerCase();
    const priority = filters.complaintsPriority;
    const status = filters.complaintsStatus;

    if (priority !== 'all') {
      list = list.filter(c => c.priority === priority);
    }
    if (status !== 'all') {
      list = list.filter(c => c.status === status);
    }
    if (search) {
      list = list.filter(c => c.title.toLowerCase().includes(search) || c.description.toLowerCase().includes(search));
    }
    return getSortedList(list, 'complaints');
  };

  const getFilteredDocuments = () => {
    let list = ownerDocuments;
    const search = searchQueries.documents.trim().toLowerCase();
    const type = filters.documentsType;

    if (type !== 'all') {
      list = list.filter(d => d.type === type);
    }
    if (search) {
      list = list.filter(d => d.title.toLowerCase().includes(search));
    }
    return getSortedList(list, 'documents');
  };

  const getFilteredTimeline = () => {
    const search = searchQueries.timeline.trim().toLowerCase();
    if (!search) return ownerTimeline;
    return ownerTimeline.filter(log => log.action.toLowerCase().includes(search));
  };

  // Helper for pagination slicing
  const getPagedList = <T,>(list: T[], listKey: string): T[] => {
    const page = pageIndices[listKey] || 1;
    const start = (page - 1) * itemsPerPage;
    return list.slice(start, start + itemsPerPage);
  };

  const getPageCount = (totalItems: number) => {
    return Math.ceil(totalItems / itemsPerPage) || 1;
  };

  const setPage = (listKey: string, page: number) => {
    setPageIndices({ ...pageIndices, [listKey]: page });
  };

  if (loading && !owner) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center space-x-2">
          <ArrowLeft size={16} className="text-muted-foreground" />
          <div className="h-4 bg-muted dark:bg-slate-800 rounded w-28 animate-pulse" />
        </div>
        <SkeletonLoader />
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="p-12 text-center text-muted-foreground font-semibold">
        Owner Registry file not found.
      </div>
    );
  }

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'suspended':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto text-foreground animate-in fade-in duration-300">
      
      {/* ── BREADCRUMBS & BACK LINK ────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/admin/owners')}
          className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-slate-850 dark:hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft size={14} className="mr-1" /> Back to Registry
        </button>

        <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Admin Portal</span>
          <ChevronRight size={12} />
          <Link to="/admin/owners" className="hover:underline">Owner Registry</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-black">{owner.displayName}</span>
        </div>
      </div>

      {/* ── CRM PROFILE HEADER CARD BLOCK ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative group">
            <img 
              src={owner.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(owner.displayName)}&backgroundColor=0284c7`} 
              alt={owner.displayName} 
              className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-500 shadow-md transition-all group-hover:opacity-75"
            />
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
              <Camera size={18} className="text-white" />
              <input 
                type="file" 
                accept="image/*" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    try {
                      const url = await uploadFile(file, `profiles/${owner.uid}`);
                      await updateUserProfile(owner.uid, { photoUrl: url }, user?.role);
                      alert('Profile picture updated successfully!');
                    } catch (err: any) {
                      alert(err.message);
                    }
                  }
                }} 
                className="hidden" 
              />
            </label>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">{owner.displayName}</h1>
              <div className="flex items-center justify-center gap-1.5">
                <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getStatusBadgeClass(owner.status)}`}>
                  {owner.status}
                </span>
                <span className="text-xs font-semibold text-muted-foreground font-mono">(OWNER-2026-{owner.uid.toUpperCase().slice(-4)})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-4 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail size={13} className="text-slate-400" /> {owner.email}</span>
              <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {owner.phoneNumber || 'No phone'}</span>
              <span className="flex items-center gap-1.5"><Building size={13} className="text-slate-400" /> Registered Assets: {apartments.length}</span>
              <span className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400" /> Registered: {new Date(owner.createdAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1.5 font-mono"><Shield size={13} className="text-slate-400" /> Last Active: {owner.lastLogin ? new Date(owner.lastLogin).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        </div>

        {/* Header Action row */}
        <div className="flex flex-wrap items-center gap-2 xl:self-center">
          <button 
            type="button"
            onClick={() => setActiveDrawer('header')}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs rounded-xl transition-all"
          >
            <Edit2 size={13} /> Edit Header
          </button>
          <button 
            type="button"
            onClick={handleImpersonatePortal}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs rounded-xl transition-all"
          >
            <Eye size={13} /> View Portal
          </button>
          <button 
            type="button"
            onClick={handleResetPasswordAction} 
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs rounded-xl transition-all"
          >
            Reset Pass
          </button>
          <button 
            type="button"
            onClick={() => setActiveDrawer('send_notification')}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold text-xs rounded-xl transition-all"
          >
            <Bell size={13} /> Notify
          </button>
          <button 
            type="button"
            onClick={handleToggleStatus} 
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 border font-bold text-xs rounded-xl transition-all ${
              owner.status === 'active' 
                ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-500 dark:text-red-400' 
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-500 dark:text-emerald-400'
            }`}
          >
            {owner.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
          <button 
            type="button"
            onClick={handleDeleteOwner}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-red-600 hover:bg-red-700 border border-red-700 text-white text-xs font-bold rounded-xl transition-all"
          >
            <Trash2 size={13} /> Delete
          </button>
          <button 
            type="button"
            onClick={handleGetPrintableReport}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-500/10 transition-all"
          >
            <Printer size={13} /> Printable Summary (PDF)
          </button>
        </div>
      </div>

      {/* Message Notifications Banner */}
      {msg.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between gap-2 shadow-sm animate-in fade-in duration-200 ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400'
        }`}>
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg({ type: '', text: '' })} className="p-0.5 hover:bg-muted rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Dynamic KPI Live Dashboard Grid ( clickable cards ) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Live SAMS Metrics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {[
            { key: 'apts', label: 'Assigned Apartments', value: apartments.length, color: 'text-brand-500 dark:text-brand-400', tab: 'apartments', filter: {} },
            { key: 'rooms', label: 'Assigned Rooms', value: ownerRooms.length, color: 'text-blue-500 dark:text-blue-400', tab: 'rooms', filter: { roomsStatus: 'all' } },
            { key: 'occupied', label: 'Occupied Rooms', value: occupiedCount, color: 'text-emerald-500 dark:text-emerald-400', tab: 'rooms', filter: { roomsStatus: 'occupied' } },
            { key: 'vacant', label: 'Vacant Rooms', value: vacantCount, color: 'text-sky-500 dark:text-sky-400', tab: 'rooms', filter: { roomsStatus: 'vacant' } },
            { key: 'maint', label: 'Maintenance Spaces', value: maintenanceCount, color: 'text-amber-500 dark:text-amber-400', tab: 'rooms', filter: { roomsStatus: 'maintenance' } },
            { key: 'cust', label: 'Active Customers', value: ownerCustomers.length, color: 'text-purple-500 dark:text-purple-400', tab: 'customers', filter: { customersStatus: 'all' } },
            { key: 'rent', label: 'Monthly Rent Rev.', value: `₹${monthlyRevenue.toLocaleString()}`, color: 'text-green-500 dark:text-green-400', tab: 'payments', filter: { paymentsType: 'rent', paymentsStatus: 'all' } },
            { key: 'elec', label: 'Electricity Revenue', value: `₹${electricityRevenue.toLocaleString()}`, color: 'text-yellow-500 dark:text-yellow-400', tab: 'payments', filter: { paymentsType: 'electricity', paymentsStatus: 'paid' } },
            { key: 'pend_rent', label: 'Pending Rent', value: `₹${pendingRent.toLocaleString()}`, color: 'text-red-500 dark:text-red-400', tab: 'payments', filter: { paymentsType: 'rent', paymentsStatus: 'pending' } },
            { key: 'pend_elec', label: 'Pending Electricity', value: `₹${pendingElectricity.toLocaleString()}`, color: 'text-orange-500 dark:text-orange-400', tab: 'payments', filter: { paymentsType: 'electricity', paymentsStatus: 'pending' } },
            { key: 'deposits', label: 'Security Deposits', value: `₹${totalSecurityDeposits.toLocaleString()}`, color: 'text-indigo-500 dark:text-indigo-400', tab: 'payments', filter: { paymentsType: 'all', paymentsStatus: 'all' } },
            { key: 'open_comp', label: 'Open Complaints', value: openComplaintsCount, color: 'text-red-500 dark:text-red-400', tab: 'complaints', filter: { complaintsStatus: 'open' } }
          ].map(card => (
            <button
              key={card.key}
              onClick={() => {
                setActiveTab(card.tab);
                setFilters(prev => ({ ...prev, ...(card.filter as Record<string, string>) }));
                setMsg({ type: '', text: '' });
              }}
              className="text-left bg-card hover:bg-muted/30 border border-border hover:border-brand-500/35 rounded-2xl p-4 shadow-sm space-y-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <div className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">{card.label}</div>
              <div className={`text-lg font-black tracking-tight ${card.color}`}>{card.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs Menu Selection ( 12 Interactive Sections ) */}
      <div className="flex overflow-x-auto gap-1 p-1 bg-muted dark:bg-slate-800/80 rounded-2xl w-full scrollbar-none border border-border/50">
        {[
          { key: 'overview', label: 'Overview', icon: <Layers size={13}/> },
          { key: 'personal', label: 'Personal Details', icon: <User size={13}/> },
          { key: 'business', label: 'Business info', icon: <Building size={13}/> },
          { key: 'bank', label: 'Bank Records', icon: <Landmark size={13}/> },
          { key: 'apartments', label: `Apartments (${apartments.length})`, icon: <Building size={13}/> },
          { key: 'rooms', label: `Rooms (${ownerRooms.length})`, icon: <Layers size={13}/> },
          { key: 'customers', label: `Customers (${ownerCustomers.length})`, icon: <Users size={13}/> },
          { key: 'documents', label: `Documents (${ownerDocuments.length})`, icon: <FileText size={13}/> },
          { key: 'payments', label: `Payments (${ownerPayments.length})`, icon: <DollarSign size={13}/> },
          { key: 'complaints', label: `Complaints (${ownerComplaints.length})`, icon: <AlertCircle size={13}/> },
          { key: 'timeline', label: 'Activity Timeline', icon: <Clock size={13}/> },
          { key: 'settings', label: 'Settings', icon: <Settings size={13}/> }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setMsg({ type: '', text: '' }); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex-shrink-0 focus:outline-none ${
              activeTab === t.key ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------
          TABS CONTENT ROUTER PANELS
          ---------------------------------------------------- */}

      {/* 1. OVERVIEW PANEL */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-4">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Building size={14}/> Asset Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between border-b border-border/30 pb-2.5">
                  <span className="text-muted-foreground">Office Address:</span>
                  <span className="text-foreground font-bold">{personalForm.address || 'Not set'}</span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-2.5">
                  <span className="text-muted-foreground">Company Name:</span>
                  <span className="text-foreground font-bold">{businessForm.businessName || 'Not configured'}</span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-2.5">
                  <span className="text-muted-foreground">GST Registry:</span>
                  <span className="text-foreground font-bold uppercase">{businessForm.gst || 'Not provided'}</span>
                </div>
                <div className="flex justify-between border-b border-border/30 pb-2.5">
                  <span className="text-muted-foreground">PAN Registry:</span>
                  <span className="text-foreground font-bold uppercase">{businessForm.pan || 'Not provided'}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-4">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Layers size={14}/> Property Breakdown</h3>
              {apartments.length === 0 ? (
                <EmptyState title="No Apartments Assigned" desc="Add or assign a complex registry to display asset metrics." />
              ) : (
                <div className="space-y-3">
                  {apartments.map(apt => {
                    const aptRooms = rooms.filter(r => r.apartmentId === apt.id);
                    const occupied = aptRooms.filter(r => r.status === 'occupied').length;
                    const vacant = aptRooms.filter(r => r.status === 'vacant').length;
                    const progressVal = aptRooms.length > 0 ? (occupied / aptRooms.length) * 100 : 0;
                    return (
                      <div key={apt.id} className="flex items-center justify-between p-3.5 bg-muted/20 dark:bg-slate-800/10 rounded-2xl border border-border/40">
                        <div className="space-y-1">
                          <span className="font-bold text-xs block text-foreground">{apt.name}</span>
                          <span className="text-[10px] text-muted-foreground block">{apt.address}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-[10px] font-semibold text-muted-foreground space-y-0.5">
                            <div>Rooms: <strong className="text-foreground">{aptRooms.length}</strong></div>
                            <div>Occupied: <strong className="text-emerald-500">{occupied}</strong> / Vacant: <strong className="text-blue-500">{vacant}</strong></div>
                          </div>
                          <div className="w-16 bg-muted dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-brand-500 h-full rounded-full" style={{ width: `${progressVal}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-4 h-fit">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Clock size={14}/> Recent Timeline Logs</h3>
            {ownerTimeline.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No logs recorded for this manager.</p>
            ) : (
              <div className="space-y-4 pr-1">
                {ownerTimeline.slice(0, 5).map(log => (
                  <div key={log.id} className="text-xs space-y-1 border-b border-border/30 pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between font-bold text-foreground">
                      <span className="leading-tight">{log.action}</span>
                      <span className="text-[9px] text-muted-foreground flex-shrink-0 ml-2">{new Date(log.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p className="text-muted-foreground text-[9px] font-semibold">Operator: {log.adminName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PERSONAL DETAILS PANEL */}
      {activeTab === 'personal' && (
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Personal Details</h3>
            <button onClick={() => setActiveDrawer('personal')} className="text-xs font-bold text-brand-500 dark:text-brand-400 hover:underline flex items-center gap-1">
              <Edit3 size={12} /> Edit Personal Details
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {[
              { label: 'Full Display Name', value: personalForm.displayName || owner.displayName },
              { label: 'Date of Birth', value: personalForm.dob || 'Not set' },
              { label: 'Gender', value: personalForm.gender || 'Not specified' },
              { label: 'Nationality', value: personalForm.nationality || 'Not specified' },
              { label: 'Email Address', value: owner.email },
              { label: 'Phone Number', value: owner.phoneNumber || 'Not set' },
              { label: 'Alternate Phone', value: personalForm.alternatePhone || 'Not set' },
              { label: 'Residential Address', value: `${personalForm.address || ''} ${personalForm.city || ''} ${personalForm.state || ''} ${personalForm.country || ''} ${personalForm.postalCode || ''}`.trim() || 'Not specified' },
              { label: 'Emergency Contact Person', value: personalForm.emergencyContact || 'Not configured' },
              { label: 'Emergency Contact Phone', value: personalForm.emergencyPhone || 'Not configured' }
            ].map(item => (
              <div key={item.label} className="border-b border-border/30 pb-2.5">
                <span className="text-xs text-muted-foreground block font-semibold mb-0.5">{item.label}</span>
                <span className="font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
          {personalForm.notes && (
            <div className="bg-muted/30 dark:bg-slate-800/10 p-4 rounded-2xl border border-border">
              <span className="text-xs text-muted-foreground block font-bold mb-1.5 uppercase">Internal Registry Notes</span>
              <p className="text-xs font-medium text-foreground leading-relaxed whitespace-pre-wrap">{personalForm.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* 3. BUSINESS INFO PANEL */}
      {activeTab === 'business' && (
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Business Credentials</h3>
            <button onClick={() => setActiveDrawer('business')} className="text-xs font-bold text-brand-500 dark:text-brand-400 hover:underline flex items-center gap-1">
              <Edit3 size={12} /> Edit Business Info
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {[
              { label: 'Business Name', value: businessForm.businessName || 'Not set' },
              { label: 'Company Registered Name', value: businessForm.companyName || 'Not configured' },
              { label: 'Office Address', value: businessForm.officeAddress || 'Not set' },
              { label: 'Business Registration ID', value: businessForm.businessRegistrationNumber || 'Not specified' },
              { label: 'GST Number', value: businessForm.gst ? businessForm.gst.toUpperCase() : 'Not registered' },
              { label: 'PAN Card Registry', value: businessForm.pan ? businessForm.pan.toUpperCase() : 'Not set' },
              { label: 'Tax ID Tier', value: businessForm.taxId || 'Not configured' },
              { label: 'Website Portal', value: businessForm.website || 'Not configured' },
              { label: 'Business Email', value: businessForm.businessEmail || 'Not configured' },
              { label: 'Business Phone', value: businessForm.businessPhone || 'Not configured' }
            ].map(item => (
              <div key={item.label} className="border-b border-border/30 pb-2.5">
                <span className="text-xs text-muted-foreground block font-semibold mb-0.5">{item.label}</span>
                <span className="font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
          {businessForm.notes && (
            <div className="bg-muted/30 dark:bg-slate-800/10 p-4 rounded-2xl border border-border">
              <span className="text-xs text-muted-foreground block font-bold mb-1.5 uppercase">Business Notes</span>
              <p className="text-xs font-medium text-foreground leading-relaxed whitespace-pre-wrap">{businessForm.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* 4. BANK RECORDS PANEL */}
      {activeTab === 'bank' && (
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Bank & Payout Records</h3>
            <button onClick={() => setActiveDrawer('bank')} className="text-xs font-bold text-brand-500 dark:text-brand-400 hover:underline flex items-center gap-1">
              <Edit3 size={12} /> Edit Bank Details
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-6">
              {[
                { label: 'Beneficiary Holder Name', value: bankForm.bankAccountName || 'Not configured' },
                { label: 'Bank Institution Name', value: bankForm.bankName || 'Not configured' },
                { label: 'Bank Account Number', value: bankForm.bankAccountNumber || 'Not set' },
                { label: 'IFSC Code', value: bankForm.bankIFSC ? bankForm.bankIFSC.toUpperCase() : 'Not provided' },
                { label: 'IFSC Branch', value: bankForm.bankBranch || 'Not specified' },
                { label: 'UPI Address ID', value: bankForm.upiId || 'Not set' },
                { label: 'Preferred Collection Method', value: bankForm.preferredPaymentMethod || 'UPI' }
              ].map(item => (
                <div key={item.label} className="border-b border-border/30 pb-2.5">
                  <span className="text-xs text-muted-foreground block font-semibold mb-0.5">{item.label}</span>
                  <span className="font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
            
            {/* Visual QR Code Display Block */}
            <div className="flex flex-col items-center justify-center border border-border rounded-2xl p-6 bg-muted/10 dark:bg-slate-800/10 h-full min-h-[300px]">
              <span className="text-xs font-bold text-muted-foreground uppercase mb-4">UPI Collection QR Code</span>
              {bankForm.paymentQrUrl ? (
                <div className="space-y-4 text-center">
                  <img src={bankForm.paymentQrUrl} alt="UPI QR" className="w-48 h-48 object-contain bg-white p-2 rounded-xl shadow-inner border border-border" />
                  <a href={bankForm.paymentQrUrl} download={`QR_${owner.displayName}.jpg`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white font-bold text-xs rounded-xl shadow-md hover:bg-brand-600 transition-colors">
                    <Download size={12} /> Download QR Code
                  </a>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <Landmark size={40} className="mx-auto text-muted-foreground/45" />
                  <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">No custom UPI QR Code is uploaded yet for collection payout.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. APARTMENTS TAB */}
      {activeTab === 'apartments' && (
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Assigned Apartments ({apartments.length})</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Complexes managed under this profile.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveDrawer('assign_apt')}
                className="px-3.5 py-2 bg-muted hover:bg-muted/80 border border-border text-foreground font-semibold text-xs rounded-xl flex items-center gap-1 transition-all"
              >
                + Assign Existing
              </button>
              <button
                onClick={() => setActiveDrawer('create_apt')}
                className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1 transition-all shadow-md shadow-brand-500/10"
              >
                + Create Complex
              </button>
            </div>
          </div>

          {apartments.length === 0 ? (
            <EmptyState title="No Managed Apartments" desc="Allocate an apartment building registry using Assign Existing or Create Complex above." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {apartments.map(apt => {
                const aptRooms = rooms.filter(r => r.apartmentId === apt.id);
                const aptOccupied = aptRooms.filter(r => r.status === 'occupied').length;
                const aptVacant = aptRooms.filter(r => r.status === 'vacant').length;
                const aptRevenue = aptRooms.filter(r => r.status === 'occupied').reduce((sum, r) => sum + (r.rentAmount || r.rent || 0), 0);

                return (
                  <div key={apt.id} className="border border-border rounded-3xl overflow-hidden shadow-sm bg-card hover:border-brand-500/25 transition-all duration-300 flex flex-col justify-between group">
                    <div className="relative h-44 w-full bg-muted dark:bg-slate-800 overflow-hidden">
                      <img src={apt.imageUrl || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400'} alt={apt.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 bg-card/90 dark:bg-slate-900/90 backdrop-blur border border-border/50 text-[10px] font-bold text-foreground px-2 py-0.5 rounded-full">
                        Rate: ₹{apt.electricityRatePerUnit || 12}/kWh
                      </div>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-foreground leading-tight">{apt.name}</h4>
                        <p className="text-[11px] text-muted-foreground leading-normal flex items-center gap-1"><MapPin size={11} />{apt.address}</p>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 bg-muted/30 dark:bg-slate-800/20 p-3 rounded-2xl border border-border text-[10px] text-foreground font-semibold">
                        <div>
                          <div className="text-muted-foreground font-normal">Rooms Space</div>
                          <div className="font-bold text-sm mt-0.5 text-foreground">{aptRooms.length}</div>
                        </div>
                        <div>
                          <div className="text-emerald-500 font-normal">Occupancy</div>
                          <div className="font-bold text-sm mt-0.5 text-emerald-500">{aptOccupied} Occ / {aptVacant} Vac</div>
                        </div>
                        <div>
                          <div className="text-brand-500 dark:text-brand-400 font-normal">Est. Revenue</div>
                          <div className="font-bold text-sm mt-0.5 text-brand-500 dark:text-brand-400">₹{aptRevenue.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <div className="flex gap-2">
                          <Link to={`/admin/apartments/${apt.id}`} className="p-1.5 bg-muted hover:bg-muted/80 rounded-lg border border-border text-foreground text-[10px] font-bold flex items-center gap-1">
                            <ExternalLink size={10} /> View Details
                          </Link>
                          <button onClick={() => { setSelectedApartment(apt); openApartmentForm(apt); }} className="p-1.5 bg-muted hover:bg-muted/80 rounded-lg border border-border text-foreground text-[10px] font-bold">
                            Edit
                          </button>
                          <button onClick={() => { setSelectedApartment(apt); setRoomForm({ roomNumber: '', rentAmount: settingsForm.defaultDeposit || 10000, securityDeposit: settingsForm.defaultDeposit || 10000, roomType: 'Single', floor: 1, wing: '' }); setActiveDrawer('assign_room'); }} className="p-1.5 bg-muted hover:bg-muted/80 rounded-lg border border-border text-foreground text-[10px] font-bold">
                            + Room
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRemoveApartment(apt.id, apt.name)}
                            className="text-[10px] font-bold text-amber-500 hover:underline"
                          >
                            Unassign
                          </button>
                          <button
                            onClick={() => handleDeleteApartment(apt.id, apt.name)}
                            className="text-[10px] font-bold text-red-500 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. ROOMS TAB */}
      {activeTab === 'rooms' && (
        <div className="bg-card border border-border rounded-3xl overflow-hidden space-y-4">
          <div className="px-5 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10 dark:bg-slate-800/10">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Rooms & Spaces Registry</h3>
              <div className="text-xs text-muted-foreground font-semibold">Total Spaces: {getFilteredRooms().length} rooms</div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  value={searchQueries.rooms}
                  onChange={e => setSearchQueries({ ...searchQueries, rooms: e.target.value })}
                  placeholder="Search Room..."
                  className="pl-8 pr-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-brand-500"
                />
              </div>
              <select
                value={filters.roomsStatus}
                onChange={e => setFilters({ ...filters, roomsStatus: e.target.value })}
                className="px-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="vacant">Vacant</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <select
                value={filters.roomsType}
                onChange={e => setFilters({ ...filters, roomsType: e.target.value })}
                className="px-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Suite">Suite</option>
              </select>
            </div>
          </div>

          {getFilteredRooms().length === 0 ? (
            <EmptyState title="No Rooms Located" desc="Create rooms directly from the Apartments Tab card actions." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/50 dark:bg-slate-800/40 border-b border-border text-xs uppercase text-muted-foreground font-bold">
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('rooms', 'roomNumber')}>Room # {sortOptions.rooms?.field === 'roomNumber' && (sortOptions.rooms.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3">Apartment</th>
                    <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('rooms', 'rentAmount')}>Rent {sortOptions.rooms?.field === 'rentAmount' && (sortOptions.rooms.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3 text-right">Security Deposit</th>
                    <th className="px-4 py-3 text-right">Elec Rate</th>
                    <th className="px-4 py-3">Customer Tenant</th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('rooms', 'status')}>Status {sortOptions.rooms?.field === 'status' && (sortOptions.rooms.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getPagedList(getFilteredRooms(), 'rooms').map(r => {
                    const apt = apartments.find(a => a.id === r.apartmentId);
                    const occupant = allUsers.find(u => u.uid === r.currentCustomerId);
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="px-4 py-3 text-foreground font-black">
                          <Link to={`/admin/rooms/${r.id}`} className="hover:text-brand-500">#{r.roomNumber}</Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground font-semibold">{apt ? apt.name : 'Unknown Apartment'}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">₹{(r.rentAmount || r.rent || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-medium">₹{(r.securityDeposit || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground font-medium">₹{r.electricityRate || apt?.electricityRatePerUnit || 12}/kWh</td>
                        <td className="px-4 py-3 text-xs font-bold">
                          {occupant ? (
                            <Link to={`/admin/customers/${occupant.uid}`} className="text-brand-500 hover:underline">{occupant.displayName}</Link>
                          ) : (
                            <span className="text-muted-foreground italic font-normal">Vacant</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                            r.status === 'occupied' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            r.status === 'vacant' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button onClick={() => { setSelectedRoom(r); openRoomForm(r); }} className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border text-[10px] text-foreground font-bold rounded-lg transition-colors">
                              Edit
                            </button>
                            {r.status !== 'occupied' ? (
                              <button onClick={() => { setSelectedRoom(r); setAssignCustomerForm({ customerId: '' }); setActiveDrawer('assign_customer'); }} className="px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-[10px] text-brand-500 dark:text-brand-400 font-bold border border-brand-500/20 rounded-lg transition-colors">
                                + Tenant
                              </button>
                            ) : (
                              <>
                                <button onClick={() => { setSelectedCustomer(occupant!); const currentRoom = rooms.find(rm => rm.currentCustomerId === occupant!.uid); setTransferForm({ newRoomId: currentRoom ? currentRoom.id : '' }); setActiveDrawer('transfer_customer'); }} className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border text-[10px] text-foreground font-bold rounded-lg flex items-center gap-0.5 transition-colors">
                                  <ArrowRightLeft size={10} /> Move
                                </button>
                                <button onClick={() => handleRemoveCustomerAction(r.id, occupant!.uid, occupant!.displayName)} className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-[10px] text-red-500 dark:text-red-400 font-bold rounded-lg flex items-center gap-0.5 transition-colors">
                                  <UserMinus size={10} /> Vacate
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDeleteRoom(r.id, r.roomNumber)} className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Rooms Pagination */}
          {getFilteredRooms().length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-border p-4 bg-muted/10">
              <span className="text-xs text-muted-foreground font-bold">Showing page {pageIndices.rooms || 1} of {getPageCount(getFilteredRooms().length)}</span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={(pageIndices.rooms || 1) === 1}
                  onClick={() => setPage('rooms', (pageIndices.rooms || 1) - 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Prev
                </button>
                <button
                  disabled={(pageIndices.rooms || 1) === getPageCount(getFilteredRooms().length)}
                  onClick={() => setPage('rooms', (pageIndices.rooms || 1) + 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. CUSTOMERS TAB */}
      {activeTab === 'customers' && (
        <div className="bg-card border border-border rounded-3xl overflow-hidden space-y-4">
          <div className="px-5 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10 dark:bg-slate-800/10">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground font-semibold">Active Tenants Directory</h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  value={searchQueries.customers}
                  onChange={e => setSearchQueries({ ...searchQueries, customers: e.target.value })}
                  placeholder="Search Tenant..."
                  className="pl-8 pr-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
                />
              </div>
              <select
                value={filters.customersStatus}
                onChange={e => setFilters({ ...filters, customersStatus: e.target.value })}
                className="px-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Lease Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="terminated">Terminated</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {getFilteredCustomers().length === 0 ? (
            <EmptyState title="No Customers Associated" desc="Add tenants and allocate them to vacancies to catalog profiles." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/50 dark:bg-slate-800/40 border-b border-border text-xs uppercase text-muted-foreground font-bold">
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('customers', 'displayName')}>Tenant Name {sortOptions.customers?.field === 'displayName' && (sortOptions.customers.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3">Apartment</th>
                    <th className="px-4 py-3">Unit Room</th>
                    <th className="px-4 py-3">Contact Phone</th>
                    <th className="px-4 py-3 text-right">Agreement Rent</th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('customers', 'leaseStatus')}>Lease Status {sortOptions.customers?.field === 'leaseStatus' && (sortOptions.customers.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getPagedList(getFilteredCustomers(), 'customers').map(c => {
                    const room = rooms.find(r => r.currentCustomerId === c.uid);
                    const apt = apartments.find(a => a.id === room?.apartmentId);
                    return (
                      <tr key={c.uid} className="hover:bg-muted/30 dark:hover:bg-slate-800/10 transition-colors">
                        <td className="px-4 py-3 font-bold text-foreground">
                          <Link to={`/admin/customers/${c.uid}`} className="hover:text-brand-500">{c.displayName}</Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-foreground font-medium">{apt?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-xs font-bold text-foreground">{room ? `#${room.roomNumber}` : 'N/A'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground font-medium">{c.phoneNumber || 'No phone'}</td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">₹{(c.leaseMonthlyRent || room?.rentAmount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border capitalize ${
                            c.leaseStatus === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}>{c.leaseStatus || 'pending'}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <Link to={`/admin/customers/${c.uid}`} className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border text-[10px] text-foreground font-bold rounded-lg flex items-center gap-0.5 transition-colors">
                              <ExternalLink size={10} /> View Profile
                            </Link>
                            {room && (
                              <button onClick={() => { setSelectedCustomer(c); setTransferForm({ newRoomId: room.id }); setActiveDrawer('transfer_customer'); }} className="px-2.5 py-1 bg-muted hover:bg-muted/80 border border-border text-[10px] text-foreground font-bold rounded-lg flex items-center gap-0.5 transition-colors">
                                <ArrowRightLeft size={10} /> Transfer Room
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Customers Pagination */}
          {getFilteredCustomers().length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-border p-4 bg-muted/10">
              <span className="text-xs text-muted-foreground font-bold">Showing page {pageIndices.customers || 1} of {getPageCount(getFilteredCustomers().length)}</span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={(pageIndices.customers || 1) === 1}
                  onClick={() => setPage('customers', (pageIndices.customers || 1) - 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Prev
                </button>
                <button
                  disabled={(pageIndices.customers || 1) === getPageCount(getFilteredCustomers().length)}
                  onClick={() => setPage('customers', (pageIndices.customers || 1) + 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 8. DOCUMENTS Vault PANEL */}
      {activeTab === 'documents' && (
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground font-semibold">Verification Documents Center</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">Verify government documents, agreements, and pan/gst licenses.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  value={searchQueries.documents}
                  onChange={e => setSearchQueries({ ...searchQueries, documents: e.target.value })}
                  placeholder="Search Doc..."
                  className="pl-8 pr-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
                />
              </div>
              <button
                onClick={() => setActiveDrawer('upload_doc')}
                className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-brand-500/10 transition-colors"
              >
                <Plus size={13} /> Add Doc
              </button>
            </div>
          </div>

          {getFilteredDocuments().length === 0 ? (
            <EmptyState title="No Documents Tracked" desc="Upload government records, licenses or property documentation to the vault." icon={<FileText size={20} />} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {getPagedList(getFilteredDocuments(), 'documents').map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-muted/20 dark:bg-slate-800/10 border border-border rounded-2xl shadow-sm hover:border-brand-500/20 transition-all duration-200">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2.5 bg-brand-500/10 text-brand-500 dark:text-brand-400 rounded-xl flex-shrink-0">
                      <FileText size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-foreground truncate leading-tight">{doc.title}</div>
                      <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1 tracking-wider">{doc.type} · Expiry: {doc.expiryDate || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setPreviewDoc(doc)} className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground hover:text-foreground border border-border transition-colors">
                      <Eye size={13} />
                    </button>
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="p-2 bg-muted hover:bg-muted/80 rounded-lg text-muted-foreground hover:text-foreground border border-border transition-colors">
                      <Download size={13} />
                    </a>
                    <button onClick={() => handleDeleteDocument(doc.id, doc.title)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 dark:text-red-400 border border-red-500/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Documents Pagination */}
          {getFilteredDocuments().length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground font-bold">Showing page {pageIndices.documents || 1} of {getPageCount(getFilteredDocuments().length)}</span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={(pageIndices.documents || 1) === 1}
                  onClick={() => setPage('documents', (pageIndices.documents || 1) - 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Prev
                </button>
                <button
                  disabled={(pageIndices.documents || 1) === getPageCount(getFilteredDocuments().length)}
                  onClick={() => setPage('documents', (pageIndices.documents || 1) + 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. PAYMENTS PANEL */}
      {activeTab === 'payments' && (
        <div className="bg-card border border-border rounded-3xl overflow-hidden space-y-4">
          <div className="px-5 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10 dark:bg-slate-800/10">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Transactions Ledger</h3>
              <p className="text-xs text-muted-foreground font-medium">Monthly collection records and pending dues.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  value={searchQueries.payments}
                  onChange={e => setSearchQueries({ ...searchQueries, payments: e.target.value })}
                  placeholder="Search Tenant..."
                  className="pl-8 pr-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
                />
              </div>
              <select
                value={filters.paymentsType}
                onChange={e => setFilters({ ...filters, paymentsType: e.target.value })}
                className="px-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Types</option>
                <option value="rent">Rent</option>
                <option value="electricity">Electricity</option>
              </select>
              <select
                value={filters.paymentsStatus}
                onChange={e => setFilters({ ...filters, paymentsStatus: e.target.value })}
                className="px-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
              </select>
              <button onClick={() => setActiveDrawer('generate_bill')} className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-500/10 transition-colors">
                Generate Bill
              </button>
            </div>
          </div>

          <div className="px-5 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-foreground font-semibold">
            <div className="p-3 bg-muted/20 dark:bg-slate-800/10 rounded-2xl border border-border">
              <div className="text-muted-foreground font-normal">Active Collection Revenue</div>
              <div className="text-sm font-black mt-1 text-foreground">₹{monthlyRevenue.toLocaleString()} / mo</div>
            </div>
            <div className="p-3 bg-muted/20 dark:bg-slate-800/10 rounded-2xl border border-border">
              <div className="text-muted-foreground font-normal">Pending Rent Dues</div>
              <div className="text-sm font-black mt-1 text-red-500">₹{pendingRent.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-muted/20 dark:bg-slate-800/10 rounded-2xl border border-border">
              <div className="text-muted-foreground font-normal">Pending Utilities Dues</div>
              <div className="text-sm font-black mt-1 text-orange-500">₹{pendingElectricity.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-muted/20 dark:bg-slate-800/10 rounded-2xl border border-border">
              <div className="text-muted-foreground font-normal">Security Escrows</div>
              <div className="text-sm font-black mt-1 text-brand-500 dark:text-brand-400">₹{totalSecurityDeposits.toLocaleString()}</div>
            </div>
          </div>

          {getFilteredPayments().length === 0 ? (
            <EmptyState title="No Dues Invoiced" desc="Generate manual billing collections or assign tenants to activate recurring invoices." icon={<DollarSign size={20} />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/50 dark:bg-slate-800/40 border-b border-border text-xs uppercase text-muted-foreground font-bold">
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('payments', 'customerName')}>Tenant {sortOptions.payments?.field === 'customerName' && (sortOptions.payments.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3">Complex Unit</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right cursor-pointer select-none" onClick={() => handleSort('payments', 'amount')}>Amount {sortOptions.payments?.field === 'amount' && (sortOptions.payments.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('payments', 'dueDate')}>Due Date {sortOptions.payments?.field === 'dueDate' && (sortOptions.payments.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getPagedList(getFilteredPayments(), 'payments').map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-4 py-3 text-foreground font-bold">{p.customerName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-medium">{p.apartmentName} · Room #{p.roomNumber}</td>
                      <td className="px-4 py-3 text-xs font-semibold capitalize">{p.type} · {p.billingMonth}</td>
                      <td className="px-4 py-3 text-right font-black text-foreground">₹{p.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs font-bold text-muted-foreground">{p.dueDate}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                          p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.status === 'pending' && (
                          <button onClick={() => { setSelectedPayment(p); setRecordPaymentForm({ paidAt: new Date().toISOString().split('T')[0], referenceId: '', paymentMethod: 'UPI' }); setActiveDrawer('record_payment'); }} className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white font-bold text-[10px] rounded-lg transition-colors">
                            Record Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Payments Pagination */}
          {getFilteredPayments().length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-border p-4 bg-muted/10">
              <span className="text-xs text-muted-foreground font-bold">Showing page {pageIndices.payments || 1} of {getPageCount(getFilteredPayments().length)}</span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={(pageIndices.payments || 1) === 1}
                  onClick={() => setPage('payments', (pageIndices.payments || 1) - 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Prev
                </button>
                <button
                  disabled={(pageIndices.payments || 1) === getPageCount(getFilteredPayments().length)}
                  onClick={() => setPage('payments', (pageIndices.payments || 1) + 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 10. COMPLAINTS TAB */}
      {activeTab === 'complaints' && (
        <div className="bg-card border border-border rounded-3xl overflow-hidden space-y-4">
          <div className="px-5 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/10 dark:bg-slate-800/10">
            <div className="space-y-1">
              <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Support Complaints Ledger</h3>
              <p className="text-xs text-muted-foreground font-medium">Tenant issues, categories and priorities.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  value={searchQueries.complaints}
                  onChange={e => setSearchQueries({ ...searchQueries, complaints: e.target.value })}
                  placeholder="Search Issue..."
                  className="pl-8 pr-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
                />
              </div>
              <select
                value={filters.complaintsPriority}
                onChange={e => setFilters({ ...filters, complaintsPriority: e.target.value })}
                className="px-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="emergency">Emergency</option>
              </select>
              <select
                value={filters.complaintsStatus}
                onChange={e => setFilters({ ...filters, complaintsStatus: e.target.value })}
                className="px-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {getFilteredComplaints().length === 0 ? (
            <EmptyState title="No Complaints Registered" desc="Hooray! No tenant service requests are logged for these complexes." icon={<AlertCircle size={20} />} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/50 dark:bg-slate-800/40 border-b border-border text-xs uppercase text-muted-foreground font-bold">
                    <th className="px-4 py-3">Complaint Number</th>
                    <th className="px-4 py-3">Tenant Name</th>
                    <th className="px-4 py-3">Unit Room</th>
                    <th className="px-4 py-3">Issue Title</th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('complaints', 'priority')}>Priority {sortOptions.complaints?.field === 'priority' && (sortOptions.complaints.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('complaints', 'status')}>Status {sortOptions.complaints?.field === 'status' && (sortOptions.complaints.direction === 'asc' ? '▲' : '▼')}</th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => handleSort('complaints', 'createdAt')}>Logged Date {sortOptions.complaints?.field === 'createdAt' && (sortOptions.complaints.direction === 'asc' ? '▲' : '▼')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {getPagedList(getFilteredComplaints(), 'complaints').map(c => (
                    <tr key={c.id} className="hover:bg-muted/30 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono font-bold select-all">#{c.id.substring(0, 8).toUpperCase()}</td>
                      <td className="px-4 py-3 text-foreground font-bold">{c.customerName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-semibold">{c.apartmentName} · Room #{c.roomNumber}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-foreground">{c.title}</div>
                        <p className="text-[10px] text-muted-foreground max-w-xs truncate leading-normal">{c.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          c.priority === 'emergency' ? 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25' :
                          c.priority === 'high' ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' :
                          c.priority === 'medium' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                        }`}>{c.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                          c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          c.status === 'open' ? 'bg-red-500/10 text-red-600 dark:text-red-400' :
                          c.status === 'in-progress' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                        }`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Complaints Pagination */}
          {getFilteredComplaints().length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-border p-4 bg-muted/10">
              <span className="text-xs text-muted-foreground font-bold">Showing page {pageIndices.complaints || 1} of {getPageCount(getFilteredComplaints().length)}</span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={(pageIndices.complaints || 1) === 1}
                  onClick={() => setPage('complaints', (pageIndices.complaints || 1) - 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Prev
                </button>
                <button
                  disabled={(pageIndices.complaints || 1) === getPageCount(getFilteredComplaints().length)}
                  onClick={() => setPage('complaints', (pageIndices.complaints || 1) + 1)}
                  className="px-3 py-1.5 border border-border text-foreground hover:bg-muted disabled:opacity-50 text-xs font-bold rounded-lg transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 11. TIMELINE PANEL */}
      {activeTab === 'timeline' && (
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Manager Activity Log Registry</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                value={searchQueries.timeline}
                onChange={e => setSearchQueries({ ...searchQueries, timeline: e.target.value })}
                placeholder="Search Action..."
                className="pl-8 pr-3 py-1.5 bg-input/50 dark:bg-slate-800/50 border border-border rounded-xl text-xs text-foreground focus:outline-none"
              />
            </div>
          </div>
          
          {getFilteredTimeline().length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No timeline records generated.</p>
          ) : (
            <div className="relative pl-6 space-y-6 border-l border-border ml-3">
              {getFilteredTimeline().slice(0, 20).map(log => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[31px] top-0 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-card" />
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-foreground leading-tight">{log.action}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold">
                      {new Date(log.timestamp).toLocaleString()} · Admin Operator: {log.adminName}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 12. SETTINGS PANEL */}
      {activeTab === 'settings' && (
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-border pb-3">
            <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Settings Configuration</h3>
            <button onClick={() => setActiveDrawer('settings')} className="text-xs font-bold text-brand-500 dark:text-brand-400 hover:underline flex items-center gap-1">
              <Edit3 size={12} /> Configure Defaults
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {[
              { label: 'Receive Email Notifications Alerts', value: settingsForm.emailNotifications ? 'Enabled' : 'Disabled' },
              { label: 'Receive SMS Message Notifications Alerts', value: settingsForm.smsNotifications ? 'Enabled' : 'Disabled' },
              { label: 'Public Profile Visibility', value: settingsForm.accountVisibility === 'public' ? 'Public' : 'Restricted' },
              { label: 'Default Payout Currency', value: settingsForm.defaultCurrency || 'INR' },
              { label: 'Default Electricity Unit Rate', value: `₹${settingsForm.defaultElectricityRate || 12} / kWh` },
              { label: 'Default Security Deposit Escrow Held', value: `₹${(settingsForm.defaultDeposit || 10000).toLocaleString()}` },
              { label: 'Default Rent Collection Calendar Date', value: `${settingsForm.defaultRentCollectionDate || 5}th of each month` }
            ].map(item => (
              <div key={item.label} className="border-b border-border/30 pb-2.5">
                <span className="text-xs text-muted-foreground block font-semibold mb-0.5">{item.label}</span>
                <span className="font-bold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SLIDE-OVER DRAWER COMPONENT
          ---------------------------------------------------- */}
      {activeDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-card border-l border-border w-full max-w-lg h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <h2 className="font-black text-foreground capitalize tracking-wide text-base">
                Configure {activeDrawer.replace('_', ' ')}
              </h2>
              <button 
                onClick={() => { setActiveDrawer(null); setMsg({ type: '', text: '' }); }} 
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Content Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Header Editor */}
              {activeDrawer === 'header' && (
                <form onSubmit={handleSaveHeader} className="space-y-4">
                  <FileUploader 
                    label="Profile Photo Avatar" 
                    path={`owners/${id}/profile_${Date.now()}`}
                    onUploadComplete={(url) => setHeaderForm({ ...headerForm, photoUrl: url })} 
                  />
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Display Name *</label>
                    <input
                      required
                      value={headerForm.displayName}
                      onChange={e => setHeaderForm({ ...headerForm, displayName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Email Address *</label>
                    <input
                      required
                      type="email"
                      value={headerForm.email}
                      onChange={e => setHeaderForm({ ...headerForm, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Phone Number *</label>
                    <input
                      required
                      value={headerForm.phoneNumber}
                      onChange={e => setHeaderForm({ ...headerForm, phoneNumber: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Direct Photo Link</label>
                    <input
                      value={headerForm.photoUrl}
                      onChange={e => setHeaderForm({ ...headerForm, photoUrl: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Save Header Updates
                  </button>
                </form>
              )}

              {/* Personal Details Editor */}
              {activeDrawer === 'personal' && (
                <div className="space-y-4">
                  <FileUploader 
                    label="Profile Avatar Upload" 
                    path={`owners/${id}/profile_${Date.now()}`}
                    onUploadComplete={(url) => setPersonalForm({ ...personalForm, photoUrl: url })} 
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Full Name</label>
                      <input
                        value={personalForm.displayName}
                        onChange={e => setPersonalForm({ ...personalForm, displayName: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={personalForm.dob}
                        onChange={e => setPersonalForm({ ...personalForm, dob: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Gender</label>
                      <select
                        value={personalForm.gender}
                        onChange={e => setPersonalForm({ ...personalForm, gender: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                      >
                        <option value="">Select...</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Nationality</label>
                      <input
                        value={personalForm.nationality}
                        onChange={e => setPersonalForm({ ...personalForm, nationality: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Alternate Phone</label>
                      <input
                        value={personalForm.alternatePhone}
                        onChange={e => setPersonalForm({ ...personalForm, alternatePhone: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                      <input
                        value={personalForm.emergencyContact}
                        onChange={e => setPersonalForm({ ...personalForm, emergencyContact: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Emergency Phone</label>
                      <input
                        value={personalForm.emergencyPhone}
                        onChange={e => setPersonalForm({ ...personalForm, emergencyPhone: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1 font-mono text-[10px]">Photo Direct Url</label>
                      <input
                        value={personalForm.photoUrl}
                        onChange={e => setPersonalForm({ ...personalForm, photoUrl: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Residential Address</label>
                    <input
                      value={personalForm.address}
                      onChange={e => setPersonalForm({ ...personalForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input placeholder="City" value={personalForm.city} onChange={e => setPersonalForm({ ...personalForm, city: e.target.value })} className="px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none" />
                    <input placeholder="State" value={personalForm.state} onChange={e => setPersonalForm({ ...personalForm, state: e.target.value })} className="px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none" />
                    <input placeholder="Postal Code" value={personalForm.postalCode} onChange={e => setPersonalForm({ ...personalForm, postalCode: e.target.value })} className="px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Internal Notes</label>
                    <textarea
                      value={personalForm.notes}
                      onChange={e => setPersonalForm({ ...personalForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                    />
                  </div>
                  <button onClick={() => handleSaveNestedMetadata('personal', personalForm)} className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Save Profile Details
                  </button>
                </div>
              )}

              {/* Business Info Editor */}
              {activeDrawer === 'business' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Business Name</label>
                      <input
                        value={businessForm.businessName}
                        onChange={e => setBusinessForm({ ...businessForm, businessName: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Registered Company Name</label>
                      <input
                        value={businessForm.companyName}
                        onChange={e => setBusinessForm({ ...businessForm, companyName: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">PAN Card ID</label>
                      <input
                        value={businessForm.pan}
                        onChange={e => setBusinessForm({ ...businessForm, pan: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">GST Register Number</label>
                      <input
                        value={businessForm.gst}
                        onChange={e => setBusinessForm({ ...businessForm, gst: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Business Registration ID</label>
                      <input
                        value={businessForm.businessRegistrationNumber}
                        onChange={e => setBusinessForm({ ...businessForm, businessRegistrationNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Tax ID / Tier</label>
                      <input
                        value={businessForm.taxId}
                        onChange={e => setBusinessForm({ ...businessForm, taxId: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Office Address Location</label>
                    <input
                      value={businessForm.officeAddress}
                      onChange={e => setBusinessForm({ ...businessForm, officeAddress: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Website URL</label>
                      <input
                        value={businessForm.website}
                        onChange={e => setBusinessForm({ ...businessForm, website: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Business Email</label>
                      <input
                        value={businessForm.businessEmail}
                        onChange={e => setBusinessForm({ ...businessForm, businessEmail: e.target.value })}
                        placeholder="office@..."
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Business Phone</label>
                    <input
                      value={businessForm.businessPhone}
                      onChange={e => setBusinessForm({ ...businessForm, businessPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Business Notes</label>
                    <textarea
                      value={businessForm.notes}
                      onChange={e => setBusinessForm({ ...businessForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                    />
                  </div>
                  <button onClick={() => handleSaveNestedMetadata('business', businessForm)} className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Save Business Info
                  </button>
                </div>
              )}

              {/* Bank Records Editor */}
              {activeDrawer === 'bank' && (
                <div className="space-y-4">
                  <FileUploader 
                    label="Payout UPI QR Code Upload" 
                    path={`owners/${id}/qr_${Date.now()}`}
                    onUploadComplete={(url) => setBankForm({ ...bankForm, paymentQrUrl: url })} 
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Beneficiary Holder</label>
                      <input
                        value={bankForm.bankAccountName}
                        onChange={e => setBankForm({ ...bankForm, bankAccountName: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Bank Institution</label>
                      <input
                        value={bankForm.bankName}
                        onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Account Number</label>
                      <input
                        value={bankForm.bankAccountNumber}
                        onChange={e => setBankForm({ ...bankForm, bankAccountNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">IFSC Code</label>
                      <input
                        value={bankForm.bankIFSC}
                        onChange={e => setBankForm({ ...bankForm, bankIFSC: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">UPI Address ID</label>
                      <input
                        value={bankForm.upiId}
                        onChange={e => setBankForm({ ...bankForm, upiId: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Preferred Method</label>
                      <select
                        value={bankForm.preferredPaymentMethod}
                        onChange={e => setBankForm({ ...bankForm, preferredPaymentMethod: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      >
                        <option value="UPI">UPI</option>
                        <option value="NetBanking">NetBanking</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">QR Code Direct Url</label>
                    <input
                      value={bankForm.paymentQrUrl}
                      onChange={e => setBankForm({ ...bankForm, paymentQrUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <button onClick={() => handleSaveNestedMetadata('bank', bankForm)} className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Save Bank Details
                  </button>
                </div>
              )}

              {/* Settings Configuration Editor */}
              {activeDrawer === 'settings' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-xl">
                    <div>
                      <div className="font-bold text-xs text-foreground uppercase">Email Alerts</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Send alerts for operations and invoicing.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.emailNotifications}
                      onChange={e => setSettingsForm({ ...settingsForm, emailNotifications: e.target.checked })}
                      className="w-4 h-4 text-brand-600 border-border rounded"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-xl">
                    <div>
                      <div className="font-bold text-xs text-foreground uppercase">SMS Alerts</div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Send transaction messages to phones.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.smsNotifications}
                      onChange={e => setSettingsForm({ ...settingsForm, smsNotifications: e.target.checked })}
                      className="w-4 h-4 text-brand-600 border-border rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Default Electricity Rate</label>
                      <input
                        type="number"
                        value={settingsForm.defaultElectricityRate}
                        onChange={e => setSettingsForm({ ...settingsForm, defaultElectricityRate: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Collection Day</label>
                      <input
                        type="number"
                        value={settingsForm.defaultRentCollectionDate}
                        onChange={e => setSettingsForm({ ...settingsForm, defaultRentCollectionDate: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <button onClick={() => handleSaveNestedMetadata('settings', settingsForm)} className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Save Config Defaults
                  </button>
                </div>
              )}

              {/* Assign Existing Apartment */}
              {activeDrawer === 'assign_apt' && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">Select an unmanaged complex registry to allocate to {owner?.displayName}.</p>
                  <select
                    onChange={e => handleAssignExistingApt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="">Choose Apartment Complex...</option>
                    {assignableApartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}

              {/* Create New Apartment */}
              {activeDrawer === 'create_apt' && (
                <form onSubmit={handleCreateNewApt} className="space-y-4">
                  <FileUploader 
                    label="Upload Apartment Cover Image" 
                    path={`apartments/cover_${Date.now()}`}
                    onUploadComplete={(url) => setApartmentForm({ ...apartmentForm, imageUrl: url })} 
                  />
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Apartment Name *</label>
                    <input
                      required
                      value={apartmentForm.name}
                      onChange={e => setApartmentForm({ ...apartmentForm, name: e.target.value })}
                      placeholder="e.g. Emerald Residencies"
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Location Address *</label>
                    <input
                      required
                      value={apartmentForm.address}
                      onChange={e => setApartmentForm({ ...apartmentForm, address: e.target.value })}
                      placeholder="e.g. 456 Heights Road"
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Electricity Rate (₹/kWh) *</label>
                      <input
                        required
                        type="number"
                        value={apartmentForm.electricityRatePerUnit}
                        onChange={e => setApartmentForm({ ...apartmentForm, electricityRatePerUnit: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Cover Image URL</label>
                      <input
                        value={apartmentForm.imageUrl}
                        onChange={e => setApartmentForm({ ...apartmentForm, imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Create Complex
                  </button>
                </form>
              )}

              {/* Edit Apartment */}
              {activeDrawer === 'edit_apt' && (
                <form onSubmit={handleEditApartmentSave} className="space-y-4">
                  <FileUploader 
                    label="Replace Cover Image" 
                    path={`apartments/${selectedApartment?.id}/cover_${Date.now()}`}
                    onUploadComplete={(url) => setApartmentForm({ ...apartmentForm, imageUrl: url })} 
                  />
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Apartment Complex Name *</label>
                    <input
                      required
                      value={apartmentForm.name}
                      onChange={e => setApartmentForm({ ...apartmentForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Street Address *</label>
                    <input
                      required
                      value={apartmentForm.address}
                      onChange={e => setApartmentForm({ ...apartmentForm, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Electricity Rate *</label>
                      <input
                        required
                        type="number"
                        value={apartmentForm.electricityRatePerUnit}
                        onChange={e => setApartmentForm({ ...apartmentForm, electricityRatePerUnit: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Cover Image Link</label>
                      <input
                        value={apartmentForm.imageUrl}
                        onChange={e => setApartmentForm({ ...apartmentForm, imageUrl: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Save Changes
                  </button>
                </form>
              )}

              {/* Assign Room */}
              {activeDrawer === 'assign_room' && (
                <form onSubmit={handleCreateRoomInApt} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Room Number *</label>
                      <input
                        required
                        value={roomForm.roomNumber}
                        onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                        placeholder="e.g. 101"
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Monthly Rent *</label>
                      <input
                        required
                        type="number"
                        value={roomForm.rentAmount}
                        onChange={e => setRoomForm({ ...roomForm, rentAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Type</label>
                      <select
                        value={roomForm.roomType}
                        onChange={e => setRoomForm({ ...roomForm, roomType: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs focus:outline-none"
                      >
                        <option value="Single">Single</option>
                        <option value="Double">Double</option>
                        <option value="Suite">Suite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Floor</label>
                      <input
                        type="number"
                        value={roomForm.floor}
                        onChange={e => setRoomForm({ ...roomForm, floor: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Wing</label>
                      <input
                        value={roomForm.wing}
                        onChange={e => setRoomForm({ ...roomForm, wing: e.target.value })}
                        placeholder="A"
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Create Room Unit
                  </button>
                </form>
              )}

              {/* Edit Room */}
              {activeDrawer === 'edit_room' && (
                <form onSubmit={handleEditRoomSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Room Number *</label>
                      <input
                        required
                        value={roomForm.roomNumber}
                        onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Monthly Rent *</label>
                      <input
                        required
                        type="number"
                        value={roomForm.rentAmount}
                        onChange={e => setRoomForm({ ...roomForm, rentAmount: Number(e.target.value) })}
                        className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Save Configuration
                  </button>
                </form>
              )}

              {/* Assign Customer */}
              {activeDrawer === 'assign_customer' && (
                <form onSubmit={handleAssignCustomerSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Customer Tenant *</label>
                    <select
                      required
                      value={assignCustomerForm.customerId}
                      onChange={e => setAssignCustomerForm({ customerId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    >
                      <option value="">Select Tenant Profile...</option>
                      {allUsers.filter(u => u.role === 'customer' && !u.roomId).map(c => (
                        <option key={c.uid} value={c.uid}>{c.displayName} ({c.email})</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Assign Tenant
                  </button>
                </form>
              )}

              {/* Transfer Customer */}
              {activeDrawer === 'transfer_customer' && (
                <form onSubmit={handleTransferCustomerSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Move to Vacant Unit *</label>
                    <select
                      required
                      value={transferForm.newRoomId}
                      onChange={e => setTransferForm({ newRoomId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    >
                      <option value="">Select Unit Space...</option>
                      {ownerRooms.filter(r => r.status === 'vacant').map(r => (
                        <option key={r.id} value={r.id}>#{r.roomNumber} - Rent: ₹{(r.rentAmount || r.rent || 0).toLocaleString()}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Confirm Move
                  </button>
                </form>
              )}

              {/* Generate Bill */}
              {activeDrawer === 'generate_bill' && (
                <form onSubmit={handleGenerateBillSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Select Customer Tenant *</label>
                    <select
                      required
                      value={billForm.customerId}
                      onChange={e => setBillForm({ ...billForm, customerId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    >
                      <option value="">Choose Occupant...</option>
                      {ownerCustomers.map(c => <option key={c.uid} value={c.uid}>{c.displayName}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Invoice Type</label>
                      <select
                        value={billForm.type}
                        onChange={e => setBillForm({ ...billForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      >
                        <option value="rent">Monthly Rent</option>
                        <option value="electricity">Electricity Utilities</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Billing Amount (₹) *</label>
                      <input
                        required
                        type="number"
                        value={billForm.amount}
                        onChange={e => setBillForm({ ...billForm, amount: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Billing Month *</label>
                      <input
                        required
                        value={billForm.billingMonth}
                        onChange={e => setBillForm({ ...billForm, billingMonth: e.target.value })}
                        placeholder="October 2026"
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Due Date *</label>
                      <input
                        required
                        type="date"
                        value={billForm.dueDate}
                        onChange={e => setBillForm({ ...billForm, dueDate: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Generate Ledger Invoice
                  </button>
                </form>
              )}

              {/* Record Payment */}
              {activeDrawer === 'record_payment' && (
                <form onSubmit={handleRecordPaymentSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Paid Date *</label>
                    <input
                      required
                      type="date"
                      value={recordPaymentForm.paidAt}
                      onChange={e => setRecordPaymentForm({ ...recordPaymentForm, paidAt: e.target.value })}
                      className="w-full px-3 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Payment Method</label>
                      <select
                        value={recordPaymentForm.paymentMethod}
                        onChange={e => setRecordPaymentForm({ ...recordPaymentForm, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      >
                        <option value="UPI">UPI</option>
                        <option value="NetBanking">NetBanking</option>
                        <option value="Card">Credit/Debit Card</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Txn ID / Reference</label>
                      <input
                        value={recordPaymentForm.referenceId}
                        onChange={e => setRecordPaymentForm({ ...recordPaymentForm, referenceId: e.target.value })}
                        placeholder="UPI txn ref..."
                        className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Log Collection Paid
                  </button>
                </form>
              )}

              {/* Upload Document */}
              {activeDrawer === 'upload_doc' && (
                <form onSubmit={handleAddDocument} className="space-y-4">
                  <FileUploader 
                    label="Upload File" 
                    path={`owners/${id}/docs/doc_${Date.now()}`}
                    onUploadComplete={(url) => setDocUploadForm({ ...docUploadForm, fileUrl: url })} 
                  />
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Document Title *</label>
                    <input
                      required
                      value={docUploadForm.title}
                      onChange={e => setDocUploadForm({ ...docUploadForm, title: e.target.value })}
                      placeholder="e.g. Government PAN Card"
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Type</label>
                      <select
                        value={docUploadForm.type}
                        onChange={e => setDocUploadForm({ ...docUploadForm, type: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-xs focus:outline-none"
                      >
                        <option value="id_proof">Government ID</option>
                        <option value="pan">PAN Card</option>
                        <option value="gst">GST Certificate</option>
                        <option value="bank_doc">Bank Document</option>
                        <option value="property_doc">Property Ownership deed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Expiry Date</label>
                      <input
                        type="date"
                        value={docUploadForm.expiryDate}
                        onChange={e => setDocUploadForm({ ...docUploadForm, expiryDate: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Document Direct URL</label>
                    <input
                      value={docUploadForm.fileUrl}
                      onChange={e => setDocUploadForm({ ...docUploadForm, fileUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Save Document
                  </button>
                </form>
              )}

              {/* Send Notification */}
              {activeDrawer === 'send_notification' && (
                <form onSubmit={handleSendNotificationSave} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Subject Title *</label>
                    <input
                      required
                      value={notificationForm.title}
                      onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                      placeholder="Maintenance Schedule Alert..."
                      className="w-full px-3.5 py-2.5 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase mb-1">Notification Body *</label>
                    <textarea
                      required
                      value={notificationForm.message}
                      onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                      placeholder="Enter detailed notice alerts here..."
                      rows={5}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl shadow-md transition-colors">
                    Dispatch Alert Notification
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL PREVIEW DOCUMENT VIEWER
          ---------------------------------------------------- */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
              <h3 className="font-bold text-sm text-foreground">{previewDoc.title}</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-900 overflow-auto p-4 flex items-center justify-center">
              {previewDoc.fileUrl.startsWith('data:image') || previewDoc.fileUrl.includes('.png') || previewDoc.fileUrl.includes('.jpg') || previewDoc.fileUrl.includes('.jpeg') || !previewDoc.fileUrl.includes('.pdf') ? (
                <img src={previewDoc.fileUrl} alt={previewDoc.title} className="max-w-full max-h-full object-contain rounded-lg shadow pointer-events-none select-none" />
              ) : (
                <iframe src={previewDoc.fileUrl} title={previewDoc.title} className="w-full h-full border-0 bg-white" />
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
              <a href={previewDoc.fileUrl} download className="px-4 py-2 bg-brand-500 text-white font-bold text-xs rounded-xl shadow">
                Download File
              </a>
              <button onClick={() => setPreviewDoc(null)} className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl border border-border">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          REPORT GENERATOR PRINTABLE MODAL
          ---------------------------------------------------- */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5"><FileText size={16} /> Asset & Revenue Performance Report</h3>
              <button onClick={() => setShowReportModal(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 printable-report bg-white text-slate-900">
              {/* Print Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-300 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">SAMS Property Management</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">Smart Apartment Management System</p>
                </div>
                <div className="text-right text-xs text-slate-500 font-medium">
                  <div>Report Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                  <div>Report ID: <strong>REP-{Math.floor(100000 + Math.random() * 900000)}</strong></div>
                </div>
              </div>

              {/* Owner Info Block */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200">
                <div>
                  <div className="text-slate-400 font-semibold">OWNER / PROPERTY MANAGER</div>
                  <div className="text-sm font-bold text-slate-800 mt-1">{owner.displayName}</div>
                  <div className="text-slate-600 mt-0.5">{owner.email}</div>
                  <div className="text-slate-600">{owner.phoneNumber || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-semibold">METRICS SUMMARY</div>
                  <div className="grid grid-cols-2 gap-2 mt-2 font-semibold">
                    <div>Complexes: <span className="text-slate-800 font-bold">{apartments.length}</span></div>
                    <div>Rooms: <span className="text-slate-800 font-bold">{ownerRooms.length}</span></div>
                    <div>Occupied: <span className="text-emerald-600 font-bold">{occupiedCount}</span></div>
                    <div>Vacant: <span className="text-blue-600 font-bold">{vacantCount}</span></div>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Financial Performance Overview</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <th className="p-3">Apartment Complex</th>
                        <th className="p-3 text-right">Managed Units</th>
                        <th className="p-3 text-right">Occupied Rent (₹/mo)</th>
                        <th className="p-3 text-right">Paid Electricity (₹)</th>
                        <th className="p-3 text-right">Pending Receivables (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-semibold">
                      {apartments.map(apt => {
                        const aptRooms = rooms.filter(r => r.apartmentId === apt.id);
                        const occRooms = aptRooms.filter(r => r.status === 'occupied');
                        const rent = occRooms.reduce((sum, r) => sum + (r.rentAmount || r.rent || 0), 0);
                        const paidElec = electricityBills.filter(b => b.status === 'paid' && b.apartmentId === apt.id).reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                        const pend = payments.filter(p => p.status === 'pending' && p.apartmentId === apt.id).reduce((sum, p) => sum + p.amount, 0) +
                                     electricityBills.filter(b => b.status === 'unpaid' && b.apartmentId === apt.id).reduce((sum, b) => sum + (b.totalAmount || 0), 0);
                        
                        return (
                          <tr key={apt.id}>
                            <td className="p-3 font-bold">{apt.name}</td>
                            <td className="p-3 text-right">{aptRooms.length}</td>
                            <td className="p-3 text-right font-black">₹{rent.toLocaleString()}</td>
                            <td className="p-3 text-right text-emerald-600">₹{paidElec.toLocaleString()}</td>
                            <td className="p-3 text-right text-red-500">₹{pend.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-50 font-black border-t-2 border-slate-300">
                        <td className="p-3">Total Ledgers Summary</td>
                        <td className="p-3 text-right">{ownerRooms.length}</td>
                        <td className="p-3 text-right text-slate-800">₹{monthlyRevenue.toLocaleString()}</td>
                        <td className="p-3 text-right text-emerald-600">₹{electricityRevenue.toLocaleString()}</td>
                        <td className="p-3 text-right text-red-500">₹{(pendingRent + pendingElectricity).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tenants Directory summary */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Active Tenant Directory</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <th className="p-3">Tenant Name</th>
                        <th className="p-3">Complex Location</th>
                        <th className="p-3 text-right">Unit Space</th>
                        <th className="p-3 text-right">Monthly Rent</th>
                        <th className="p-3">Lease Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-semibold">
                      {ownerCustomers.map(c => {
                        const room = rooms.find(r => r.currentCustomerId === c.uid);
                        const apt = apartments.find(a => a.id === room?.apartmentId);
                        return (
                          <tr key={c.uid}>
                            <td className="p-3 font-bold">{c.displayName}</td>
                            <td className="p-3 text-slate-600">{apt?.name || 'N/A'}</td>
                            <td className="p-3 text-right">Room #{room?.roomNumber || 'N/A'}</td>
                            <td className="p-3 text-right">₹{(c.leaseMonthlyRent || room?.rentAmount || 0).toLocaleString()}</td>
                            <td className="p-3"><span className="text-emerald-600 font-bold uppercase">{c.leaseStatus || 'active'}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            {/* Modal actions */}
            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/10">
              <button onClick={() => window.print()} className="px-4 py-2 bg-brand-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow">
                <Printer size={13} /> Print Report
              </button>
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl border border-border">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          PORTAL PREVIEW IMPERSONATOR MODAL
          ---------------------------------------------------- */}
      {showPortalPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh] text-foreground">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5"><ExternalLink size={16} /> Portal Impersonation Preview: {owner.displayName}</h3>
              <button onClick={() => setShowPortalPreview(false)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            
            {/* Mock Owner Portal Panel View */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/60">
              <div className="p-4 bg-brand-500 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold">Welcome back, {owner.displayName}!</h4>
                  <p className="text-xs opacity-90 mt-0.5">Here is an overview of your active properties, collections, and complaints.</p>
                </div>
                <div className="p-2.5 bg-white/10 rounded-xl">
                  <Building size={24} />
                </div>
              </div>

              {/* Portal Dashboard Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Assigned Apartments', value: apartments.length, color: 'text-brand-500' },
                  { label: 'Occupied Units', value: occupiedCount, color: 'text-emerald-500' },
                  { label: 'Vacant Spaces', value: vacantCount, color: 'text-sky-500' },
                  { label: 'Unresolved Complaints', value: openComplaintsCount, color: 'text-red-500' }
                ].map(stat => (
                  <div key={stat.label} className="bg-card border border-border p-4 rounded-xl space-y-1">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase">{stat.label}</div>
                    <div className={`text-base font-black ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Active Buildings List */}
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <span className="text-xs font-bold text-muted-foreground uppercase">Your Managed Complexes</span>
                {apartments.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No complexes are allocated under your account.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {apartments.map(apt => (
                      <div key={apt.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                        <div className="space-y-0.5">
                          <div className="text-foreground font-bold">{apt.name}</div>
                          <div className="text-muted-foreground text-[10px]">{apt.address}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-brand-500 dark:text-brand-400">Rate: ₹{apt.electricityRatePerUnit || 12}/kWh</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal actions */}
            <div className="p-4 border-t border-border flex justify-end bg-muted/10">
              <button onClick={() => setShowPortalPreview(false)} className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl border border-border">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );

  function openApartmentForm(apt: Apartment) {
    setApartmentForm({
      name: apt.name,
      address: apt.address,
      description: apt.description || '',
      electricityRatePerUnit: apt.electricityRatePerUnit || 12,
      imageUrl: apt.imageUrl || '',
      totalRooms: apt.totalRooms || 0
    });
    setActiveDrawer('edit_apt');
  }

  function openRoomForm(room: Room) {
    setRoomForm({
      roomNumber: room.roomNumber,
      rentAmount: room.rentAmount || room.rent || 10000,
      securityDeposit: room.securityDeposit || room.rentAmount || 10000,
      roomType: room.roomType || 'Single',
      floor: room.floor || 1,
      wing: room.wing || ''
    });
    setActiveDrawer('edit_room');
  }
};
