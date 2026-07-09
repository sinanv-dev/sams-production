import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Phone, Building, DoorOpen, CreditCard,
  AlertCircle, Edit2, Trash2, UserPlus, UserMinus, CheckCircle,
  Calendar, Shield, Activity, Zap, FileText, Lock, Plus, Download, 
  Trash, Eye, RefreshCw, AlertTriangle, FileSpreadsheet, Check, X,
  Bookmark, Send, Users, ChevronRight, HelpCircle, Printer, Camera, Landmark, MapPin
} from 'lucide-react';
import { 
  updateUserProfile, assignRoomToCustomer, 
  removeRoomFromCustomer, transferCustomer, deleteUser, createAuditLog,
  createVerificationDocument, deleteVerificationDocument,
  renewLeaseAgreement, terminateLeaseAgreement,
  createPayment, createElectricityBill, updateVerificationDocumentStatus,
  subscribeToUsers, subscribeToApartments, subscribeToRooms, subscribeToPayments, 
  subscribeToVerificationDocuments, subscribeToAuditLogs, subscribeToElectricityBills,
  subscribeToComplaints, subscribeToRequests, uploadFile
} from '../../../firebase/db';
import { isFirebaseConfigured } from '../../../firebase/config';
import { useAuth } from '../../../context/AuthContext';
import { 
  UserProfile, Room, Apartment, Payment, Complaint, 
  ApartmentRequest, ElectricityBill, VerificationDocument, AuditLog 
} from '../../../types';
import { 
  exportCustomerReportPDF, 
  exportRentReceiptPDF, 
  exportElectricityBillPDF,
  exportAgreementPDF
} from '../../../utils/exportUtils';

// Inline File Uploader Helper
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
            <Plus size={20} className="text-muted-foreground" />
            <span className="text-[11px] font-bold text-brand-500 dark:text-brand-400 hover:underline">Select File</span>
            <input type="file" accept={accept} onChange={handleFileChange} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );
};

