import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  subscribeToUsers, subscribeToRooms, subscribeToApartments, 
  subscribeToPayments, subscribeToElectricityBills, subscribeToComplaints 
} from '../../firebase/db';
import { UserProfile, Room, Apartment, Payment, ElectricityBill, Complaint } from '../../types';
import { 
  ArrowLeft, ChevronRight, Mail, Phone, Building2, CreditCard, Zap, 
  AlertCircle, FileText, User, Calendar, MapPin, CheckCircle, 
  Download, Eye, Clock, ShieldCheck, Printer, FileUp, X, Award, Check
} from 'lucide-react';
import { 
  exportCustomerReportPDF, exportRentReceiptPDF, exportElectricityBillPDF,
  exportAgreementPDF, exportCustomerDocumentExport, exportMonthlyRentReportPDF
} from '../../utils/exportUtils';
import { DocumentViewer } from '../../components/common/DocumentViewer';

interface MockDoc {
  name: string;
  type: string;
  status: 'Verified' | 'Pending' | 'Missing';
  uploadDate: string;
  optional?: boolean;
  fileSize?: string;
  fileUrl?: string | null;
}

export const CustomerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  
  // Real-time sub datasets
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  
  // Simulated document vault
  const [customerDocs, setCustomerDocs] = useState<MockDoc[]>([]);
  
  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'agreement' | 'rent' | 'electricity' | 'complaints' | 'documents' | 'payments' | 'timeline'>('overview');
  
  // Popup / Preview triggers
  const [previewDocName, setPreviewDocName] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [downloadingAgreement, setDownloadingAgreement] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    setLoading(true);

    const unsubscribes: (() => void)[] = [];

    // Real-time listeners
    unsubscribes.push(subscribeToUsers((usersList) => {
      const cust = usersList.find(u => u.uid === id);
      setCustomer(cust || null);
    }));

    unsubscribes.push(subscribeToRooms((allRooms) => {
      const rm = allRooms.find(r => r.currentCustomerId === id);
      setRoom(rm || null);
    }));

    unsubscribes.push(subscribeToApartments((allApts) => {
      if (room) {
        setApartment(allApts.find(a => a.id === room.apartmentId) || null);
      } else {
        // Fallback or derive from current apartments snapshot
        const allRoomsSnap = localStorage.getItem('rooms') ? JSON.parse(localStorage.getItem('rooms')!) : [];
        const rm = allRoomsSnap.find((r: any) => r.currentCustomerId === id);
        if (rm) {
          setApartment(allApts.find(a => a.id === rm.apartmentId) || null);
        }
      }
    }));

    unsubscribes.push(subscribeToPayments((pms) => {
      setPayments(pms.filter(p => p.customerId === id && p.type === 'rent').sort((a,b) => b.dueDate.localeCompare(a.dueDate)));
    }));

    unsubscribes.push(subscribeToElectricityBills((ebs) => {
      setBills(ebs.filter(b => b.customerId === id).sort((a,b) => b.billingMonth.localeCompare(a.billingMonth)));
    }));

    unsubscribes.push(subscribeToComplaints((cps) => {
      setComplaints(cps.filter(c => c.customerId === id).sort((a,b) => b.createdAt - a.createdAt));
    }));

    // LocalStorage simulator for customer documents vault files
    const savedDocs = localStorage.getItem(`sams_customer_docs_${id}`);
    if (savedDocs) {
      setCustomerDocs(JSON.parse(savedDocs));
    } else {
      const initialDocs: MockDoc[] = [
        { name: 'Rental Lease Agreement', type: 'Lease', status: 'Verified', uploadDate: '01 Jun 2026', fileSize: '1.2 MB' },
        { name: 'Aadhaar Card', type: 'ID Proof', status: 'Verified', uploadDate: '28 May 2026', fileSize: '850 KB' },
        { name: 'PAN Card', type: 'ID Proof', status: 'Verified', uploadDate: '28 May 2026', optional: true, fileSize: '620 KB' },
        { name: 'Customer Photo', type: 'Photo', status: 'Verified', uploadDate: '28 May 2026', fileSize: '150 KB' }
      ];
      setCustomerDocs(initialDocs);
      localStorage.setItem(`sams_customer_docs_${id}`, JSON.stringify(initialDocs));
    }

    setTimeout(() => setLoading(false), 750);

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [id, user, room?.id]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16 bg-card border border-border rounded-3xl space-y-3">
        <p className="text-[16px] text-foreground font-semibold">Customer Record Not Found</p>
        <button onClick={() => navigate('/owner/customers')} className="text-[14px] text-brand-650 font-bold hover:underline">
          Return to CRM List
        </button>
      </div>
    );
  }

  // Derive Mock CRM details
  const mockCRM = {
    customerID: `CUST-2026-${customer.uid.toUpperCase().slice(-4)}`,
    emergencyContact: customer.uid === 'customer-alex-id' ? 'Sarah Customer (+91 98765 43211 - Spouse)' : 'John Customer (+91 91234 56780 - Father)',
    dob: customer.uid === 'customer-alex-id' ? '15th August 1995' : '22nd November 1992',
    occupation: customer.uid === 'customer-alex-id' ? 'Software Engineer' : 'Product Designer',
    permAddress: customer.uid === 'customer-alex-id' 
      ? 'Plot 45, Sector 4, HSR Layout, Bengaluru, Karnataka, 560102' 
      : 'House 12, Park Street, Kolkata, West Bengal, 700016',
    bookingDate: '20 May 2026',
    photoUrl: customer.uid === 'customer-alex-id' 
      ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' 
      : 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'
  };

  const handleDownloadReport = () => {
    setDownloadingReport(true);
    setTimeout(() => {
      exportCustomerReportPDF(customer, room, apartment, payments, bills, complaints, user?.displayName || 'SAMS Operator');
      setDownloadingReport(false);
    }, 900);
  };

  const handleDownloadAgreement = () => {
    if (!room || !apartment) return;
    setDownloadingAgreement(true);
    setTimeout(() => {
      exportAgreementPDF(customer, room, apartment, user?.displayName || 'Owner');
      setDownloadingAgreement(false);
    }, 800);
  };

  const handleUploadDocument = (index: number) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*,application/pdf';
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const updated = [...customerDocs];
          updated[index].status = 'Verified';
          updated[index].uploadDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
          updated[index].fileSize = `${Math.round(file.size / 1024)} KB`;
          updated[index].fileUrl = reader.result as string;
          setCustomerDocs(updated);
          localStorage.setItem(`sams_customer_docs_${id}`, JSON.stringify(updated));
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  };

  return (
    <div className="space-y-8 py-2">
      
      {/* ── BREADCRUMBS ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => navigate('/owner/customers')}
          className="inline-flex items-center text-xs font-bold text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft size={14} className="mr-1" /> Back to Customers
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <span>Owner</span>
          <ChevronRight size={12} />
          <Link to="/owner/customers" className="hover:underline">Customer Records</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-bold">{customer.displayName}</span>
        </div>
      </div>

      {/* ── PROFILE COVER BLOCK ────────────────────────────────────────────── */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 hover:shadow-md transition-shadow">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <img 
            src={mockCRM.photoUrl} 
            alt={customer.displayName} 
            className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-sm shrink-0"
          />
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h2 className="text-[28px] font-black text-foreground tracking-tight leading-none">
                {customer.displayName}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase tracking-wider ${
                customer.leaseStatus === 'active' 
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
              }`}>
                {customer.leaseStatus || 'Inactive'}
              </span>
            </div>
            <p className="text-[14px] text-muted-foreground font-bold">{mockCRM.customerID} • {customer.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 shrink-0">
          <button 
            onClick={() => setPreviewDocName('Rental Lease Agreement')}
            className="px-4 py-2 border border-border hover:bg-muted text-foreground font-bold text-xs rounded-xl transition-all"
          >
            View Agreement
          </button>
          <button 
            onClick={handleDownloadAgreement}
            disabled={downloadingAgreement}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground border border-border font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Download Lease</span>
          </button>
          <button 
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print CRM Report</span>
          </button>
        </div>
      </div>

      {/* ── TABS NAVIGATION ────────────────────────────────────────────────── */}
      <div className="border-b border-border flex flex-wrap gap-2 text-[14px] font-semibold text-muted-foreground overflow-x-auto scrollbar-none">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'personal', label: 'Personal Details' },
          { key: 'agreement', label: 'Lease Agreement' },
          { key: 'rent', label: 'Rent Status' },
          { key: 'electricity', label: 'Electricity Bills' },
          { key: 'complaints', label: 'Complaints' },
          { key: 'documents', label: 'Documents' },
          { key: 'payments', label: 'Payments Ledger' },
          { key: 'timeline', label: 'Timeline' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-3 px-3 border-b-2 whitespace-nowrap transition-all ${
              activeTab === tab.key 
                ? 'border-emerald-600 text-foreground font-bold' 
                : 'border-transparent hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB PANEL CONTENTS ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Left: Basic Info */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Active Room Assignment</h3>
              {room && apartment ? (
                <div className="p-4 border border-border rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[12px] text-muted-foreground font-bold block">Complex Name</span>
                    <span className="text-[16px] font-semibold text-foreground block mt-0.5">{apartment.name}</span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground font-bold block">Room Number</span>
                    <span className="text-[16px] font-semibold text-foreground block mt-0.5">Room {room.roomNumber}</span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground font-bold block">Monthly Rent</span>
                    <span className="text-[16px] font-semibold text-foreground block mt-0.5">₹{room.rentAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground font-bold block">Move In Date</span>
                    <span className="text-[16px] font-semibold text-foreground block mt-0.5">{customer.leaseStartDate || 'N/A'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-6 border border-dashed border-border rounded-2xl text-center">
                  <p className="text-[14px] text-muted-foreground font-medium">This customer has not been allocated to any property rooms.</p>
                </div>
              )}
            </div>

            {/* Right: Quick KPI */}
            <div className="space-y-4">
              <h3 className="text-[20px] font-bold text-foreground tracking-tight">Financial Status</h3>
              <div className="p-4 border border-border rounded-2xl space-y-3 font-semibold text-[14px]">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <span className="text-muted-foreground">Outstanding Rent</span>
                  <span className="text-rose-500">₹{payments.filter(p=>p.status !== 'paid').reduce((s,p)=>s+p.amount, 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Outstanding Electricity</span>
                  <span className="text-amber-500">₹{bills.filter(b=>b.status !== 'paid').reduce((s,b)=>s+b.totalAmount, 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL INFORMATION */}
        {activeTab === 'personal' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground tracking-tight border-b border-border pb-3">Personal Information Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[14px] font-semibold">
              <div>
                <span className="text-[12px] text-muted-foreground font-bold block">Full Registered Name</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5">{customer.displayName}</span>
              </div>
              <div>
                <span className="text-[12px] text-muted-foreground font-bold block">Customer CRM ID</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5">{mockCRM.customerID}</span>
              </div>
              <div>
                <span className="text-[12px] text-muted-foreground font-bold block">Verified Email Address</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5">{customer.email}</span>
              </div>
              <div>
                <span className="text-[12px] text-muted-foreground font-bold block">Verified Contact Phone</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5">{customer.phoneNumber || 'Not verified'}</span>
              </div>
              <div>
                <span className="text-[12px] text-muted-foreground font-bold block">Date of Birth</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5">{mockCRM.dob}</span>
              </div>
              <div>
                <span className="text-[12px] text-muted-foreground font-bold block">Occupation / Profession</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5">{mockCRM.occupation}</span>
              </div>
              <div className="col-span-2 pt-4 border-t border-border">
                <span className="text-[12px] text-muted-foreground font-bold block">Emergency Nominee Contact</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5">{mockCRM.emergencyContact}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[12px] text-muted-foreground font-bold block">Permanent Residential Address</span>
                <span className="text-[16px] font-semibold text-foreground block mt-0.5 leading-relaxed">{mockCRM.permAddress}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LEASE AGREEMENT */}
        {activeTab === 'agreement' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground border-b border-border pb-3">Lease Agreement Conditions</h3>
            {customer.leaseStatus === 'active' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[14px] font-semibold">
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Lease Agreement Number</span>
                  <span className="text-[16px] font-semibold text-foreground block mt-0.5">{customer.leaseAgreementNumber || 'LSE-CONTRACT'}</span>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Lease Status</span>
                  <span className="text-emerald-600 block mt-0.5 font-extrabold">ACTIVE LEASE</span>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Lease Commenced Date</span>
                  <span className="text-[16px] font-semibold text-foreground block mt-0.5">{customer.leaseStartDate}</span>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Lease Termination Date</span>
                  <span className="text-[16px] font-semibold text-foreground block mt-0.5">{customer.leaseEndDate}</span>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Base Rent Realization</span>
                  <span className="text-[16px] font-semibold text-foreground block mt-0.5">₹{customer.leaseMonthlyRent?.toLocaleString('en-IN')} / Month</span>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Allocated Security Deposit</span>
                  <span className="text-[16px] font-semibold text-foreground block mt-0.5">₹{customer.leaseSecurityDeposit?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            ) : (
              <p className="text-[14px] text-muted-foreground font-medium">No active agreement registered on profile vault.</p>
            )}
          </div>
        )}

        {/* TAB 4: RENT STATUS */}
        {activeTab === 'rent' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Active Monthly Rent Status</h3>
            {payments[0] ? (
              <div className="p-4 border border-border rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-[14px] font-semibold">
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Billing Period</span>
                  <span className="text-[16px] font-semibold text-foreground block mt-0.5">{payments[0].billingMonth}</span>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Rent Invoice Due</span>
                  <span className="text-[16px] font-semibold text-foreground block mt-0.5">₹{payments[0].amount.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Status</span>
                  <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase ${
                    payments[0].status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}>
                    {payments[0].status}
                  </span>
                </div>
                <div>
                  <span className="text-[12px] text-muted-foreground font-bold block">Due Date</span>
                  <span className="text-[16px] font-semibold text-foreground block mt-0.5">{payments[0].dueDate}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-[14px]">No active billing cycles generated.</p>
            )}
          </div>
        )}

        {/* TAB 5: ELECTRICITY */}
        {activeTab === 'electricity' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Electricity Billing Logs</h3>
            {bills.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground font-medium">No electricity statements found.</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-left text-[14px] border-collapse bg-slate-50/20 dark:bg-slate-900/5">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                      <th className="p-4">Month</th>
                      <th className="p-4">Units Consumed</th>
                      <th className="p-4">Total Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground font-semibold">
                    {bills.map((bill, idx) => (
                      <tr key={idx} className="hover:bg-muted/40 transition-colors">
                        <td className="p-4">{bill.billingMonth}</td>
                        <td className="p-4">{bill.unitsConsumed} Units</td>
                        <td className="p-4">₹{bill.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="p-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase ${
                            bill.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          }`}>
                            {bill.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {bill.status === 'paid' ? (
                            <button 
                              onClick={() => exportElectricityBillPDF(bill, apartment?.name || 'Complex', user?.displayName || 'Owner')}
                              className="p-1.5 hover:bg-muted border border-border rounded-lg"
                            >
                              <Download size={14} />
                            </button>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: COMPLAINTS */}
        {activeTab === 'complaints' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Support & Maintenance Requests</h3>
            <div className="space-y-3">
              {complaints.map(c => (
                <div key={c.id} className="p-4 border border-border rounded-2xl flex items-center justify-between hover:shadow-sm transition-shadow">
                  <div>
                    <h4 className="font-semibold text-foreground text-[16px]">{c.title}</h4>
                    <p className="text-[14px] text-muted-foreground font-medium mt-0.5">Category: {c.category} • Priority: {c.priority}</p>
                    <p className="text-[12px] text-muted-foreground font-bold mt-1">Logged on: {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase ${
                    c.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-605 border-amber-500/20'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
              {complaints.length === 0 && (
                <p className="text-center py-6 text-muted-foreground font-medium">No complaints logged.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Document Directory</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {customerDocs.map((doc, idx) => (
                <div key={idx} className="border border-border p-4 rounded-2xl flex items-center justify-between hover:border-brand-500/20 transition-all bg-slate-50/20 dark:bg-slate-900/10">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-650 flex items-center justify-center border border-purple-500/15">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="text-[14px] font-semibold text-foreground">{doc.name}</h4>
                      <p className="text-[12px] text-muted-foreground font-medium mt-0.5">{doc.type} • {doc.fileSize || 'No file'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {doc.status === 'Verified' ? (
                      <>
                        <button 
                          onClick={() => setPreviewDocName(doc.name)}
                          className="p-1.5 hover:bg-muted border border-border rounded-lg"
                        >
                          <Eye size={14} />
                        </button>
                        {doc.name === 'Rental Lease Agreement' && (
                          <button 
                            onClick={handleDownloadAgreement}
                            className="p-1.5 hover:bg-muted border border-border rounded-lg"
                          >
                            <Download size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      <button 
                        onClick={() => handleUploadDocument(idx)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[12px] rounded-lg transition-colors flex items-center gap-1"
                      >
                        <FileUp size={12} />
                        <span>Upload</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Rent Payment Ledger</h3>
            <div className="overflow-x-auto rounded-3xl border border-border">
              <table className="w-full text-left text-[14px] border-collapse bg-slate-50/20 dark:bg-slate-900/5">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-bold text-[12px] tracking-wider">
                    <th className="p-4">Billing Month</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground font-semibold">
                  {payments.map((p, idx) => (
                    <tr key={idx} className="hover:bg-muted/40 transition-colors">
                      <td className="p-4">{p.billingMonth}</td>
                      <td className="p-4 text-muted-foreground font-medium">{p.dueDate}</td>
                      <td className="p-4">₹{p.amount.toLocaleString('en-IN')}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[12px] font-bold border uppercase ${
                          p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {p.status === 'paid' ? (
                          <button 
                            onClick={() => exportRentReceiptPDF(p, apartment?.name || 'Complex')}
                            className="p-1.5 hover:bg-muted border border-border rounded-lg"
                          >
                            <Download size={14} />
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <h3 className="text-[20px] font-bold text-foreground">Customer Timeline Activity</h3>
            
            <div className="relative border-l border-border pl-6 space-y-6 ml-3">
              {/* Event 1: Registration */}
              <div className="relative">
                <span className="absolute -left-[32px] top-1 w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500 text-white z-10">
                  <Check size={10} />
                </span>
                <div>
                  <h4 className="text-[14px] text-foreground font-semibold">Customer Registered</h4>
                  <span className="text-[12px] text-muted-foreground font-bold">20 May 2026</span>
                </div>
              </div>

              {/* Event 2: Room Assignment */}
              {room && (
                <div className="relative">
                  <span className="absolute -left-[32px] top-1 w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500 text-white z-10">
                    <Check size={10} />
                  </span>
                  <div>
                    <h4 className="text-[14px] text-foreground font-semibold">Room Assigned</h4>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Allocated to Room {room.roomNumber}</p>
                    <span className="text-[12px] text-muted-foreground font-bold">25 May 2026</span>
                  </div>
                </div>
              )}

              {/* Event 3: Agreement Signed */}
              {customer.leaseStatus === 'active' && (
                <div className="relative">
                  <span className="absolute -left-[32px] top-1 w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500 text-white z-10">
                    <Check size={10} />
                  </span>
                  <div>
                    <h4 className="text-[14px] text-foreground font-semibold">Lease Agreement Signed</h4>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Contract generated successfully</p>
                    <span className="text-[12px] text-muted-foreground font-bold">01 Jun 2026</span>
                  </div>
                </div>
              )}

              {/* Event 4: Rent Paid */}
              {payments.some(p=>p.status === 'paid') && (
                <div className="relative">
                  <span className="absolute -left-[32px] top-1 w-4 h-4 rounded-full flex items-center justify-center bg-emerald-500 text-white z-10">
                    <Check size={10} />
                  </span>
                  <div>
                    <h4 className="text-[14px] text-foreground font-semibold">Rent Paid Settled</h4>
                    <span className="text-[12px] text-muted-foreground font-bold">03 Jun 2026</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── DOCUMENT PREVIEW VAULT MODAL ────────────────────────────────── */}
      {previewDocName && room && (
        <DocumentViewer
          isOpen={!!previewDocName}
          onClose={() => setPreviewDocName(null)}
          docName={previewDocName}
          docType={previewDocName === 'Rental Lease Agreement' ? 'lease' : 'id_proof'}
          fileUrl={
            customerDocs.find(d => d.name === previewDocName)?.fileUrl || null
          }
          status="Verified"
          customer={customer}
          room={room}
          apartment={apartment}
          ownerName={user?.displayName || 'Owner'}
        />
      )}

    </div>
  );
};
