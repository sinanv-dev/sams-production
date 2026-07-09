import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToRequests } from '../../../firebase/db';
import { ApartmentRequest } from '../../../types';
import { Calendar, Building, Eye, Inbox, Search } from 'lucide-react';

export const RequestList: React.FC = () => {
  const [requests, setRequests] = useState<ApartmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    // Subscribe to requests in real-time
    const unsubscribe = subscribeToRequests((data) => {
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRequests = requests.filter(r =>
    (r.customerName && r.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.apartmentName && r.apartmentName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRequests = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Leasing Requests</h1>
        <p className="text-muted-foreground text-sm font-medium">Review customer visits, coordinate scheduling, and approve vacant room placements.</p>
      </div>

      {/* Filter and Search */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search requests by customer or building..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-input/50 dark:bg-transparent border border-border rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 dark:bg-slate-800 transition-colors"
          />
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Inbox className="mx-auto text-muted-foreground w-12 h-12 mb-3" />
          <h3 className="font-bold text-foreground">No Requests Found</h3>
          <p className="text-muted-foreground text-xs mt-1">Customer booking requests will display here for scheduling.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-input/50 dark:bg-transparent border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Customer Name</th>
                    <th className="py-4 px-6">Target Building</th>
                    <th className="py-4 px-6">Preferred Visit Date</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50 dark:divide-slate-700/50 text-sm font-medium text-foreground">
                  {currentRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-table-row-hover dark:bg-transparent transition-colors">
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground block">{req.customerName}</span>
                          <span className="text-xs text-muted-foreground">{req.customerEmail}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/20 px-2 py-1 rounded">
                          {req.apartmentName}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-foreground">
                        <div className="flex items-center text-xs">
                          <Calendar size={12} className="mr-1.5 text-muted-foreground" />
                          {new Date(req.preferredVisitDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end">
                          <Link
                            to={`/admin/requests/${req.id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-brand-50 dark:bg-brand-950/20 hover:bg-brand-100 text-brand-600 dark:text-brand-400 rounded-lg text-xs font-bold transition-all"
                          >
                            <Eye size={14} />
                            <span>Process Request</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground font-semibold">
                Showing page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 border border-border dark:border-slate-700 text-foreground hover:text-foreground disabled:opacity-50 text-xs font-bold rounded-lg hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-800 transition-all"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 border border-border dark:border-slate-700 text-foreground hover:text-foreground disabled:opacity-50 text-xs font-bold rounded-lg hover:bg-white dark:hover:bg-slate-700 dark:bg-slate-800 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


