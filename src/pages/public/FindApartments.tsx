import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { getApartments } from '../../firebase/db';
import { Apartment } from '../../types';
import { MapPin, Building, Search, ArrowRight, ShieldCheck } from 'lucide-react';

export const FindApartments: React.FC = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadApartments();
  }, []);

  const loadApartments = async () => {
    try {
      const data = await getApartments();
      setApartments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApartments = apartments.filter(apt => 
    apt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-6 pt-6 text-xs font-semibold text-navy-455 dark:text-slate-400 flex items-center space-x-2">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span>/</span>
        <span className="text-navy-950 dark:text-slate-50">Find Apartments</span>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-16 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
            Active Directory
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Browse Managed Properties
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Find the perfect apartment building and view its configuration details, address, and amenities.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto relative pt-4">
            <Search className="absolute left-6 top-7 text-navy-400 dark:text-slate-500 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by building name, address..."
              className="w-full bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium text-navy-850 dark:text-slate-100 focus:outline-none focus:border-brand-500 shadow-md shadow-brand-500/5 transition-all duration-200"
            />
          </div>
        </div>
      </section>

      {/* Apartments Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredApartments.length === 0 ? (
          <div className="text-center py-20 text-navy-450 dark:text-slate-400 space-y-4">
            <Building size={48} className="mx-auto text-navy-300 dark:text-slate-700" />
            <p className="text-sm font-semibold">No apartment complexes match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredApartments.map(apt => (
              <div key={apt.id} className="bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
                <img 
                  src={apt.imageUrl} 
                  alt={apt.name} 
                  className="h-48 w-full object-cover border-b border-navy-100/50 dark:border-slate-700/50"
                />
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-base text-navy-950 dark:text-slate-50">{apt.name}</h3>
                    <p className="text-xs text-navy-500 dark:text-slate-300 leading-relaxed font-medium">{apt.description}</p>
                  </div>
                  
                  <div className="space-y-4 pt-3 border-t border-navy-100/80 dark:border-slate-700">
                    <p className="text-[11px] text-navy-400 dark:text-slate-400 font-bold flex items-center">
                      <MapPin size={13} className="mr-1 text-brand-600 dark:text-brand-400" />
                      {apt.address}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {apt.amenities.map((a, i) => (
                        <span key={i} className="text-[9px] font-bold bg-navy-50 dark:bg-slate-900 border border-navy-100 dark:border-slate-700 text-navy-600 dark:text-slate-300 px-2 py-0.5 rounded transition-colors">
                          {a}
                        </span>
                      ))}
                    </div>
                    <Link to="/register" className="w-full py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-900/30 text-brand-700 dark:text-brand-400 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center space-x-1">
                      <span>View Units & Register</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
};
