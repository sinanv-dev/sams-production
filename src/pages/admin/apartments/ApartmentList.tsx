import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { subscribeToApartments, deleteApartment, getRooms } from '../../../firebase/db';
import { Apartment } from '../../../types';
import { Building, MapPin, Plus, Search, Trash2, Edit3, Eye } from 'lucide-react';

export const ApartmentList: React.FC = () => {
  const navigate = useNavigate();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    // Real-time Firestore subscription observer
    const unsubscribe = subscribeToApartments((data) => {
      setApartments(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    try {
      const allRooms = await getRooms();
      const aptRooms = allRooms.filter(r => r.apartmentId === id);
      const hasOccupied = aptRooms.some(r => r.status === 'occupied');

      let confirmMsg = 'Are you sure you want to delete this complex? This will delete all rooms inside it!';
      if (hasOccupied) {
        confirmMsg = 'WARNING: This Apartment contains active occupied rooms. Deleting it will vacate those rooms and remove customer placements. Do you want to proceed?';
      }

      if (!confirm(confirmMsg)) return;

      await deleteApartment(id);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredApartments = apartments.filter(apt =>
    apt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredApartments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentApartments = filteredApartments.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Complex Assets</h1>
          <p className="text-muted-foreground text-sm font-medium">Create buildings, coordinate room units, and list amenities.</p>
        </div>
        <Link
          to="/admin/apartments/new"
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-md shadow-brand-500/10"
        >
          <Plus size={18} />
          <span>New Complex</span>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground w-5 h-5" />
          <input
            type="text"
            placeholder="Search complex by name or city..."
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
      ) : filteredApartments.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-sm">
          <Building className="mx-auto text-muted-foreground w-12 h-12 mb-3" />
          <h3 className="font-bold text-foreground">No Complexes Defined</h3>
          <p className="text-muted-foreground text-xs mt-1">Create your first apartment complex to list rooms.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentApartments.map((apt) => (
              <div key={apt.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                <div>
                  <img 
                    src={apt.imageUrl} 
                    alt={apt.name} 
                    className="h-40 w-full object-cover border-b border-border/50"
                  />
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-sm text-foreground">{apt.name}</h3>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed truncate">{apt.description}</p>
                    
                    <div className="flex flex-wrap gap-1">
                      {apt.amenities.map((a, i) => (
                        <span key={i} className="text-[9px] font-bold bg-input border border-border text-foreground px-2 py-0.5 rounded">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 border-t border-border/50 bg-input/20 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-bold flex items-center">
                    <MapPin size={12} className="mr-1 text-brand-600 dark:text-brand-400" />
                    {apt.address.split(',')[1] || 'Miami'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/admin/apartments/${apt.id}`}
                      className="p-2 text-foreground hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-400 bg-card border border-border rounded-xl hover:shadow-sm transition-all"
                      title="View Rooms Details"
                    >
                      <Eye size={14} />
                    </Link>
                    <Link
                      to={`/admin/apartments/${apt.id}/edit`}
                      className="p-2 text-foreground hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-400 bg-card border border-border rounded-xl hover:shadow-sm transition-all"
                      title="Edit Complex"
                    >
                      <Edit3 size={14} />
                    </Link>
                    <button
                      onClick={(e) => handleDelete(e, apt.id)}
                      className="p-2 text-muted-foreground hover:text-red-600 dark:text-red-400 bg-card border border-border rounded-xl hover:shadow-sm transition-all"
                      title="Delete Complex"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
