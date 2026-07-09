import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { HelpCircle, Clock, ArrowRight } from 'lucide-react';

export const HelpCenter: React.FC = () => {
  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-6 pt-6 text-xs font-semibold text-navy-450 dark:text-slate-400 flex items-center space-x-2">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span>/</span>
        <span className="text-navy-950 dark:text-slate-50">Help Center</span>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-md shadow-brand-500/5">
            <HelpCircle size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight">Help Center</h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Search our user manuals, video tutorials, and technical document guides.
          </p>

          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 rounded-2xl text-xs font-bold shadow-sm">
            <Clock size={16} />
            <span>Coming Soon</span>
          </div>

          <p className="text-xs md:text-sm text-navy-450 dark:text-slate-400 leading-relaxed max-w-md mx-auto pt-4">
            Our comprehensive Help Center documentation is currently being compiled. If you require immediate assistance with billing or account configuration, please head over to our Contact page.
          </p>

          <div className="pt-6">
            <Link to="/contact" className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md">
              <span>Go to Contact Page</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