export const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data states
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [requests, setRequests] = useState<ApartmentRequest[]>([]);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [timeline, setTimeline] = useState<AuditLog[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'profile' | 'apartment' | 'documents' | 'lease' | 
    'payments' | 'electricity' | 'complaints' | 'visits' | 'activity' | 'notes'
  >('overview');
  
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [editMode, setEditMode] = useState(false);

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showLeaseModal, setShowLeaseModal] = useState(false);

  // Forms state
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Search & Pagination States
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({
    payments: '',
    electricity: '',
    complaints: '',
    documents: ''
  });
  const [filters, setFilters] = useState<Record<string, string>>({
    paymentsStatus: 'all',
    electricityStatus: 'all',
    complaintsStatus: 'all'
  });
  const [pageIndices, setPageIndices] = useState<Record<string, number>>({
    payments: 1,
    electricity: 1,
    complaints: 1,
    documents: 1
  });
  const itemsPerPage = 5;

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    dob: '',
    gender: '',
    nationality: '',
    bloodGroup: '',
    parentDetails: '',
    collegeCompany: '',
    occupation: '',
    address: '',
    emergencyContact: ''
  });

  // Document Upload Form state
  const [docForm, setDocForm] = useState({
    title: '',
    type: 'id_proof' as VerificationDocument['type'],
    expiryDate: '',
    notes: '',
    fileUrl: ''
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Lease Renewal Form state
  const [leaseForm, setLeaseForm] = useState({
    leaseAgreementNumber: '',
    leaseStartDate: '',
    leaseEndDate: '',
    leaseMonthlyRent: 0,
    leaseSecurityDeposit: 0,
    leaseElectricityRate: 12,
    leaseSpecialConditions: ''
  });
  const [submittingLease, setSubmittingLease] = useState(false);

  // Bill Generation Form state
  const [billForm, setBillForm] = useState({
    type: 'rent' as 'rent' | 'electricity',
    amount: 0,
    month: '2026-07',
    dueDate: '2026-07-05',
    prevReading: 0,
    currReading: 0
  });
  const [submittingBill, setSubmittingBill] = useState(false);

  // Pinned Notes state
  const [adminNotesText, setAdminNotesText] = useState('');
  const [adminNotesList, setAdminNotesList] = useState<{ id: string; text: string; pinned: boolean; createdAt: number }[]>([]);

  // PDF download loading states
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);

  // Real-time Database Subscriptions Setup
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMsg({ type: '', text: '' });

    const unsubUsers = subscribeToUsers((usersList) => {
      setAllUsers(usersList);
      const cust = usersList.find(u => u.uid === id);
      if (cust) {
        setCustomer(cust);
        setProfileForm({
          displayName: cust.displayName || '',
          email: cust.email || '',
          phoneNumber: cust.phoneNumber || '',
          dob: cust.dob || '',
          gender: cust.gender || '',
          nationality: cust.nationality || '',
          bloodGroup: cust.bloodGroup || '',
          parentDetails: cust.parentDetails || '',
          collegeCompany: cust.collegeCompany || '',
          occupation: cust.occupation || '',
          address: cust.address || '',
          emergencyContact: cust.emergencyContact || ''
        });

        setLeaseForm({
          leaseAgreementNumber: cust.leaseAgreementNumber || `SAMS-LEASE-${Math.floor(100000 + Math.random() * 900000)}`,
          leaseStartDate: cust.leaseStartDate || '2026-07-01',
          leaseEndDate: cust.leaseEndDate || '2027-06-30',
          leaseMonthlyRent: cust.leaseMonthlyRent || 0,
          leaseSecurityDeposit: cust.leaseSecurityDeposit || 0,
          leaseElectricityRate: cust.leaseElectricityRate || 12,
          leaseSpecialConditions: cust.leaseSpecialConditions || 'Standard lease rules apply.'
        });

        // Load internal notes persisted inside businessInfo
        if (cust.businessInfo) {
          try {
            setAdminNotesList(JSON.parse(cust.businessInfo));
          } catch {
            setAdminNotesList([]);
          }
        } else {
          setAdminNotesList([]);
        }
      } else {
        // Safe navigation if profile was deleted
        navigate('/admin/customers');
      }
      setLoading(false);
    });

    const unsubRooms = subscribeToRooms((rms) => {
      setRooms(rms);
    });

    const unsubApts = subscribeToApartments((apts) => {
      setApartments(apts);
    });

    const unsubPmts = subscribeToPayments((pmts) => {
      setPayments(pmts.filter(p => p.customerId === id));
    });

    const unsubBills = subscribeToElectricityBills((blls) => {
      setBills(blls.filter(b => b.customerId === id));
    });

    const unsubComplaints = subscribeToComplaints((cmps) => {
      setComplaints(cmps.filter(c => c.customerId === id));
    });

    const unsubRequests = subscribeToRequests((reqs) => {
      setRequests(reqs.filter(r => r.customerId === id));
    });

    const unsubDocs = subscribeToVerificationDocuments((docs) => {
      setDocuments(docs.filter(d => d.userId === id));
    });

    const unsubAudit = subscribeToAuditLogs((auditList) => {
      setTimeline(auditList.filter(log => log.entityId === id || log.action.toLowerCase().includes(id.toLowerCase())));
    });

    return () => {
      unsubUsers();
      unsubRooms();
      unsubApts();
      unsubPmts();
      unsubBills();
      unsubComplaints();
      unsubRequests();
      unsubDocs();
      unsubAudit();
    };
  }, [id]);

  const currentRoom = rooms.find(r => r.currentCustomerId === id);
  const currentApartment = currentRoom ? apartments.find(a => a.id === currentRoom.apartmentId) : null;
  const vacantRooms = rooms.filter(r => r.status === 'vacant');

  // Roommate list (Other customers assigned to the same room)
  const roommates = currentRoom
    ? allUsers.filter(u => u.roomId === currentRoom.id && u.uid !== id)
    : [];

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !customer) return;
    try {
      await updateUserProfile(id, {
        displayName: profileForm.displayName,
        email: profileForm.email,
        phoneNumber: profileForm.phoneNumber,
        gender: profileForm.gender,
        nationality: profileForm.nationality,
        bloodGroup: profileForm.bloodGroup,
        parentDetails: profileForm.parentDetails,
        collegeCompany: profileForm.collegeCompany,
        occupation: profileForm.occupation,
        address: profileForm.address,
        emergencyContact: profileForm.emergencyContact
      }, user?.role);
      
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Updated profile details for customer "${profileForm.displayName}"`,
        entityType: 'user',
        entityId: id
      });

      setMsg({ type: 'success', text: 'Profile details updated successfully!' });
      setEditMode(false);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to save profile details.' });
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !customer) return;
    setAssigning(true);
    try {
      if (currentRoom) {
        await transferCustomer(id!, selectedRoomId, customer.displayName, user?.uid || '', user?.displayName || 'Admin');
      } else {
        await assignRoomToCustomer(selectedRoomId, id!, customer.displayName, user?.uid || '', user?.displayName || 'Admin');
      }
      setMsg({ type: 'success', text: currentRoom ? 'Customer transferred successfully!' : 'Room assigned successfully!' });
      setShowAssignModal(false);
      setSelectedRoomId('');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    } finally { setAssigning(false); }
  };

  const handleRemove = async () => {
    if (!currentRoom || !confirm('Remove this customer from their room?')) return;
    try {
      await removeRoomFromCustomer(currentRoom.id, user?.uid || '', user?.displayName || 'Admin');
      setMsg({ type: 'success', text: 'Customer removed from room. Room is now vacant.' });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const handleToggleStatus = async () => {
    if (!customer) return;
    const newStatus = customer.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`${newStatus === 'suspended' ? 'Suspend' : 'Activate'} this customer?`)) return;
    try {
      await updateUserProfile(id!, { status: newStatus }, user?.role);
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `${newStatus === 'suspended' ? 'Suspended' : 'Activated'} account for "${customer.displayName}"`,
        entityType: 'user',
        entityId: id!
      });
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const handleResetPasswordSimulated = async () => {
    if (!customer) return;
    if (!confirm(`Generate a temporary password reset link for ${customer.displayName}?`)) return;
    try {
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Requested password reset for customer "${customer.displayName}"`,
        entityType: 'user',
        entityId: id!
      });
      alert('Password reset link has been dispatched to customer\'s registered email address.');
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;
    const unpaidPayments = payments.filter(p => p.status === 'pending');
    const unpaidBills = bills.filter(b => b.status === 'unpaid');
    const hasUnpaid = unpaidPayments.length > 0 || unpaidBills.length > 0;

    let confirmMsg = `Permanently delete "${customer.displayName}"? This cannot be undone.`;
    if (hasUnpaid) {
      confirmMsg = `WARNING: This Customer has unpaid bills (Pending Rent or Unpaid Utilities). Deleting them will clear their active lease and record. Do you want to proceed?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
      if (currentRoom) {
        await removeRoomFromCustomer(currentRoom.id, user?.uid || '', user?.displayName || 'Admin');
      }
      await deleteUser(id!, user?.uid || 'admin-id', user?.displayName || 'Admin', customer?.displayName || 'Customer');
      navigate('/admin/customers');
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !docForm.title || !docForm.fileUrl) {
      alert('Please fill out document details and select a file.');
      return;
    }
    setUploadingDoc(true);
    try {
      await createVerificationDocument({
        userId: id,
        title: docForm.title,
        type: docForm.type,
        expiryDate: docForm.expiryDate || '',
        notes: docForm.notes || '',
        fileUrl: docForm.fileUrl,
        status: 'pending'
      });

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Uploaded verification document "${docForm.title}" for customer "${customer?.displayName}"`,
        entityType: 'user',
        entityId: id
      });

      setShowDocModal(false);
      setDocForm({ title: '', type: 'id_proof', expiryDate: '', notes: '', fileUrl: '' });
      setMsg({ type: 'success', text: 'Verification document uploaded successfully!' });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: string, title: string) => {
    if (!confirm(`Delete verification document "${title}"?`)) return;
    try {
      await deleteVerificationDocument(docId);
      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Deleted document "${title}" for customer "${customer?.displayName}"`,
        entityType: 'user',
        entityId: id!
      });
      setMsg({ type: 'success', text: 'Document removed successfully.' });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleVerifyDocument = async (docId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await updateVerificationDocumentStatus(docId, status, notes);
      setMsg({ type: 'success', text: `Document status updated to ${status}!` });
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRenewLease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingLease(true);
    try {
      await renewLeaseAgreement(id, leaseForm, user?.uid || 'admin-id', user?.displayName || 'Admin');
      setShowLeaseModal(false);
      setMsg({ type: 'success', text: 'Lease agreement renewed successfully!' });
    } catch (err: any) {
      alert(err.message || 'Lease renewal failed');
    } finally {
      setSubmittingLease(false);
    }
  };

  const handleTerminateLease = async () => {
    if (!id) return;
    if (!confirm('Are you sure you want to terminate this lease agreement? The room assignment will also be removed.')) return;
    try {
      await terminateLeaseAgreement(id, currentRoom?.id, user?.uid || 'admin-id', user?.displayName || 'Admin');
      setMsg({ type: 'success', text: 'Lease agreement terminated successfully.' });
    } catch (err: any) {
      alert(err.message || 'Lease termination failed');
    }
  };

  const handleGenerateBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !currentRoom) return;
    setSubmittingBill(true);
    try {
      if (billForm.type === 'rent') {
        await createPayment({
          customerId: id,
          customerName: customer?.displayName || 'Customer',
          roomId: currentRoom.id,
          roomNumber: currentRoom.roomNumber,
          apartmentId: currentRoom.apartmentId,
          apartmentName: currentApartment?.name || 'Apartment',
          amount: billForm.amount,
          type: 'rent',
          status: 'pending',
          dueDate: billForm.dueDate,
          paidAt: null,
          billingMonth: billForm.month
        });
      } else {
        const units = billForm.currReading - billForm.prevReading;
        const rate = currentApartment?.electricityRatePerUnit || 12;
        const finalAmount = units * rate;

        await createElectricityBill({
          customerId: id,
          customerName: customer?.displayName || 'Customer',
          roomId: currentRoom.id,
          roomNumber: currentRoom.roomNumber,
          apartmentId: currentRoom.apartmentId,
          apartmentName: currentApartment?.name || 'Apartment',
          billingMonth: billForm.month,
          previousReading: billForm.prevReading,
          currentReading: billForm.currReading,
          unitsConsumed: units,
          ratePerUnit: rate,
          totalAmount: finalAmount,
          status: 'unpaid',
          dueDate: billForm.dueDate,
          paidAt: null
        });

        await createPayment({
          customerId: id,
          customerName: customer?.displayName || 'Customer',
          roomId: currentRoom.id,
          roomNumber: currentRoom.roomNumber,
          apartmentId: currentRoom.apartmentId,
          apartmentName: currentApartment?.name || 'Apartment',
          amount: finalAmount,
          type: 'electricity',
          status: 'pending',
          dueDate: billForm.dueDate,
          paidAt: null,
          billingMonth: billForm.month
        });
      }

      await createAuditLog({
        adminId: user?.uid || 'admin-id',
        adminName: user?.displayName || 'Admin',
        action: `Generated manual ${billForm.type} bill for customer "${customer?.displayName}" for ${billForm.month}`,
        entityType: 'payment',
        entityId: id
      });

      setShowBillModal(false);
      setMsg({ type: 'success', text: 'Invoice generated successfully!' });
    } catch (err: any) {
      alert(err.message || 'Failed to generate invoice');
    } finally {
      setSubmittingBill(false);
    }
  };

  // Notes admin helpers
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !adminNotesText.trim() || !customer) return;
    const newNote = {
      id: `note-${Math.random().toString(36).substr(2, 9)}`,
      text: adminNotesText.trim(),
      pinned: false,
      createdAt: Date.now()
    };
    const updated = [newNote, ...adminNotesList];
    setAdminNotesList(updated);
    setAdminNotesText('');

    try {
      await updateUserProfile(id, {
        businessInfo: JSON.stringify(updated)
      }, user?.role);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePinNote = async (noteId: string) => {
    if (!id) return;
    const updated = adminNotesList.map(n => n.id === noteId ? { ...n, pinned: !n.pinned } : n);
    setAdminNotesList(updated);
    try {
      await updateUserProfile(id, {
        businessInfo: JSON.stringify(updated)
      }, user?.role);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;
    const updated = adminNotesList.filter(n => n.id !== noteId);
    setAdminNotesList(updated);
    try {
      await updateUserProfile(id, {
        businessInfo: JSON.stringify(updated)
      }, user?.role);
    } catch (e) {
      console.error(e);
    }
  };

  // Reports
  const handleDownloadReport = () => {
    if (!customer) return;
    setDownloadingReport(true);
    setTimeout(() => {
      exportCustomerReportPDF(
        customer, 
        currentRoom || null, 
        currentApartment || null, 
        payments, 
        bills, 
        complaints, 
        user?.displayName || 'SAMS Operator'
      );
      setDownloadingReport(false);
    }, 1000);
  };

  const handleDownloadAgreement = () => {
    if (!currentRoom || !currentApartment || !customer) return;
    setDownloadingAgreement(true);
    setTimeout(() => {
      exportAgreementPDF(customer, currentRoom, currentApartment, user?.displayName || 'Admin Manager');
      setDownloadingAgreement(false);
    }, 800);
  };

  // Expiry Checker
  const checkExpiryStatus = (dateStr?: string) => {
    if (!dateStr) return { color: 'text-slate-400', label: 'No Expiry', warning: false };
    const exp = new Date(dateStr).getTime();
    const diff = exp - Date.now();
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000));

    if (days < 0) {
      return { color: 'text-red-500 font-bold', label: 'EXPIRED', warning: true };
    } else if (days <= 30) {
      return { color: 'text-amber-500 font-bold animate-pulse', label: `Expiring in ${days} days`, warning: true };
    }
    return { color: 'text-emerald-500 font-bold', label: `Expires ${new Date(dateStr).toLocaleDateString()}`, warning: false };
  };

  const activeExpirations = documents.map(d => ({ doc: d, status: checkExpiryStatus(d.expiryDate) }))
    .filter(item => item.status.warning);

  // Status Classes
  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case 'paid':
      case 'approved':
      case 'resolved':
      case 'active':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'pending':
      case 'unpaid':
      case 'in-progress':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'rejected':
      case 'suspended':
      case 'terminated':
      case 'overdue':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case 'emergency':
        return 'bg-red-600 text-white border border-red-700 animate-pulse';
      case 'high':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
    }
  };

  // Lists filtering & sorting & pagination helper
  const getFilteredPayments = () => {
    let list = [...payments];
    const search = searchQueries.payments.trim().toLowerCase();
    if (search) {
      list = list.filter(p => p.billingMonth.toLowerCase().includes(search) || p.type.toLowerCase().includes(search));
    }
    if (filters.paymentsStatus !== 'all') {
      list = list.filter(p => p.status === filters.paymentsStatus);
    }
    return list.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  };

  const getFilteredBills = () => {
    let list = [...bills];
    const search = searchQueries.electricity.trim().toLowerCase();
    if (search) {
      list = list.filter(b => b.billingMonth.toLowerCase().includes(search));
    }
    if (filters.electricityStatus !== 'all') {
      list = list.filter(b => b.status === filters.electricityStatus);
    }
    return list.sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
  };

  const getFilteredComplaints = () => {
    let list = [...complaints];
    const search = searchQueries.complaints.trim().toLowerCase();
    if (search) {
      list = list.filter(c => c.title.toLowerCase().includes(search) || c.category.toLowerCase().includes(search));
    }
    if (filters.complaintsStatus !== 'all') {
      list = list.filter(c => c.status === filters.complaintsStatus);
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  };

  const getFilteredDocs = () => {
    let list = [...documents];
    const search = searchQueries.documents.trim().toLowerCase();
    if (search) {
      list = list.filter(d => d.title.toLowerCase().includes(search));
    }
    return list;
  };

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

  if (loading && !customer) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <ArrowLeft size={16} className="text-muted-foreground animate-pulse" />
          <div className="h-4 bg-muted dark:bg-slate-800 rounded w-28 animate-pulse" />
        </div>
        <div className="animate-pulse space-y-6">
          <div className="h-28 bg-muted dark:bg-slate-800 rounded-3xl w-full" />
          <div className="h-10 bg-muted dark:bg-slate-800 rounded-xl w-1/3" />
          <div className="h-64 bg-muted dark:bg-slate-800 rounded-3xl w-full" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-muted-foreground font-semibold">
        Customer profile not found in registries.
      </div>
    );
  }

  // Derive custom SAMS Customer CRM Fields
  const mockCRM = {
    customerID: `CUST-2026-${customer.uid.toUpperCase().slice(-4)}`,
    emergencyContact: customer.emergencyContact || 'Not Specified',
    dob: customer.dob || 'Not Specified',
    occupation: customer.occupation || 'Not Specified',
    gender: customer.gender || 'Not Specified',
    nationality: customer.nationality || 'Not Specified',
    bloodGroup: customer.bloodGroup || 'Not Specified',
    parentDetails: customer.parentDetails || 'Not Specified',
    collegeCompany: customer.collegeCompany || 'Not Specified',
    permAddress: customer.address || 'Not Specified',
    block: currentRoom?.wing || 'Main Block',
    floor: currentRoom?.floor ? `${currentRoom.floor} Floor` : '1st Floor',
    bookingDate: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A',
    leaseStart: customer.leaseStartDate || 'N/A',
    leaseEnd: customer.leaseEndDate || 'N/A',
    securityDeposit: customer.leaseSecurityDeposit || 0,
    photoUrl: customer.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(customer.displayName)}&backgroundColor=0284c7`
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 text-foreground animate-in fade-in duration-300">
      
      {/* ── BREADCRUMBS & BACK LINK ────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/admin/customers')}
          className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-slate-850 dark:hover:text-slate-200 transition-colors w-fit"
        >
          <ArrowLeft size={14} className="mr-1" /> Back to Registry
        </button>

        <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Admin Portal</span>
          <ChevronRight size={12} />
          <Link to="/admin/customers" className="hover:underline">Customer Registry</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-black">{customer.displayName}</span>
        </div>
      </div>

      {/* ── CRM PROFILE HEADER CARD BLOCK ──────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="relative group">
            <img 
              src={mockCRM.photoUrl} 
              alt={customer.displayName} 
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
                      const url = await uploadFile(file, `profiles/${customer.uid}`);
                      await updateUserProfile(customer.uid, { photoUrl: url }, user?.role);
                      setMsg({ type: 'success', text: 'Profile picture updated successfully!' });
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
              <h1 className="text-2xl font-black text-foreground tracking-tight leading-none">{customer.displayName}</h1>
              <div className="flex items-center justify-center gap-1.5">
                <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${getStatusBadgeClass(customer.status)}`}>
                  {customer.status}
                </span>
                <span className="text-xs font-semibold text-muted-foreground font-mono">({mockCRM.customerID})</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-4 text-xs font-semibold text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail size={13} className="text-slate-400" /> {customer.email}</span>
              <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {customer.phoneNumber || 'No phone'}</span>
              {currentRoom && currentApartment ? (
                <span className="flex items-center gap-1.5">
                  <Building size={13} className="text-slate-400" />
                  <span className="text-brand-500 font-bold">
                    Room {currentRoom.roomNumber} ({currentApartment.name})
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-red-500"><AlertCircle size={13} /> Unassigned Unit</span>
              )}
              <span className="flex items-center gap-1.5"><Calendar size={13} className="text-slate-400" /> Move-in: {mockCRM.leaseStart}</span>
              <span className="flex items-center gap-1.5 font-mono"><Shield size={13} className="text-slate-400" /> Agreement: {customer.leaseStatus || 'No Lease'}</span>
            </div>
          </div>
        </div>

        {/* Header Action row */}
        <div className="flex flex-wrap items-center gap-2 xl:self-center">
          <button 
            onClick={handleDownloadAgreement}
            disabled={!currentRoom || downloadingAgreement}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-muted hover:bg-muted/80 border border-border text-foreground rounded-xl transition-all disabled:opacity-50"
          >
            {downloadingAgreement ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />} View Lease
          </button>
          <button 
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md shadow-brand-500/10 transition-all"
          >
            {downloadingReport ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />} Printable Summary (PDF)
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`px-4 py-3 rounded-2xl text-xs font-bold border flex gap-2 items-center animate-in fade-in duration-200 ${
          msg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/35 text-red-600 dark:text-red-400'
        }`}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          <span>{msg.text}</span>
          <button onClick={() => setMsg({ type: '', text: '' })} className="ml-auto hover:opacity-70"><X size={14}/></button>
        </div>
      )}

      {/* Expiry Alerts Banner */}
      {activeExpirations.length > 0 && (
        <div className="p-4 bg-amber-555/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle size={16} />
            <span>Document Expiry Registry Alerts ({activeExpirations.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-bold">
            {activeExpirations.map(item => (
              <div key={item.doc.id} className="flex justify-between items-center bg-card/40 p-2 rounded-lg border border-border/50">
                <span className="text-foreground">{item.doc.title}</span>
                <span className={item.status.color}>{item.status.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB SELECTION BAR ───────────────────────────────────────────── */}
      <div className="flex overflow-x-auto gap-1 p-1 bg-muted dark:bg-slate-800/80 rounded-2xl w-full scrollbar-none border border-border/50">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'profile', label: 'Profile File', icon: FileText },
          { id: 'apartment', label: 'Tenancy Unit', icon: Building },
          { id: 'documents', label: `Docs (${documents.length})`, icon: FileText },
          { id: 'lease', label: 'Lease Contract', icon: Shield },
          { id: 'payments', label: `Invoices (${payments.length})`, icon: CreditCard },
          { id: 'electricity', label: 'Electricity', icon: Zap },
          { id: 'complaints', label: `Complaints (${complaints.length})`, icon: AlertCircle },
          { id: 'visits', label: `Visits (${requests.length})`, icon: Calendar },
          { id: 'activity', label: 'Activity Logs', icon: Activity },
          { id: 'notes', label: `Notes (${adminNotesList.length})`, icon: Bookmark }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as any); setEditMode(false); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                isSelected 
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/45'
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── MAIN TAB CONTENT PANEL ──────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-5 md:p-6 shadow-sm min-h-[400px]">
        
        {/* 1. OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Personal Details Card */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">Personal Details</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-medium">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Full Name</p>
                    <p className="font-bold text-foreground">{customer.displayName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Customer CRM ID</p>
                    <p className="font-bold text-foreground font-mono">{mockCRM.customerID}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Phone Number</p>
                    <p className="font-bold text-foreground">{customer.phoneNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Email Address</p>
                    <p className="font-bold text-foreground">{customer.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Date of Birth</p>
                    <p className="font-bold text-foreground">{mockCRM.dob}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Gender</p>
                    <p className="font-bold text-foreground capitalize">{mockCRM.gender}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Nationality</p>
                    <p className="font-bold text-foreground">{mockCRM.nationality}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Blood Group</p>
                    <p className="font-bold text-foreground uppercase">{mockCRM.bloodGroup}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Occupation</p>
                    <p className="font-bold text-foreground">{mockCRM.occupation}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">College/Company</p>
                    <p className="font-bold text-foreground">{mockCRM.collegeCompany}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-0.5">Guardian/Parent details</p>
                    <p className="font-bold text-foreground">{mockCRM.parentDetails}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-0.5">Emergency Contact Point</p>
                    <p className="font-bold text-foreground">{mockCRM.emergencyContact}</p>
                  </div>
                </div>
              </div>

              {/* Lease Details Card */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">Lease Details</h3>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs font-medium">
                  <div>
                    <p className="text-muted-foreground mb-0.5">Apartment Asset</p>
                    <p className="font-bold text-foreground">{currentApartment?.name || 'Unassigned'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Room & Location</p>
                    {currentRoom ? (
                      <p className="font-bold text-foreground">{mockCRM.floor}, Block {mockCRM.block}, Room {currentRoom.roomNumber}</p>
                    ) : (
                      <p className="font-bold text-red-500">Unassigned</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Booking / Allocation Date</p>
                    <p className="font-bold text-foreground">{mockCRM.bookingDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Move-in Date</p>
                    <p className="font-bold text-foreground">{mockCRM.leaseStart}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Agreement Period</p>
                    <p className="font-bold text-foreground">{mockCRM.leaseStart} - {mockCRM.leaseEnd}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Monthly Rent Price</p>
                    <p className="font-bold text-foreground">₹{customer.leaseMonthlyRent?.toLocaleString() || '0'}/mo</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Security Deposit Paid</p>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">₹{mockCRM.securityDeposit?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-0.5">Lease Status</p>
                    <span className={`inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full capitalize border ${getStatusBadgeClass(customer.leaseStatus || 'pending')}`}>
                      {customer.leaseStatus || 'No Active Lease'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Address Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-border/50 pt-6">
              <div className="p-4 bg-muted/20 border border-border rounded-2xl flex gap-3">
                <MapPin className="text-slate-400 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Permanent Home Address</h4>
                  <p className="text-xs font-semibold leading-relaxed">{mockCRM.permAddress}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/20 border border-border rounded-2xl flex gap-3">
                <MapPin className="text-brand-500 flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1">Current Leased Address</h4>
                  {currentRoom && currentApartment ? (
                    <p className="text-xs font-semibold leading-relaxed">
                      {currentApartment.address}, Room {currentRoom.roomNumber}, Floor {currentRoom.floor || 1}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400">No active address record found.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Portal Status Configuration Panel */}
            <div className="border-t border-border pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Quick Tenancy Operations</h4>
                <p className="text-[10px] text-muted-foreground font-semibold">Assign rooms, transfer accounts, or suspend user access credentials.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentRoom ? (
                  <>
                    <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs font-bold rounded-xl hover:bg-muted text-foreground transition-all">
                      <RefreshCw size={12} /> Transfer Unit
                    </button>
                    <button onClick={handleRemove} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl hover:bg-red-500/20 transition-all">
                      <UserMinus size={12} /> Vacate / Remove
                    </button>
                  </>
                ) : (
                  <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/10">
                    <UserPlus size={13} /> Allocate Room Unit
                  </button>
                )}
                <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl hover:bg-red-500/20 transition-all">
                  <Trash2 size={12} /> Delete Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. PROFILE EDIT PANEL */}
        {activeTab === 'profile' && (
          <form onSubmit={handleProfileSave} className="space-y-4 max-w-2xl animate-in fade-in duration-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-4">Edit Customer Profile File</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.displayName}
                  onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={profileForm.email}
                  onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  required
                  value={profileForm.phoneNumber}
                  onChange={e => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Date of Birth</label>
                <input
                  type="text"
                  value={profileForm.dob}
                  placeholder="e.g. 15th August 1995"
                  onChange={e => setProfileForm({ ...profileForm, dob: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Gender</label>
                <select
                  value={profileForm.gender}
                  onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-brand-500 text-foreground"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Nationality</label>
                <input
                  type="text"
                  value={profileForm.nationality}
                  onChange={e => setProfileForm({ ...profileForm, nationality: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Blood Group</label>
                <input
                  type="text"
                  value={profileForm.bloodGroup}
                  placeholder="e.g. O+ve"
                  onChange={e => setProfileForm({ ...profileForm, bloodGroup: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Occupation</label>
                <input
                  type="text"
                  value={profileForm.occupation}
                  onChange={e => setProfileForm({ ...profileForm, occupation: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">College / Company Name</label>
                <input
                  type="text"
                  value={profileForm.collegeCompany}
                  onChange={e => setProfileForm({ ...profileForm, collegeCompany: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Parent / Guardian details</label>
                <input
                  type="text"
                  value={profileForm.parentDetails}
                  onChange={e => setProfileForm({ ...profileForm, parentDetails: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Emergency Contact Point</label>
                <input
                  type="text"
                  value={profileForm.emergencyContact}
                  onChange={e => setProfileForm({ ...profileForm, emergencyContact: e.target.value })}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-brand-500 text-foreground"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">Permanent Address</label>
                <textarea
                  value={profileForm.address}
                  onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                  rows={3}
                  className="w-full bg-input/50 dark:bg-slate-800 border border-border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-brand-500 resize-none text-foreground"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/10"
              >
                Save Details
              </button>
            </div>
          </form>
        )}

        {/* 3. TENANCY UNIT PANEL */}
        {activeTab === 'apartment' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">Tenancy Room Allocation</h3>
            
            {currentRoom ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Allocated Room details */}
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                    <h4 className="font-bold text-xs uppercase text-brand-500 flex items-center gap-1.5"><DoorOpen size={14}/> Room Unit {currentRoom.roomNumber} Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      <div>
                        <p className="text-slate-400 mb-0.5">Status</p>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${getStatusBadgeClass(currentRoom.status)}`}>
                          {currentRoom.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Room Type</p>
                        <p className="font-bold text-foreground">{currentRoom.roomType || 'Standard Single'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Monthly rent price</p>
                        <p className="font-bold text-foreground">₹{currentRoom.rentAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Security deposit amount</p>
                        <p className="font-bold text-foreground">₹{(currentRoom.securityDeposit || currentRoom.rentAmount * 2)?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Asset Wing / Sector</p>
                        <p className="font-bold text-foreground">{currentRoom.wing || 'Main Wing'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-0.5">Floor Level</p>
                        <p className="font-bold text-foreground">{currentRoom.floor || 1} Floor</p>
                      </div>
                    </div>
                  </div>

                  {/* Co-living Roommates registry list */}
                  <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                    <h4 className="font-bold text-xs uppercase text-slate-400 flex items-center gap-1.5"><Users size={14}/> Co-living Roommates</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold">Other active customers currently assigned to the same room.</p>
                    
                    {roommates.length === 0 ? (
                      <p className="text-xs text-muted-foreground font-semibold italic py-2">No other active roommates allocated to this space.</p>
                    ) : (
                      <div className="divide-y divide-border/60">
                        {roommates.map((mate: any) => (
                          <div key={mate.uid} className="flex justify-between items-center py-2 text-xs font-semibold">
                            <span className="text-foreground">{mate.displayName}</span>
                            <span className="text-slate-400 font-mono">({mate.phoneNumber || 'No phone'})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Apartment Info Card */}
                {currentApartment && (
                  <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                    <div>
                      {currentApartment.imageUrl && (
                        <img src={currentApartment.imageUrl} alt={currentApartment.name} className="w-full h-36 object-cover" />
                      )}
                      <div className="p-4 space-y-3">
                        <h4 className="font-black text-sm text-foreground tracking-tight">{currentApartment.name}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">{currentApartment.description}</p>
                        
                        <div className="space-y-2 border-t border-border/50 pt-3 text-[11px] font-semibold text-muted-foreground">
                          <p className="flex items-center gap-1.5"><MapPin size={12}/> {currentApartment.address}</p>
                          <p className="flex items-center gap-1.5"><Zap size={12}/> Electricity Rate: ₹{currentApartment.electricityRatePerUnit || 12}/kWh</p>
                        </div>
                      </div>
                    </div>
                    {currentApartment.googleMapsLink && (
                      <div className="p-4 border-t border-border/50 bg-muted/10">
                        <a href={currentApartment.googleMapsLink} target="_blank" rel="noreferrer" className="block text-center text-xs font-bold text-brand-500 dark:text-brand-400 hover:underline">
                          View Asset Location (Google Maps)
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center border border-dashed border-border rounded-2xl space-y-4">
                <Building className="mx-auto text-slate-400 animate-pulse" size={32} />
                <div>
                  <h4 className="text-sm font-bold text-foreground">No Room Allocation Found</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">This customer is not currently assigned to any room unit. You can search vacant slots and allocate a unit.</p>
                </div>
                <button onClick={() => setShowAssignModal(true)} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-brand-500/10">
                  Allocate Room Unit
                </button>
              </div>
            )}
          </div>
        )}

        {/* 4. DOCUMENTS PANEL */}
        {activeTab === 'documents' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Verification Documents Hub</h3>
              <button onClick={() => setShowDocModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-md">
                <Plus size={13} /> Upload Document
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchQueries.documents}
                onChange={e => setSearchQueries({ ...searchQueries, documents: e.target.value })}
                placeholder="Search documents by name..."
                className="pl-3 pr-3 py-1.5 bg-input/50 border border-border rounded-xl text-xs text-foreground focus:outline-none w-full max-w-md"
              />
            </div>

            {getFilteredDocs().length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No verification documents uploaded for this profile.</p>
            ) : (
              <div className="overflow-x-auto border border-border rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground font-bold border-b border-border uppercase tracking-wider">
                      <th className="px-4 py-3">Document Title</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Expiry Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPagedList(getFilteredDocs(), 'documents').map(d => (
                      <tr key={d.id} className="hover:bg-muted/10 border-b border-border font-medium text-foreground">
                        <td className="px-4 py-3 flex items-center gap-2">
                          <FileText size={14} className="text-slate-400 font-bold" />
                          <span className="font-bold">{d.title}</span>
                        </td>
                        <td className="px-4 py-3 uppercase tracking-wider text-[10px]">{d.type}</td>
                        <td className="px-4 py-3">{d.expiryDate || 'No Expiry'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusBadgeClass(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          {d.fileUrl && (
                            <a href={d.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center p-1.5 bg-muted text-foreground rounded-lg hover:bg-muted/80">
                              <Eye size={12} />
                            </a>
                          )}
                          <select
                            value={d.status}
                            onChange={(e) => handleVerifyDocument(d.id, e.target.value as any)}
                            className="bg-input/60 border border-border text-[10px] font-bold p-1 rounded-lg focus:outline-none text-foreground"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Verify</option>
                            <option value="rejected">Reject</option>
                          </select>
                          <button onClick={() => handleDeleteDocument(d.id, d.title)} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20">
                            <Trash size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {getFilteredDocs().length > itemsPerPage && (
                  <div className="flex items-center justify-between p-4 bg-muted/10 border-t border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Page {pageIndices.documents || 1} of {getPageCount(getFilteredDocs().length)}</span>
                    <div className="flex gap-2">
                      <button disabled={(pageIndices.documents || 1) === 1} onClick={() => setPage('documents', (pageIndices.documents || 1) - 1)} className="px-2.5 py-1 border border-border rounded text-[10px] font-bold disabled:opacity-50">Prev</button>
                      <button disabled={(pageIndices.documents || 1) === getPageCount(getFilteredDocs().length)} onClick={() => setPage('documents', (pageIndices.documents || 1) + 1)} className="px-2.5 py-1 border border-border rounded text-[10px] font-bold disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. LEASE CONTRACT PANEL */}
        {activeTab === 'lease' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lease Agreement Contract</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowLeaseModal(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-md">
                  <Plus size={13} /> Update / Renew Lease
                </button>
                <button onClick={handleTerminateLease} className="flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl transition-all">
                  <UserMinus size={13} /> Terminate Agreement
                </button>
              </div>
            </div>

            {customer.leaseAgreementNumber ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-muted/10 border border-border rounded-2xl p-5 space-y-4">
                  <h4 className="font-bold text-xs uppercase text-brand-500 flex items-center gap-1.5"><Shield size={14}/> Contract Information</h4>
                  
                  <div className="grid grid-cols-2 gap-y-3 text-xs font-semibold">
                    <div>
                      <p className="text-slate-400 mb-0.5">Agreement Number</p>
                      <p className="font-bold text-foreground select-all font-mono">{customer.leaseAgreementNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-0.5">Status</p>
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border capitalize ${getStatusBadgeClass(customer.leaseStatus || 'pending')}`}>
                        {customer.leaseStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-0.5">Start Date</p>
                      <p className="font-bold text-foreground">{customer.leaseStartDate}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-0.5">End Date</p>
                      <p className="font-bold text-foreground">{customer.leaseEndDate}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-0.5">Monthly Rent Price</p>
                      <p className="font-bold text-foreground">₹{customer.leaseMonthlyRent?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-0.5">Security Deposit Paid</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">₹{customer.leaseSecurityDeposit?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 mb-0.5">Electricity Meter Unit Rate</p>
                      <p className="font-bold text-foreground">₹{customer.leaseElectricityRate || 12}/kWh</p>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/10 border border-border rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs uppercase text-slate-400">Special Terms & Rules</h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">{customer.leaseSpecialConditions || 'No custom lease conditions specified.'}</p>
                  </div>
                  
                  {customer.leaseFileUrl && (
                    <div className="pt-3 border-t border-border">
                      <a href={customer.leaseFileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs font-bold text-brand-500 hover:underline">
                        <FileText size={14} /> Open Signed Agreement Document (PDF)
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-10 text-center border border-dashed border-border rounded-2xl space-y-3">
                <Shield className="mx-auto text-slate-400 animate-pulse" size={32} />
                <h4 className="text-sm font-bold text-foreground">No Lease Agreement Initialized</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">This customer profile has no contract file initialized. You can set up rent parameters and active lease terms.</p>
                <button onClick={() => setShowLeaseModal(true)} className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all">
                  Set Up Contract Lease
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. INVOICES & PAYMENTS PANEL */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payments & Rent Ledger</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (currentRoom) {
                      setBillForm({ type: 'rent', amount: currentRoom.rentAmount, month: '2026-07', dueDate: '2026-07-05', prevReading: 0, currReading: 0 });
                    }
                    setShowBillModal(true);
                  }}
                  disabled={!currentRoom}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
                >
                  <Plus size={13} /> Generate Invoice
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <input
                type="text"
                value={searchQueries.payments}
                onChange={e => setSearchQueries({ ...searchQueries, payments: e.target.value })}
                placeholder="Search invoices by month or type..."
                className="pl-3 pr-3 py-1.5 bg-input/50 border border-border rounded-xl text-xs text-foreground focus:outline-none w-full max-w-xs"
              />
              <select
                value={filters.paymentsStatus}
                onChange={e => setFilters({ ...filters, paymentsStatus: e.target.value })}
                className="bg-input/60 border border-border text-xs font-semibold p-1.5 rounded-xl focus:outline-none text-foreground"
              >
                <option value="all">All Invoices</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {getFilteredPayments().length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No payment transactions registered in ledger.</p>
            ) : (
              <div className="overflow-x-auto border border-border rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground font-bold border-b border-border uppercase tracking-wider">
                      <th className="px-4 py-3">Billing Month</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Amount (₹)</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPagedList(getFilteredPayments(), 'payments').map(p => (
                      <tr key={p.id} className="hover:bg-muted/10 border-b border-border font-medium text-foreground">
                        <td className="px-4 py-3 font-bold font-mono">{p.billingMonth}</td>
                        <td className="px-4 py-3 capitalize">{p.type}</td>
                        <td className="px-4 py-3 font-bold">₹{p.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">{p.dueDate}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getStatusBadgeClass(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => exportRentReceiptPDF(p, currentApartment?.name || 'SAMS Apartment')}
                            className="p-1 border border-border hover:bg-muted rounded-lg text-slate-400 hover:text-foreground transition-all"
                          >
                            <Printer size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {getFilteredPayments().length > itemsPerPage && (
                  <div className="flex items-center justify-between p-4 bg-muted/10 border-t border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Page {pageIndices.payments || 1} of {getPageCount(getFilteredPayments().length)}</span>
                    <div className="flex gap-2">
                      <button disabled={(pageIndices.payments || 1) === 1} onClick={() => setPage('payments', (pageIndices.payments || 1) - 1)} className="px-2.5 py-1 border border-border rounded text-[10px] font-bold disabled:opacity-50">Prev</button>
                      <button disabled={(pageIndices.payments || 1) === getPageCount(getFilteredPayments().length)} onClick={() => setPage('payments', (pageIndices.payments || 1) + 1)} className="px-2.5 py-1 border border-border rounded text-[10px] font-bold disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 7. ELECTRICITY PANEL */}
        {activeTab === 'electricity' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Electricity Utility Invoices</h3>
              <button
                onClick={() => {
                  setBillForm({ type: 'electricity', amount: 0, month: '2026-06', dueDate: '2026-07-15', prevReading: 0, currReading: 0 });
                  setShowBillModal(true);
                }}
                disabled={!currentRoom}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
              >
                <Plus size={13} /> Record Readings
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <input
                type="text"
                value={searchQueries.electricity}
                onChange={e => setSearchQueries({ ...searchQueries, electricity: e.target.value })}
                placeholder="Search readings by month..."
                className="pl-3 pr-3 py-1.5 bg-input/50 border border-border rounded-xl text-xs text-foreground focus:outline-none w-full max-w-xs"
              />
              <select
                value={filters.electricityStatus}
                onChange={e => setFilters({ ...filters, electricityStatus: e.target.value })}
                className="bg-input/60 border border-border text-xs font-semibold p-1.5 rounded-xl focus:outline-none text-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            {getFilteredBills().length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No utility bills logged in history.</p>
            ) : (
              <div className="overflow-x-auto border border-border rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground font-bold border-b border-border uppercase tracking-wider">
                      <th className="px-4 py-3">Billing Month</th>
                      <th className="px-4 py-3">Prev Reading</th>
                      <th className="px-4 py-3">Curr Reading</th>
                      <th className="px-4 py-3">Units (kWh)</th>
                      <th className="px-4 py-3">Total (₹)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Invoices</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPagedList(getFilteredBills(), 'electricity').map(b => (
                      <tr key={b.id} className="hover:bg-muted/10 border-b border-border font-medium text-foreground">
                        <td className="px-4 py-3 font-bold font-mono">{b.billingMonth}</td>
                        <td className="px-4 py-3">{b.previousReading}</td>
                        <td className="px-4 py-3">{b.currentReading}</td>
                        <td className="px-4 py-3 font-semibold text-brand-500">{b.unitsConsumed} kWh</td>
                        <td className="px-4 py-3 font-bold">₹{b.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getStatusBadgeClass(b.status === 'unpaid' ? 'unpaid' : 'paid')}`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => exportElectricityBillPDF(b, currentApartment?.name || 'SAMS Building', user?.displayName || 'Admin Operator')}
                            className="p-1 border border-border hover:bg-muted rounded-lg text-slate-400 hover:text-foreground transition-all"
                          >
                            <Printer size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {getFilteredBills().length > itemsPerPage && (
                  <div className="flex items-center justify-between p-4 bg-muted/10 border-t border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Page {pageIndices.electricity || 1} of {getPageCount(getFilteredBills().length)}</span>
                    <div className="flex gap-2">
                      <button disabled={(pageIndices.electricity || 1) === 1} onClick={() => setPage('electricity', (pageIndices.electricity || 1) - 1)} className="px-2.5 py-1 border border-border rounded text-[10px] font-bold disabled:opacity-50">Prev</button>
                      <button disabled={(pageIndices.electricity || 1) === getPageCount(getFilteredBills().length)} onClick={() => setPage('electricity', (pageIndices.electricity || 1) + 1)} className="px-2.5 py-1 border border-border rounded text-[10px] font-bold disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 8. COMPLAINTS PANEL */}
        {activeTab === 'complaints' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Active Complaint Tickets</h3>
            
            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <input
                type="text"
                value={searchQueries.complaints}
                onChange={e => setSearchQueries({ ...searchQueries, complaints: e.target.value })}
                placeholder="Search complaints..."
                className="pl-3 pr-3 py-1.5 bg-input/50 border border-border rounded-xl text-xs text-foreground focus:outline-none w-full max-w-xs"
              />
              <select
                value={filters.complaintsStatus}
                onChange={e => setFilters({ ...filters, complaintsStatus: e.target.value })}
                className="bg-input/60 border border-border text-xs font-semibold p-1.5 rounded-xl focus:outline-none text-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {getFilteredComplaints().length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No complaint tickets logged.</p>
            ) : (
              <div className="overflow-x-auto border border-border rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground font-bold border-b border-border uppercase tracking-wider">
                      <th className="px-4 py-3">Complaint Info</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Raised At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getPagedList(getFilteredComplaints(), 'complaints').map(c => (
                      <tr key={c.id} className="hover:bg-muted/10 border-b border-border font-medium text-foreground">
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-bold">{c.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>
                        </td>
                        <td className="px-4 py-3 capitalize">{c.category}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getPriorityBadgeClass(c.priority)}`}>
                            {c.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getStatusBadgeClass(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {getFilteredComplaints().length > itemsPerPage && (
                  <div className="flex items-center justify-between p-4 bg-muted/10 border-t border-border">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Page {pageIndices.complaints || 1} of {getPageCount(getFilteredComplaints().length)}</span>
                    <div className="flex gap-2">
                      <button disabled={(pageIndices.complaints || 1) === 1} onClick={() => setPage('complaints', (pageIndices.complaints || 1) - 1)} className="px-2.5 py-1 border border-border rounded text-[10px] font-bold disabled:opacity-50">Prev</button>
                      <button disabled={(pageIndices.complaints || 1) === getPageCount(getFilteredComplaints().length)} onClick={() => setPage('complaints', (pageIndices.complaints || 1) + 1)} className="px-2.5 py-1 border border-border rounded text-[10px] font-bold disabled:opacity-50">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 9. VISITS PANEL */}
        {activeTab === 'visits' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Historical Visit Requests</h3>
            
            {requests.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">No scheduling visits found in history logs.</p>
            ) : (
              <div className="overflow-x-auto border border-border rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground font-bold border-b border-border uppercase tracking-wider">
                      <th className="px-4 py-3">Apartment</th>
                      <th className="px-4 py-3">Visit Date</th>
                      <th className="px-4 py-3">Notes</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(r => (
                      <tr key={r.id} className="hover:bg-muted/10 border-b border-border font-medium text-foreground">
                        <td className="px-4 py-3 font-bold">{r.apartmentName || 'SAMS Complex'}</td>
                        <td className="px-4 py-3">{r.preferredVisitDate}</td>
                        <td className="px-4 py-3 text-slate-400 italic max-w-xs truncate">{r.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${getStatusBadgeClass(r.status)}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 10. TIMELINE / ACTIVITY PANEL */}
        {activeTab === 'activity' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Manager Action Activity Registry</h3>
            
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">No timeline activity log records generated.</p>
            ) : (
              <div className="relative pl-6 space-y-6 border-l border-border ml-3">
                {timeline.slice(0, 15).map(log => (
                  <div key={log.id} className="relative">
                    <div className="absolute -left-[31px] top-0 w-2.5 h-2.5 rounded-full bg-brand-500 ring-4 ring-card" />
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-foreground leading-none">{log.action}</div>
                      <p className="text-[10px] text-muted-foreground font-semibold">
                        {new Date(log.timestamp).toLocaleString()} · Admin Operator: {log.adminName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 11. NOTES PANEL */}
        {activeTab === 'notes' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">Persistent Administrative Notepad</h3>
            
            <form onSubmit={handleAddNote} className="flex gap-2">
              <input
                type="text"
                required
                value={adminNotesText}
                onChange={e => setAdminNotesText(e.target.value)}
                placeholder="Type a new internal admin note..."
                className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500 text-foreground"
              />
              <button type="submit" className="flex items-center gap-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm">
                <Send size={12} /> Add
              </button>
            </form>

            <div className="space-y-3">
              {adminNotesList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No internal notes added to this customer file.</p>
              ) : (
                adminNotesList.map(note => (
                  <div key={note.id} className={`p-4 rounded-2xl border transition-all flex justify-between items-start ${
                    note.pinned 
                      ? 'bg-amber-500/5 border-amber-500/20 text-slate-900 dark:text-amber-100' 
                      : 'bg-muted/15 border-border text-foreground'
                  }`}>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold leading-relaxed">{note.text}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold font-mono">Logged: {new Date(note.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-1.5 ml-2 flex-shrink-0">
                      <button type="button" onClick={() => handleTogglePinNote(note.id)} className="p-1 hover:bg-muted/30 rounded text-slate-400 hover:text-amber-500">
                        <Bookmark size={13} className={note.pinned ? 'fill-amber-500 text-amber-500' : ''} />
                      </button>
                      <button type="button" onClick={() => handleDeleteNote(note.id)} className="p-1 hover:bg-muted/30 rounded text-slate-400 hover:text-red-500">
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── DRAWERS & MODALS ───────────────────────────────────────────── */}
      
      {/* 1. Allocate Room Unit Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Allocate Room Unit</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssign} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Select Vacant Room</label>
                {vacantRooms.length === 0 ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl">
                    No vacant rooms are available in any complex assets.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedRoomId}
                    onChange={e => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-bold focus:outline-none text-foreground"
                  >
                    <option value="">Select Room</option>
                    {vacantRooms.map(r => {
                      const apt = apartments.find(a => a.id === r.apartmentId);
                      return <option key={r.id} value={r.id}>#{r.roomNumber} - {apt?.name} - ₹{r.rentAmount.toLocaleString()}/mo</option>;
                    })}
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2 border border-border rounded-xl text-foreground text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedRoomId || assigning}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 shadow-md shadow-brand-500/10"
                >
                  {assigning ? 'Allocating...' : 'Assign Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Manual Invoice Generation Modal */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Generate Bill</h2>
              <button onClick={() => setShowBillModal(false)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleGenerateBillSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Invoice Type</label>
                <select
                  value={billForm.type}
                  onChange={e => setBillForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-bold focus:outline-none text-foreground"
                >
                  <option value="rent">Monthly Rent</option>
                  <option value="electricity">Electricity Utilities</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Target Month</label>
                  <input
                    type="month"
                    required
                    value={billForm.month}
                    onChange={e => setBillForm(prev => ({ ...prev, month: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Due Date</label>
                  <input
                    type="date"
                    required
                    value={billForm.dueDate}
                    onChange={e => setBillForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold focus:outline-none text-foreground"
                  />
                </div>
              </div>

              {billForm.type === 'rent' ? (
                <div>
                  <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Rent Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={billForm.amount}
                    onChange={e => setBillForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold focus:outline-none text-foreground"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Prev Reading</label>
                    <input
                      type="number"
                      required
                      value={billForm.prevReading}
                      onChange={e => setBillForm(prev => ({ ...prev, prevReading: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold focus:outline-none text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5">Curr Reading</label>
                    <input
                      type="number"
                      required
                      value={billForm.currReading}
                      onChange={e => setBillForm(prev => ({ ...prev, currReading: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-input border border-border rounded-xl text-xs font-semibold focus:outline-none text-foreground"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="flex-1 py-2 border border-border rounded-xl text-foreground text-xs font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBill}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/10"
                >
                  {submittingBill ? 'Generating...' : 'Issue Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Upload Verification Document Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Upload Verification Document</h2>
              <button onClick={() => setShowDocModal(false)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUploadDocument} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Document Title *</label>
                <input
                  required
                  value={docForm.title}
                  onChange={e => setDocForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Passport copy"
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Document Type</label>
                  <select
                    value={docForm.type}
                    onChange={e => setDocForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-bold focus:outline-none text-foreground"
                  >
                    <option value="id_proof">Identity Card</option>
                    <option value="passport">Passport</option>
                    <option value="visa">Visa</option>
                    <option value="college_id">College ID</option>
                    <option value="admission_letter">Admission Letter</option>
                    <option value="police_verification">Police Verification</option>
                    <option value="lease">Lease Agreement</option>
                    <option value="receipt">Deposit Receipt</option>
                    <option value="other">Other Document</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Expiry Date</label>
                  <input
                    type="date"
                    value={docForm.expiryDate}
                    onChange={e => setDocForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none text-foreground"
                  />
                </div>
              </div>

              <FileUploader
                label="Select Document File Attachments"
                path={`documents/${customer.uid}`}
                onUploadComplete={(url) => setDocForm(prev => ({ ...prev, fileUrl: url }))}
              />

              {docForm.fileUrl && (
                <div className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-lg p-2 font-bold flex items-center gap-1">
                  <CheckCircle size={12} /> Document uploaded successfully. Link ready!
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Internal Notes</label>
                <input
                  value={docForm.notes}
                  onChange={e => setDocForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Internal audit reference..."
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="flex-1 py-2 border border-border text-foreground hover:bg-muted text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc || !docForm.fileUrl}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {uploadingDoc ? 'Saving...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Lease Setup/Renewal Modal */}
      {showLeaseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Setup / Renew Lease Agreement</h2>
              <button onClick={() => setShowLeaseModal(false)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRenewLease} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Agreement ID Number</label>
                  <input
                    required
                    value={leaseForm.leaseAgreementNumber}
                    onChange={e => setLeaseForm(prev => ({ ...prev, leaseAgreementNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Monthly Rent (₹)</label>
                  <input
                    type="number"
                    required
                    value={leaseForm.leaseMonthlyRent}
                    onChange={e => setLeaseForm(prev => ({ ...prev, leaseMonthlyRent: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaseForm.leaseStartDate}
                    onChange={e => setLeaseForm(prev => ({ ...prev, leaseStartDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaseForm.leaseEndDate}
                    onChange={e => setLeaseForm(prev => ({ ...prev, leaseEndDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Security Deposit (₹)</label>
                  <input
                    type="number"
                    value={leaseForm.leaseSecurityDeposit}
                    onChange={e => setLeaseForm(prev => ({ ...prev, leaseSecurityDeposit: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none animate-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Electricity Rate per kWh (₹)</label>
                  <input
                    type="number"
                    value={leaseForm.leaseElectricityRate}
                    onChange={e => setLeaseForm(prev => ({ ...prev, leaseElectricityRate: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Special Terms / Conditions</label>
                <textarea
                  value={leaseForm.leaseSpecialConditions}
                  onChange={e => setLeaseForm(prev => ({ ...prev, leaseSpecialConditions: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-xs font-medium focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowLeaseModal(false)}
                  className="flex-1 py-2 border border-border text-foreground hover:bg-muted text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLease}
                  className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/10"
                >
                  {submittingLease ? 'Saving...' : 'Confirm Lease'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
