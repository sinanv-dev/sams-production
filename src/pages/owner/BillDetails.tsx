import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getElectricityBills, getApartments, getUsers } from '../../firebase/db';
import { ElectricityBill, Apartment, UserProfile } from '../../types';
import { ArrowLeft, ChevronRight, Zap, CheckCircle2, Clock, User, Building2, Download, Loader2 } from 'lucide-react';
import { exportElectricityBillPDF } from '../../utils/exportUtils';

export const BillDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [bill, setBill] = useState<ElectricityBill | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const [allBills, allApts, allUsers] = await Promise.all([
        getElectricityBills(),
        getApartments(),
        getUsers()
      ]);

      const b = allBills.find(x => x.id === id);
      if (!b) {
        navigate('/owner/electricity');
        return;
      }

      setBill(b);
      setApartment(allApts.find(a => a.id === b.apartmentId) || null);
      setCustomer(allUsers.find(u => u.uid === b.customerId) || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBill = () => {
    if (!bill) return;
    setDownloading(true);
    setTimeout(() => {
      exportElectricityBillPDF(bill, apartment?.name || 'SAMS Apartment', user?.displayName || 'Owner');
      setDownloading(false);
    }, 600);
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!bill) return null;

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
          <Link to="/owner/electricity" className="hover:underline">Electricity Bills</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-bold">Bill Details</span>
        </div>
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Electricity Bill Details
          </h1>
          <p className="text-muted-foreground text-sm font-medium mt-0.5">
            Detailed breakdown of unit consumption rates, payment tracking, and meter logs.
          </p>
        </div>
        <button
          onClick={handleDownloadBill}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-sm rounded-xl transition-all disabled:opacity-50 cursor-pointer"
        >
          {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          {downloading ? 'Generating PDF...' : 'Download Bill (PDF)'}
        </button>
      </div>

      {/* ── BILL DETAILS CARD ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Detailed Calculations card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Billing Cycle</span>
                <p className="text-base font-bold text-foreground">{bill.billingMonth}</p>
              </div>

              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                bill.status === 'paid'
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-250'
              }`}>
                {bill.status === 'paid' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {bill.status}
              </span>
            </div>

            {/* Calculations Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm font-medium">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Previous Reading</p>
                <p className="text-foreground text-lg font-black mt-0.5">{bill.previousReading} kWh</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Reading</p>
                <p className="text-foreground text-lg font-black mt-0.5">{bill.currentReading} kWh</p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Units Consumed</p>
                <p className="text-blue-600 dark:text-blue-400 text-lg font-black mt-0.5">{bill.unitsConsumed} kWh</p>
              </div>
            </div>

            <div className="border-t border-border pt-4 grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm font-medium">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rate per Unit</p>
                <p className="text-slate-850 dark:text-slate-100 text-lg font-black mt-0.5">₹{bill.ratePerUnit}/Unit</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Due Date</p>
                <p className="text-slate-850 dark:text-slate-100 text-lg font-black mt-0.5">{new Date(bill.dueDate).toLocaleDateString()}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 bg-input/40 border border-border p-3 rounded-xl">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Bill Amount</p>
                <p className="text-slate-900 dark:text-white text-xl font-black mt-0.5">₹{bill.totalAmount.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {bill.paidAt && (
              <div className="border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
                <p className="flex justify-between">
                  <span>Paid On:</span>
                  <span className="text-emerald-600 dark:text-emerald-450 font-bold">{new Date(bill.paidAt).toLocaleString('en-IN')}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer and Property Reference sidebar panels */}
        <div className="space-y-6">
          {/* Customer Details */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User size={15} /> Customer Information
            </h4>
            {customer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 flex items-center justify-center text-sm font-black">
                    {customer.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <Link 
                      to={`/owner/customers/${customer.uid}`}
                      className="font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {customer.displayName}
                    </Link>
                    <p className="text-[9px] text-slate-400 font-semibold">{customer.email}</p>
                  </div>
                </div>
                <div className="border-t border-border pt-3 text-xs font-semibold text-slate-650 dark:text-slate-400 space-y-1.5">
                  <p className="flex justify-between"><span>Phone:</span> <span className="font-bold text-foreground">{customer.phoneNumber || '—'}</span></p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">No customer linked to this bill.</p>
            )}
          </div>

          {/* Apartment Details */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={15} /> Property Reference
            </h4>
            {apartment ? (
              <div className="space-y-3">
                <div>
                  <Link 
                    to={`/owner/apartments/${apartment.id}`}
                    className="font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {apartment.name}
                  </Link>
                  <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5 truncate">{apartment.address}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-bold text-foreground">Room Number: {bill.roomNumber}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-semibold">No apartment linked to this bill.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
