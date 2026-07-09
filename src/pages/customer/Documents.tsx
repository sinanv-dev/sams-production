import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToRooms, subscribeToApartments, subscribeToUsers,
  subscribeToPayments, subscribeToElectricityBills
} from '../../firebase/db';
import { Room, Apartment, UserProfile, Payment, ElectricityBill } from '../../types';
import {
  exportRentReceiptPDF, exportElectricityBillPDF, exportAgreementPDF
} from '../../utils/exportUtils';
import {
  FolderOpen, Download, Eye, FileText, CreditCard, Zap,
  Shield, Upload, CheckCircle, AlertCircle, X
} from 'lucide-react';

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-muted rounded-xl ${className}`} />
);

interface DocCardProps {
  icon: React.ReactNode;
  color: string;
  title: string;
  desc: string;
  status: 'available' | 'pending' | 'unavailable';
  onPreview?: () => void;
  onDownload?: () => void;
  downloading?: boolean;
}

const DocCard: React.FC<DocCardProps> = ({ icon, color, title, desc, status, onPreview, onDownload, downloading }) => (
  <div className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group flex flex-col gap-4">
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      {status === 'available' && (
        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
          <CheckCircle size={11} /> Ready
        </span>
      )}
      {status === 'pending' && (
        <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 dark:text-amber-400">
          <AlertCircle size={11} /> Pending
        </span>
      )}
    </div>
    {status === 'available' && (
      <div className="flex gap-2 pt-1">
        {onPreview && (
          <button
            onClick={onPreview}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border border-border hover:bg-muted transition-colors"
          >
            <Eye size={13} /> Preview
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white transition-colors disabled:opacity-60"
          >
            {downloading ? (
              <span className="animate-spin w-3 h-3 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <Download size={13} />
            )}
            Download
          </button>
        )}
      </div>
    )}
    {status === 'unavailable' && (
      <p className="text-xs text-muted-foreground/60 italic">Not yet available</p>
    )}
  </div>
);

export const CustomerDocuments: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignedRoom, setAssignedRoom] = useState<Room | null>(null);
  const [assignedApt, setAssignedApt] = useState<Apartment | null>(null);
  const [customerProfile, setCustomerProfile] = useState<UserProfile | null>(null);
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null);
  const [latestBill, setLatestBill] = useState<ElectricityBill | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let rooms: Room[] = [], apts: Apartment[] = [], users: UserProfile[] = [],
      payments: Payment[] = [], bills: ElectricityBill[] = [];
    let loaded = 0;

    const resolve = () => {
      if (++loaded < 5) return;
      const room = rooms.find(r => r.currentCustomerId === user.uid) || null;
      const apt = room ? apts.find(a => a.id === room.apartmentId) || null : null;
      setAssignedRoom(room);
      setAssignedApt(apt);
      setCustomerProfile(users.find(u => u.uid === user.uid) || null);
      const myPayments = payments.filter(p => p.customerId === user.uid && p.type === 'rent')
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
      setLatestPayment(myPayments[0] || null);
      const myBills = bills.filter(b => b.customerId === user.uid)
        .sort((a, b) => b.billingMonth.localeCompare(a.billingMonth));
      setLatestBill(myBills[0] || null);
      setLoading(false);
    };

    const u1 = subscribeToRooms(r => { rooms = r; resolve(); });
    const u2 = subscribeToApartments(a => { apts = a; resolve(); });
    const u3 = subscribeToUsers(u => { users = u; resolve(); });
    const u4 = subscribeToPayments(p => { payments = p; resolve(); });
    const u5 = subscribeToElectricityBills(b => { bills = b; resolve(); });
    return () => [u1, u2, u3, u4, u5].forEach(fn => fn());
  }, [user]);

  const handleDownload = async (type: string) => {
    setDownloading(type);
    try {
      if (type === 'agreement') await exportAgreementPDF(user, assignedRoom, assignedApt, assignedApt?.ownerName || 'Owner');
      if (type === 'rent' && latestPayment) await exportRentReceiptPDF(latestPayment, assignedApt?.name || 'SAMS Complex');
      if (type === 'electricity' && latestBill) await exportElectricityBillPDF(latestBill, assignedApt?.name || 'SAMS Complex', assignedApt?.ownerName || 'Owner');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const hasRoom = !!(assignedRoom && assignedApt);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">

      {/* Header */}
      <div>
        <h1 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
          <FolderOpen size={18} /> My Documents
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          All your important rental documents in one place.
        </p>
      </div>

      {/* Lease Documents */}
      <div>
        <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">Lease Documents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DocCard
            icon={<FileText size={18} />}
            color="bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20"
            title="Rental Agreement"
            desc="Your official lease contract with all terms and conditions."
            status={hasRoom ? 'available' : 'unavailable'}
            onPreview={() => setPreviewDoc('Rental Lease Agreement')}
            onDownload={() => handleDownload('agreement')}
            downloading={downloading === 'agreement'}
          />
          <DocCard
            icon={<Shield size={18} />}
            color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            title="ID Proof (Aadhaar)"
            desc="Government ID submitted during onboarding."
            status={hasRoom ? 'available' : 'unavailable'}
            onPreview={() => setPreviewDoc('Aadhaar Card')}
          />

        </div>
      </div>

      {/* Payment Receipts */}
      <div>
        <h2 className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-3">Payment Receipts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DocCard
            icon={<CreditCard size={18} />}
            color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            title="Rent Receipt"
            desc={latestPayment ? `Latest: ${latestPayment.billingMonth} — ₹${latestPayment.amount.toLocaleString('en-IN')}` : 'No rent records found.'}
            status={latestPayment?.status === 'paid' ? 'available' : latestPayment ? 'pending' : 'unavailable'}
            onDownload={() => handleDownload('rent')}
            downloading={downloading === 'rent'}
          />
          <DocCard
            icon={<Zap size={18} />}
            color="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            title="Electricity Bill"
            desc={latestBill ? `Latest: ${latestBill.billingMonth} — ₹${latestBill.totalAmount.toLocaleString('en-IN')}` : 'No electricity bills found.'}
            status={latestBill?.status === 'paid' ? 'available' : latestBill ? 'pending' : 'unavailable'}
            onDownload={() => handleDownload('electricity')}
            downloading={downloading === 'electricity'}
          />
        </div>
      </div>

      {/* Upload section */}
      <div className="bg-card border border-dashed border-border rounded-2xl p-6 text-center space-y-3">
        <div className="w-10 h-10 mx-auto bg-muted rounded-xl flex items-center justify-center">
          <Upload size={18} className="text-muted-foreground" />
        </div>
        <p className="text-sm font-bold text-foreground">Upload a Document</p>
        <p className="text-xs text-muted-foreground">Submit ID proof, verification docs, or other requested files.</p>
        <button
          disabled
          className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 bg-muted text-muted-foreground rounded-xl cursor-not-allowed opacity-60"
        >
          <Upload size={13} /> Upload Document — Coming Soon
        </button>
      </div>

      {/* Simple Doc Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-brand-500" />
                <h3 className="text-sm font-bold text-foreground">{previewDoc}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>
            <div className="bg-muted/50 rounded-2xl p-6 text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-brand-500/10 rounded-2xl flex items-center justify-center border border-brand-500/20">
                <FileText size={28} className="text-brand-500" />
              </div>
              <p className="text-sm font-bold text-foreground">{previewDoc}</p>
              <p className="text-xs text-muted-foreground">
                Document preview is available in the full document viewer.
                Use the Download button to get a PDF copy.
              </p>
            </div>
            <button
              onClick={() => setPreviewDoc(null)}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
