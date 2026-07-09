import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRooms, getApartments, getUsers, getPayments, getComplaints, getElectricityBills } from '../../firebase/db';
import { Room, Apartment, UserProfile, Payment, Complaint, ElectricityBill } from '../../types';
import { 
  ArrowLeft, ChevronRight, Building2, User, CreditCard, Zap, 
  AlertCircle, FileText, CheckCircle, HelpCircle, Eye, Download, Info
} from 'lucide-react';
import { exportAgreementPDF } from '../../utils/exportUtils';
import { DocumentViewer } from '../../components/common/DocumentViewer';

export const RoomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // room ID (apartmentId_roomNumber)
  const navigate = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState<Room | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [customer, setCustomer] = useState<UserProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id, user]);

  const loadData = async () => {
    if (!user || !id) return;
    setLoading(true);
    try {
      const [allRooms, allApts, allUsers, allPayments, allBills, allComplaints] = await Promise.all([
        getRooms(),
        getApartments(),
        getUsers(),
        getPayments(),
        getElectricityBills(),
        getComplaints()
      ]);

      const rm = allRooms.find(r => r.id === id);
      if (!rm) {
        navigate('/owner/apartments');
        return;
      }

      setRoom(rm);
      const apt = allApts.find(a => a.id === rm.apartmentId);
      setApartment(apt || null);

      if (rm.currentCustomerId) {
        setCustomer(allUsers.find(u => u.uid === rm.currentCustomerId) || null);
      }

      // Load related data
      setPayments(allPayments.filter(p => p.roomId === id && p.type === 'rent').sort((a,b) => b.dueDate.localeCompare(a.dueDate)));
      setBills(allBills.filter(b => b.roomId === id).sort((a,b) => b.billingMonth.localeCompare(a.billingMonth)));
      setComplaints(allComplaints.filter(c => c.roomId === id).sort((a,b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [showAgreementPreview, setShowAgreementPreview] = useState(false);

  const handleGenerateBill = () => {
    alert(`Electricity bill generation sequence initiated for Room ${room?.roomNumber || '—'}. Redirecting to Bills management...`);
    navigate('/owner/electricity');
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!room || !apartment) return null;

  // Derive static floor and block details
  const roomNumInt = parseInt(room.roomNumber) || 101;
  const floorText = roomNumInt >= 300 ? '3rd Floor' : roomNumInt >= 200 ? '2nd Floor' : '1st Floor';
  const blockText = roomNumInt % 2 === 0 ? 'Block B' : 'Block A';
  const roomType = room.rentAmount >= 1800 ? 'Premium Executive Suite' : 'Standard Customerial Studio';

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
          <Link to="/owner/apartments" className="hover:underline">My Apartments</Link>
          <ChevronRight size={12} />
          <Link to={`/owner/apartments/${apartment.id}`} className="hover:underline">{apartment.name}</Link>
          <ChevronRight size={12} />
          <span className="text-foreground font-bold">Room {room.roomNumber}</span>
        </div>
      </div>

      {/* ── ROOM DETAILS HEADER PANEL ────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-450 flex items-center justify-center text-2xl font-black shadow-inner border border-blue-100 dark:border-blue-800/40">
            {room.roomNumber}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-foreground tracking-tight">Room {room.roomNumber} · Details</h2>
              <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                room.status === 'occupied' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                room.status === 'vacant' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {room.status}
              </span>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {apartment.name} · {blockText}, {floorText} · {roomType}
            </p>
          </div>
        </div>

        {/* Quick Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {customer && (
            <Link 
              to={`/owner/customers/${customer.uid}`}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl transition-all"
            >
              <User size={14} /> View Customer Profile
            </Link>
          )}
          {customer && (
            <button 
              onClick={() => setShowAgreementPreview(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl transition-all"
            >
              <FileText size={14} /> View Lease Agreement
            </button>
          )}
          <button
            onClick={handleGenerateBill}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-sm transition-all"
          >
            <Zap size={14} /> Generate Electricity Bill
          </button>
        </div>
      </div>

      {/* ── DETAILS MAIN CONTENT GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Properties and Customers */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Room Parameters Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 border-b border-border pb-1.5 flex items-center gap-1.5"><Info size={14}/> Room Metadata</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-semibold">
              <div>
                <p className="text-muted-foreground mb-0.5">Apartment Complex</p>
                <Link to={`/owner/apartments/${apartment.id}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">{apartment.name}</Link>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Location</p>
                <p className="text-foreground">{floorText}, {blockText}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Monthly Rental</p>
                <p className="font-bold text-emerald-650 dark:text-emerald-400">₹{room.rentAmount.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Current Occupant</p>
                {customer ? (
                  <Link to={`/owner/customers/${customer.uid}`} className="font-bold text-blue-600 dark:text-blue-400 hover:underline">{customer.displayName}</Link>
                ) : (
                  <p className="text-slate-500">Vacant / Unoccupied</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Occupancy Status</p>
                <span className="capitalize text-slate-850 dark:text-slate-200">{room.status}</span>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Electricity Meter ID</p>
                <p className="text-foreground">MTR-{apartment.id.toUpperCase()}-{room.roomNumber}</p>
              </div>
            </div>
          </div>

          {/* Payments Ledgers */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 border-b border-border pb-1.5 flex items-center gap-1.5"><CreditCard size={14}/> Room Payments Ledgers</h3>
            
            {payments.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400 font-semibold">No payments entries found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="pb-2">Month</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Due Date</th>
                      <th className="pb-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs font-semibold text-foreground">
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="py-2.5">{p.billingMonth}</td>
                        <td className="py-2.5 font-bold">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="py-2.5">{new Date(p.dueDate).toLocaleDateString()}</td>
                        <td className="py-2.5 text-right">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${
                            p.status === 'paid' ? 'bg-emerald-50 text-emerald-650' : 'bg-red-50 text-red-650'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Electricity and complaints */}
        <div className="space-y-6">
          
          {/* Electricity Meter Block */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500 border-b border-border pb-1.5 flex items-center gap-1.5"><Zap size={14}/> Electricity Meter</h3>
            
            {bills.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-semibold">No meter reading history found.</p>
                <button
                  onClick={handleGenerateBill}
                  className="w-full text-center py-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100/55 transition-all"
                >
                  Generate Initial Reading
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 border border-secondary rounded-lg bg-muted/20">
                    <p className="text-[9px] text-slate-400 font-bold mb-0.5">PREVIOUS METER READING</p>
                    <p className="text-sm font-black text-foreground">{bills[0].previousReading} Units</p>
                  </div>
                  <div className="p-2 border border-secondary rounded-lg bg-muted/20">
                    <p className="text-[9px] text-slate-400 font-bold mb-0.5">CURRENT METER READING</p>
                    <p className="text-sm font-black text-foreground">{bills[0].currentReading} Units</p>
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-secondary pt-3">
                  <span className="text-slate-400">Monthly Consumption:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{bills[0].unitsConsumed} Units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Dues (at ₹12/Unit):</span>
                  <span className="font-bold text-foreground">₹{bills[0].totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Room Complaints ticket logs */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-455 dark:text-slate-500 border-b border-border pb-1.5 flex items-center gap-1.5"><AlertCircle size={14}/> Support Tickets</h3>
            
            {complaints.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400 font-semibold">No complaints active for this unit.</p>
            ) : (
              <div className="space-y-3">
                {complaints.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => navigate(`/owner/complaints/${c.id}`)}
                    className="p-3 border border-border rounded-xl hover:border-orange-400 cursor-pointer transition-all duration-150 bg-slate-50/30 dark:bg-slate-900/10"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-bold text-slate-500">{c.category.toUpperCase()}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                        c.status === 'open' ? 'bg-red-50 text-red-650' : 'bg-emerald-50 text-emerald-650'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground truncate">{c.title}</h4>
                    <p className="text-[9px] text-slate-400 font-semibold mt-1">Logged on: {new Date(c.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── LEASE AGREEMENT PREVIEW POPUP ────────────────────────── */}
      {showAgreementPreview && room && apartment && (
        <DocumentViewer
          isOpen={showAgreementPreview}
          onClose={() => setShowAgreementPreview(false)}
          docName="Rental Lease Agreement"
          docType="lease"
          fileUrl={null}
          status="Verified"
          customer={customer || { displayName: 'N/A' }}
          room={room}
          apartment={apartment}
          ownerName={user?.displayName || 'John Owner'}
        />
      )}
    </div>
  );
};
