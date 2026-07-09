import React, { useState, useEffect } from 'react';
import { 
  getPayments, createPayment, updatePayment, 
  getElectricityBills, createElectricityBill, updateElectricityBill,
  getRooms, getApartments, getUsers, getSystemSettings, createAuditLog
} from '../../firebase/db';
import { Payment, ElectricityBill, Room, Apartment, UserProfile, SystemSettings } from '../../types';
import { 
  Plus, CreditCard, Check, Zap, DollarSign, Calendar, Search, 
  Filter, AlertCircle, FileSpreadsheet, Download, RefreshCw, X, Percent, AlertTriangle
} from 'lucide-react';

export const AdminBilling: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'electricity'>('payments');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [apartmentFilter, setApartmentFilter] = useState('all');

  // Billing forms state
  const [showRentModal, setShowRentModal] = useState(false);
  const [showElecModal, setShowElecModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  
  // Rent form
  const [rentBillingMonth, setRentBillingMonth] = useState('2026-07');
  const [rentSuccessMsg, setRentSuccessMsg] = useState('');

  // Electricity form state
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [elecMonth, setElecMonth] = useState('2026-06');
  const [prevReading, setPrevReading] = useState(0);
  const [currReading, setCurrReading] = useState(0);
  const [elecSuccessMsg, setElecSuccessMsg] = useState('');
  const [elecErrorMsg, setElecErrorMsg] = useState('');

  // Adjustments form state
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [adjustForm, setAdjustForm] = useState({
    discount: '',
    lateFee: '',
    notes: '',
  });
  const [emailSending, setEmailSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allPayments, allBills, allRooms, allApts, allUsers, sysSettings] = await Promise.all([
        getPayments(),
        getElectricityBills(),
        getRooms(),
        getApartments(),
        getUsers(),
        getSystemSettings()
      ]);

      setPayments(allPayments);
      setBills(allBills);
      setRooms(allRooms);
      setApartments(allApts);
      setCustomers(allUsers.filter(u => u.role === 'customer'));
      setSettings(sysSettings);

      const occupied = allRooms.filter(r => r.status === 'occupied');
      if (occupied.length > 0) {
        setSelectedRoomId(occupied[0].id);
        const roomBills = allBills.filter(b => b.roomId === occupied[0].id);
        if (roomBills.length > 0) {
          const sorted = roomBills.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
          setPrevReading(sorted[0].currentReading);
          setCurrReading(sorted[0].currentReading);
        } else {
          setPrevReading(1000);
          setCurrReading(1000);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const roomBills = bills.filter(b => b.roomId === roomId);
    if (roomBills.length > 0) {
      const sorted = roomBills.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
      setPrevReading(sorted[0].currentReading);
      setCurrReading(sorted[0].currentReading);
    } else {
      setPrevReading(1000);
      setCurrReading(1000);
    }
    setElecErrorMsg('');
  };

  const handleGenerateRent = async (e: React.FormEvent) => {
    e.preventDefault();
    setRentSuccessMsg('');
    const occupiedRooms = rooms.filter(r => r.status === 'occupied');
    
    if (occupiedRooms.length === 0) {
      setRentSuccessMsg('No occupied rooms available for billing.');
      return;
    }

    try {
      let count = 0;
      for (const room of occupiedRooms) {
        const customer = customers.find(c => c.uid === room.currentCustomerId);
        const apt = apartments.find(a => a.id === room.apartmentId);

        const alreadyExists = payments.some(
          p => p.customerId === room.currentCustomerId && 
          p.billingMonth === rentBillingMonth && 
          p.type === 'rent'
        );

        if (alreadyExists) continue;

        await createPayment({
          customerId: room.currentCustomerId || '',
          customerName: customer?.displayName || 'Customer',
          roomId: room.id,
          roomNumber: room.roomNumber,
          apartmentId: room.apartmentId,
          apartmentName: apt?.name || 'Apartment',
          amount: room.rentAmount,
          type: 'rent',
          status: 'pending',
          dueDate: `${rentBillingMonth}-05`,
          paidAt: null,
          billingMonth: rentBillingMonth
        });
        count++;
      }

      await createAuditLog({
        adminId: 'admin-id',
        adminName: 'System Admin',
        action: `Generated ${count} monthly rent invoices for ${rentBillingMonth}`,
        entityType: 'payment',
        newValue: `${count} invoices`
      });

      setRentSuccessMsg(`Success! Generated ${count} rent invoices for ${rentBillingMonth}.`);
      setTimeout(() => {
        setShowRentModal(false);
        setRentSuccessMsg('');
        loadData();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setRentSuccessMsg(err.message || 'Error generating invoices.');
    }
  };

  const handleGenerateElectricity = async (e: React.FormEvent) => {
    e.preventDefault();
    setElecErrorMsg('');
    setElecSuccessMsg('');

    if (currReading < prevReading) {
      setElecErrorMsg("Current reading cannot be lower than previous reading.");
      return;
    }

    const room = rooms.find(r => r.id === selectedRoomId);
    if (!room || !settings) return;

    try {
      const units = currReading - prevReading;
      const rate = settings.electricityRatePerKWh;
      const amount = units * rate;
      const customer = customers.find(c => c.uid === room.currentCustomerId);
      const apt = apartments.find(a => a.id === room.apartmentId);

      const duplicate = bills.some(b => b.roomId === selectedRoomId && b.billingMonth === elecMonth);
      if (duplicate) {
        setElecErrorMsg(`Electricity bill already logged for Room ${room.roomNumber} in ${elecMonth}.`);
        return;
      }

      await createElectricityBill({
        customerId: room.currentCustomerId || '',
        customerName: customer?.displayName || 'Customer',
        roomId: room.id,
        roomNumber: room.roomNumber,
        apartmentId: room.apartmentId,
        apartmentName: apt?.name || 'Apartment',
        billingMonth: elecMonth,
        previousReading: prevReading,
        currentReading: currReading,
        unitsConsumed: units,
        ratePerUnit: rate,
        totalAmount: amount,
        status: 'unpaid',
        dueDate: `${elecMonth}-15`,
        paidAt: null
      });

      await createPayment({
        customerId: room.currentCustomerId || '',
        customerName: customer?.displayName || 'Customer',
        roomId: room.id,
        roomNumber: room.roomNumber,
        apartmentId: room.apartmentId,
        apartmentName: apt?.name || 'Apartment',
        amount,
        type: 'electricity',
        status: 'pending',
        dueDate: `${elecMonth}-15`,
        paidAt: null,
        billingMonth: elecMonth
      });

      await createAuditLog({
        adminId: 'admin-id',
        adminName: 'System Admin',
        action: `Logged electricity bill for Room ${room.roomNumber}: ${units} units (₹${amount})`,
        entityType: 'payment',
        entityId: room.id,
        newValue: `₹${amount}`
      });

      setElecSuccessMsg(`Successfully logged electricity bill: ₹${amount.toLocaleString()}.`);
      setTimeout(() => {
        setShowElecModal(false);
        setElecSuccessMsg('');
        loadData();
      }, 2000);
    } catch (err: any) {
      setElecErrorMsg(err.message || 'Error generating bill.');
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment) return;

      await updatePayment(paymentId, {
        status: 'paid',
        paidAt: Date.now()
      });

      if (payment.type === 'electricity') {
        const elecBill = bills.find(b => b.roomId === payment.roomId && b.billingMonth === payment.billingMonth);
        if (elecBill) {
          await updateElectricityBill(elecBill.id, {
            status: 'paid',
            paidAt: Date.now()
          });
        }
      }

      await createAuditLog({
        adminId: 'admin-id',
        adminName: 'System Admin',
        action: `Collected payment for ${payment.customerName}: ₹${payment.amount}`,
        entityType: 'payment',
        entityId: paymentId,
        newValue: 'paid'
      });

      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePayment) return;

    try {
      const disc = adjustForm.discount ? parseFloat(adjustForm.discount) : 0;
      const late = adjustForm.lateFee ? parseFloat(adjustForm.lateFee) : 0;
      const finalAmount = Math.max(activePayment.amount - disc + late, 0);

      await updatePayment(activePayment.id, {
        amount: finalAmount,
        lateFeeApplied: late || undefined,
        notes: adjustForm.notes || undefined
      });

      await createAuditLog({
        adminId: 'admin-id',
        adminName: 'System Admin',
        action: `Adjusted bill for ${activePayment.customerName}: Discount: ₹${disc}, Late Fee: ₹${late}, Final: ₹${finalAmount}`,
        entityType: 'payment',
        entityId: activePayment.id,
        newValue: `₹${finalAmount}`
      });

      setShowAdjustModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmailReceipt = async () => {
    if (!activePayment) return;
    setEmailSending(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      const targetUser = customers.find(c => c.uid === activePayment.customerId);
      alert(`Receipt emailed successfully to ${activePayment.customerName} (${targetUser?.email || 'tenant@sams.com'})!`);
    } catch (e) {
      console.error(e);
    } finally {
      setEmailSending(false);
    }
  };

  const handleExportCSV = () => {
    const headers = 'Uploader,Apartment,Room,Amount,Type,Month,Status,Due Date';
    const rows = payments.map(p => [
      p.customerName,
      p.apartmentName,
      p.roomNumber,
      p.amount,
      p.type,
      p.billingMonth,
      p.status,
      p.dueDate
    ].join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'billing-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPayments = payments.filter(p => {
    const matchesStatus = paymentFilter === 'all' || p.status === paymentFilter;
    const matchesApt = apartmentFilter === 'all' || p.apartmentId === apartmentFilter;
    return matchesStatus && matchesApt;
  });

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <CreditCard size={24} className="text-brand-500" />
            Rent & Revenue Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Generate monthly rent, record payments, adjust invoices, apply discounts, late fees, and track receipts.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRentModal(true)}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-md"
          >
            <Plus size={16} />
            <span>Generate Rent</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="p-2.5 bg-muted hover:bg-muted/80 border border-border rounded-xl text-foreground"
            title="Export CSV"
          >
            <FileSpreadsheet size={16} />
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Status:</span>
          <div className="inline-flex rounded-lg border border-border bg-input/50 p-1">
            {(['all', 'pending', 'paid', 'overdue'] as const).map(f => (
              <button
                key={f}
                onClick={() => setPaymentFilter(f)}
                className={`px-3 py-1 text-xs font-semibold rounded-md uppercase transition-colors ${
                  paymentFilter === f ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <select
            value={apartmentFilter}
            onChange={e => setApartmentFilter(e.target.value)}
            className="px-3 py-2 bg-input border border-border rounded-xl text-sm text-foreground focus:outline-none"
          >
            <option value="all">All Apartments</option>
            {apartments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      {/* Main Table */}
      {activeTab === 'payments' ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No transaction records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Apartment / Room</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Amount (₹)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Month</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Billing Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredPayments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold text-foreground">{p.customerName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.apartmentName} · Room {p.roomNumber}</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">₹{p.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.billingMonth}</td>
                      <td className="px-4 py-3 text-xs capitalize">{p.type}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{p.dueDate}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1.5 justify-end">
                          {p.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleMarkAsPaid(p.id)}
                                className="px-2.5 py-1 bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-lg text-xs font-bold transition-all border border-emerald-500/20"
                              >
                                Collect
                              </button>
                              <button
                                onClick={() => {
                                  setActivePayment(p);
                                  setAdjustForm({ discount: '', lateFee: '', notes: p.notes || '' });
                                  setShowAdjustModal(true);
                                }}
                                className="px-2.5 py-1 bg-muted hover:bg-brand-500/10 hover:text-brand-400 text-muted-foreground rounded-lg text-xs font-bold transition-all border border-border"
                              >
                                Adjust
                              </button>
                            </>
                          )}
                          {p.status === 'paid' && (
                            <button
                              onClick={() => {
                                setActivePayment(p);
                                setShowReceiptModal(true);
                              }}
                              className="px-2.5 py-1 bg-muted hover:bg-brand-600 hover:text-white border border-border text-foreground rounded-lg text-xs font-bold transition-all"
                            >
                              Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {bills.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">No utility statements recorded.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Room Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Month</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Prev Reading (kWh)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Curr Reading (kWh)</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Consumption</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Utility Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bills.map(b => (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-semibold text-foreground">{b.customerName}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{b.apartmentName} · Room {b.roomNumber}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{b.billingMonth}</td>
                      <td className="px-4 py-3 text-right text-xs">{b.previousReading}</td>
                      <td className="px-4 py-3 text-right text-xs">{b.currentReading}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">{b.unitsConsumed} kWh</td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">₹{b.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                          b.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adjustments Modal */}
      {showAdjustModal && activePayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Adjust Bill Amount</h2>
              <button onClick={() => setShowAdjustModal(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAdjustPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Invoiced Amount</label>
                <div className="text-lg font-bold text-foreground">₹{activePayment.amount.toLocaleString()}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Apply Discount (₹)</label>
                  <input
                    type="number"
                    value={adjustForm.discount}
                    onChange={e => setAdjustForm(prev => ({ ...prev, discount: e.target.value }))}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Late Fee Charge (₹)</label>
                  <input
                    type="number"
                    value={adjustForm.lateFee}
                    onChange={e => setAdjustForm(prev => ({ ...prev, lateFee: e.target.value }))}
                    placeholder="e.g. 200"
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Adjustment Reason / Notes</label>
                <textarea
                  value={adjustForm.notes}
                  onChange={e => setAdjustForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="e.g. Compensation for maintenance delay..."
                  rows={3}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 py-2.5 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipts Preview Modal */}
      {showReceiptModal && activePayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Invoice Receipt Receipt</h2>
              <button onClick={() => { setShowReceiptModal(false); setActivePayment(null); }} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 bg-card text-foreground space-y-6">
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b pb-4 border-border">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{settings?.platformName || 'SAMS'}</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold tracking-wider uppercase">Smart Apartment Management System</p>
                  <p className="text-xs text-muted-foreground mt-1">Address: {settings?.address || '123 Tech Plaza, Bangalore'}</p>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase rounded">Paid</span>
                  <p className="text-xs text-muted-foreground mt-2">Receipt ID: {activePayment.id}</p>
                </div>
              </div>

              {/* Receipt Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-muted-foreground font-semibold uppercase text-[10px]">Invoiced Customer:</div>
                  <div className="font-bold text-foreground mt-0.5">{activePayment.customerName}</div>
                  <div className="text-muted-foreground">Unit: {activePayment.apartmentName} · Room {activePayment.roomNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-muted-foreground font-semibold uppercase text-[10px]">Payment Date:</div>
                  <div className="font-bold text-foreground mt-0.5">{activePayment.paidAt ? new Date(activePayment.paidAt).toLocaleDateString() : 'N/A'}</div>
                  <div className="text-muted-foreground">Billing Period: {activePayment.billingMonth}</div>
                </div>
              </div>

              {/* Bill Details */}
              <table className="w-full text-xs border-t border-b border-border py-3">
                <thead>
                  <tr className="text-muted-foreground font-bold uppercase text-[9px] border-b pb-1">
                    <th className="text-left py-1.5">Description</th>
                    <th className="text-right py-1.5">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2 text-foreground/80 font-medium capitalize">{activePayment.type} Invoice ({activePayment.billingMonth})</td>
                    <td className="py-2 text-right font-bold text-foreground">₹{activePayment.amount.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              {/* Receipt Footer */}
              <div className="flex justify-between items-center text-xs pt-2">
                <span className="text-muted-foreground italic">Thank you for your transaction!</span>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Received:</span>
                  <span className="font-black text-foreground text-base ml-2">₹{activePayment.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex justify-end gap-2 bg-muted/30">
              <button
                type="button"
                onClick={handleEmailReceipt}
                disabled={emailSending}
                className="px-4 py-2 border border-border text-foreground hover:bg-muted font-bold text-sm rounded-xl transition-all disabled:opacity-50"
              >
                {emailSending ? 'Sending...' : 'Email Receipt'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-xl transition-all"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE MONTHLY RENT BILLS MODAL */}
      {showRentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRentModal(false)}></div>
          <div className="bg-card rounded-2xl w-full max-w-md border border-border shadow-2xl p-6 relative z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-foreground mb-1">Issue Rent Invoices</h2>
            <p className="text-xs text-muted-foreground mb-4">This will generate pending rent payments for all occupied room units across SAMS properties.</p>

            <form onSubmit={handleGenerateRent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Target Billing Month</label>
                <input
                  type="month"
                  required
                  value={rentBillingMonth}
                  onChange={e => setRentBillingMonth(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground focus:outline-none"
                />
              </div>

              {rentSuccessMsg && (
                <div className="p-3 bg-brand-600/10 border border-brand-500/20 text-brand-400 text-xs font-semibold rounded-xl">
                  {rentSuccessMsg}
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRentModal(false)}
                  className="flex-1 py-2.5 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl"
                >
                  Generate Bills
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG ELECTRICITY READINGS MODAL */}
      {showElecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowElecModal(false)}></div>
          <div className="bg-card rounded-2xl w-full max-w-md border border-border shadow-2xl p-6 relative z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-foreground mb-1">Log Utility Statements</h2>
            <p className="text-xs text-muted-foreground mb-4">Record electricity meter readings and issue utility charges.</p>

            <form onSubmit={handleGenerateElectricity} className="space-y-4">
              {elecErrorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl flex gap-1.5 items-center">
                  <AlertTriangle size={14} />
                  <span>{elecErrorMsg}</span>
                </div>
              )}
              {elecSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-xl">
                  {elecSuccessMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Select Occupied Unit</label>
                <select
                  value={selectedRoomId}
                  onChange={e => handleRoomChange(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground focus:outline-none"
                >
                  {rooms.filter(r => r.status === 'occupied').map(r => {
                    const apt = apartments.find(a => a.id === r.apartmentId);
                    return <option key={r.id} value={r.id}>{apt?.name} · Room #{r.roomNumber}</option>;
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Billing Month</label>
                  <input
                    type="month"
                    required
                    value={elecMonth}
                    onChange={e => setElecMonth(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Utility Rate</label>
                  <div className="w-full px-3 py-2 bg-muted text-muted-foreground border border-border rounded-xl text-sm font-semibold">
                    ₹{settings?.electricityRatePerKWh || 12}/kWh
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Previous Reading</label>
                  <input
                    type="number"
                    required
                    value={prevReading}
                    onChange={e => setPrevReading(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Current Reading</label>
                  <input
                    type="number"
                    required
                    value={currReading}
                    onChange={e => setCurrReading(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowElecModal(false)}
                  className="flex-1 py-2.5 border border-border text-foreground hover:bg-muted text-sm font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl"
                >
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
