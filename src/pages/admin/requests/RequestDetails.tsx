import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getRequests, updateRequest, getRooms, updateRoom, 
  createNotification, getApartments, getUsers, rescheduleVisitRequest
} from '../../../firebase/db';
import { ApartmentRequest, Room, Apartment, UserProfile } from '../../../types';
import { Calendar, User, FileText, Check, X, AlertCircle, ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState<ApartmentRequest | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [owners, setOwners] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval Modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [modalError, setModalError] = useState('');

  // Reschedule Modal state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [assignedOwnerId, setAssignedOwnerId] = useState('');
  const [visitNotes, setVisitNotes] = useState('');

  useEffect(() => {
    loadDetails();
  }, [id]);

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [allReqs, allRooms, allApts, allUsers] = await Promise.all([
        getRequests(),
        getRooms(),
        getApartments(),
        getUsers()
      ]);

      const req = allReqs.find(r => r.id === id);
      if (!req) {
        navigate('/admin/requests');
        return;
      }

      setRequest(req);
      setRooms(allRooms);
      setApartments(allApts);
      setOwners(allUsers.filter(u => u.role === 'owner'));

      const vacant = allRooms.filter(r => r.apartmentId === req.apartmentId && r.status === 'vacant');
      setAvailableRooms(vacant);
      if (vacant.length > 0) {
        setSelectedRoomId(vacant[0].id);
      }
      setRescheduleDate(req.scheduledDate || req.preferredVisitDate);
      setAssignedOwnerId(req.assignedOwnerId || '');
      setVisitNotes(req.visitNotes || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (availableRooms.length === 0) {
      setModalError('No vacant rooms available in this complex.');
    } else {
      setModalError('');
    }
    setShowApproveModal(true);
  };

  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !selectedRoomId) return;

    try {
      const targetRoom = rooms.find(r => r.id === selectedRoomId);
      if (!targetRoom) throw new Error("Selected room not found.");

      await updateRequest(request.id, {
        status: 'approved',
        approvedAt: Date.now(),
        assignedRoomId: selectedRoomId
      });

      await updateRoom(selectedRoomId, {
        status: 'occupied',
        currentCustomerId: request.customerId
      });

      const apt = apartments.find(a => a.id === request.apartmentId);
      const aptName = apt ? apt.name : 'the requested building';
      
      await createNotification({
        recipientId: request.customerId,
        title: 'Apartment Request Approved',
        message: `Your visit/lease request for ${aptName} has been approved. Room ${targetRoom.roomNumber} has been assigned to you.`,
        type: 'request'
      });

      setShowApproveModal(false);
      navigate('/admin/requests');
    } catch (err: any) {
      setModalError(err.message || 'Failed to approve request.');
    }
  };

  const handleReject = async () => {
    if (!request) return;
    if (!confirm('Decline this request?')) return;

    try {
      await updateRequest(request.id, { status: 'rejected', rejectedAt: Date.now() });

      const apt = apartments.find(a => a.id === request.apartmentId);
      const aptName = apt ? apt.name : 'requested apartment';

      await createNotification({
        recipientId: request.customerId,
        title: 'Apartment Request Declined',
        message: `We regret to inform you that your request for ${aptName} was declined.`,
        type: 'request'
      });

      navigate('/admin/requests');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async () => {
    if (!request) return;
    if (!confirm('Cancel this request?')) return;
    try {
      await updateRequest(request.id, { status: 'cancelled', cancelledAt: Date.now() });
      navigate('/admin/requests');
    } catch (err) { console.error(err); }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    try {
      await rescheduleVisitRequest(
        request.id,
        rescheduleDate,
        assignedOwnerId,
        visitNotes,
        user?.uid || '',
        user?.displayName || 'Admin'
      );
      setShowRescheduleModal(false);
      await loadDetails();
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule request');
    }
  };

  if (loading || !request) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const statusBadges: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-400 border border-red-500/20',
    scheduled: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    cancelled: 'bg-muted text-muted-foreground border border-border',
  };

  const assignedOwner = owners.find(o => o.uid === request.assignedOwnerId);

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-6">
      <Link to="/admin/requests" className="flex items-center space-x-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} />
        <span>Back to Leasing Requests</span>
      </Link>

      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div>
            <h2 className="text-lg font-black text-foreground leading-tight">Request Details</h2>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">Reference ID: {request.id}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusBadges[request.status]}`}>
            {request.status}
          </span>
        </div>

        {/* Customer Contact details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold block uppercase tracking-wider">Customer Name</span>
            <span className="text-sm font-bold text-foreground block">{request.customerName}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold block uppercase tracking-wider">Contact Info</span>
            <span className="text-xs text-foreground block">{request.customerEmail}</span>
            <span className="text-xs text-foreground block">{request.customerPhone || 'No phone'}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold block uppercase tracking-wider">Target Building Complex</span>
            <span className="text-sm font-bold text-brand-400 block">{request.apartmentName}</span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-bold block uppercase tracking-wider">Visit Schedule Slot</span>
            <span className="text-xs text-foreground font-bold block mt-0.5 flex items-center">
              <Calendar size={14} className="mr-1.5 text-muted-foreground" />
              {request.status === 'scheduled' && request.scheduledDate ? (
                <span className="text-indigo-400">Scheduled: {request.scheduledDate}</span>
              ) : (
                <span>Preferred: {request.preferredVisitDate}</span>
              )}
            </span>
          </div>
        </div>

        {/* Assigned Staff */}
        {request.status === 'scheduled' && assignedOwner && (
          <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold block">Assigned Staff / Owner:</span>
              <span className="font-bold text-foreground">{assignedOwner.displayName}</span>
              <span className="text-muted-foreground ml-1">({assignedOwner.email})</span>
            </div>
            <button
              onClick={() => setShowRescheduleModal(true)}
              className="text-xs font-bold text-brand-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw size={12} />
              Reassign
            </button>
          </div>
        )}

        {/* Visit Notes */}
        {request.visitNotes && (
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-bold block uppercase tracking-wider">Internal Scheduling Notes</span>
            <p className="text-xs text-foreground bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-xl">
              {request.visitNotes}
            </p>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-2 pt-4 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground font-bold block uppercase tracking-wider">Customer Introduction & Notes</span>
          <p className="text-xs text-foreground leading-relaxed font-medium bg-muted/50 p-4 rounded-2xl border border-border/50">
            {request.notes || "No notes logged by applicant."}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          {request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'cancelled' && (
            <button
              onClick={handleCancel}
              className="text-xs text-red-400 hover:text-red-300 font-semibold"
            >
              Cancel Request
            </button>
          )}
          <div className="flex items-center space-x-3 ml-auto">
            {request.status === 'pending' && (
              <>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/20 rounded-xl text-sm font-semibold transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => setShowRescheduleModal(true)}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
                >
                  Approve & Schedule Visit
                </button>
              </>
            )}

            {request.status === 'scheduled' && (
              <>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 border border-red-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-950/20 rounded-xl text-sm font-semibold transition-colors"
                >
                  Decline
                </button>
                <button
                  onClick={() => setShowRescheduleModal(true)}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-xl text-sm font-semibold transition-colors"
                >
                  Reschedule Visit
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
                >
                  Assign Room & Start Lease
                </button>
              </>
            )}
          </div>
        </div>

        {request.status === 'approved' && (
          <div className="pt-4 border-t border-border/50 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            <Check size={16} className="mr-1.5" />
            <span>Lease Started. Assigned Room Unit: Room {request.assignedRoomId?.split('_')[1] || request.assignedRoomId}</span>
          </div>
        )}
      </div>

      {/* ROOM PLACEMENT SELECTOR MODAL */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowApproveModal(false)}></div>
          <div className="bg-card rounded-2xl w-full max-w-sm border border-border shadow-2xl p-6 relative z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-base font-bold text-foreground mb-1">Approve Request</h2>
            <p className="text-xs text-muted-foreground mb-4">Select a vacant room inside {request.apartmentName} to place this customer.</p>

            <form onSubmit={handleConfirmApproval} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Select Vacant Room</label>
                {availableRooms.length === 0 ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-400 flex items-start space-x-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>No vacant rooms are available in this complex. Add rooms or vacate units to proceed.</span>
                  </div>
                ) : (
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full bg-input border border-border rounded-xl py-2 px-3.5 text-sm font-semibold focus:outline-none"
                  >
                    {availableRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        Room {room.roomNumber} - ₹{room.rentAmount}/mo
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {modalError && (
                <p className="text-xs font-semibold text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/30">{modalError}</p>
              )}

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availableRooms.length === 0}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 transition-colors"
                >
                  Approve & Assign Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE & ASSIGN MODAL */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRescheduleModal(false)}></div>
          <div className="bg-card rounded-2xl w-full max-w-md border border-border shadow-2xl p-6 relative z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-base font-bold text-foreground mb-1">Schedule / Reschedule Visit</h2>
            <p className="text-xs text-muted-foreground mb-4">Set specific appointment date and assign owner manager to host the visit.</p>

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={rescheduleDate}
                  onChange={e => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Assign Host (Owner)</label>
                <select
                  required
                  value={assignedOwnerId}
                  onChange={e => setAssignedOwnerId(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none"
                >
                  <option value="">Select Owner</option>
                  {owners.map(o => <option key={o.uid} value={o.uid}>{o.displayName} ({o.email})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Appointment Instructions</label>
                <textarea
                  value={visitNotes}
                  onChange={e => setVisitNotes(e.target.value)}
                  placeholder="e.g. Host Skyline Towers visit slot. Customer requests viewing Room 101."
                  rows={3}
                  className="w-full px-3 py-2 bg-input border border-border rounded-xl text-foreground text-sm focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
                >
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
