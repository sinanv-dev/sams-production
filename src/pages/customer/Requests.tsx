import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRequests } from '../../firebase/db';
import { ApartmentRequest } from '../../types';
import { Calendar, Building, HelpCircle, Inbox } from 'lucide-react';

export const CustomerRequests: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApartmentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getRequests();
      setRequests(data.filter(r => r.customerId === user.uid));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Visit Requests</h1>
        <p className="text-muted-foreground text-sm font-medium">Monitor your visit touring schedule, manager comments, and room assignment states.</p>
      </div>

      {/* Requests table listing */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Inbox className="mx-auto text-navy-300 w-12 h-12 mb-3" />
          <h3 className="font-bold text-foreground">No Visit Requests Logged</h3>
          <p className="text-muted-foreground text-xs mt-1">Browse available rooms and schedule a visit tour slot.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-input/50 dark:bg-transparent border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Building Complex</th>
                  <th className="py-4 px-6">Preferred Visit Date & Time</th>
                  <th className="py-4 px-6">My Notes</th>
                  <th className="py-4 px-6">Approval Status</th>
                  <th className="py-4 px-6">Assigned Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50 dark:divide-slate-700/50 text-sm font-medium text-foreground">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-table-row-hover dark:bg-transparent transition-colors">
                    <td className="py-4 px-6 font-bold text-foreground flex items-center space-x-2">
                      <Building size={16} className="text-brand-600 dark:text-brand-400" />
                      <span>{req.apartmentName}</span>
                    </td>
                    <td className="py-4 px-6 text-foreground">
                      <div className="flex flex-col text-xs font-semibold">
                        <div className="flex items-center text-navy-900 dark:text-slate-100">
                          <Calendar size={12} className="mr-1.5 text-muted-foreground" />
                          {new Date(req.preferredVisitDate).toLocaleDateString()}
                        </div>
                        {req.preferredVisitTime && (
                          <span className="text-[10px] text-navy-450 mt-0.5 ml-4">
                            Slot: {req.preferredVisitTime}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-muted-foreground max-w-xs truncate">
                      {req.notes || "No notes provided"}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-foreground font-bold">
                      {req.assignedRoomId ? (
                        <span className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 px-2.5 py-1 rounded-lg">
                          Room {req.assignedRoomId.split('_')[1]}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-normal">Pending Assignment</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
