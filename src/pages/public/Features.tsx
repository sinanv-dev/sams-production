import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { ShieldCheck, Zap, Users, AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';

export const Features: React.FC = () => {
  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-6 pt-6 text-xs font-semibold text-navy-450 dark:text-slate-400 flex items-center space-x-2">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span>/</span>
        <span className="text-navy-950 dark:text-slate-50">Features</span>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-16 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            Platform Capabilities
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Features Built for Real Management
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Discover the tools that simplify rent collections, billing calculations, issue logs, and occupancy metrics.
          </p>
        </div>
      </section>

      {/* Grid of Platform Features */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100/40 dark:border-slate-700/50 rounded-3xl p-8 space-y-4 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-navy-950 dark:text-slate-50">Audit-Level Oversight</h3>
            <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
              Property managers get complete transparency over accounts, profiles, and billing statuses. Audit collections and review rental defaults in real time.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100/40 dark:border-slate-700/50 rounded-3xl p-8 space-y-4 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Zap size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-navy-950 dark:text-slate-50">Utility Billing calculations</h3>
            <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
              Log monthly utility meter indexes. The system automatically computes electricity consumption fees based on pre-defined tariffs and appends late penalty flat-fees.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100/40 dark:border-slate-700/50 rounded-3xl p-8 space-y-4 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Users size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-navy-950 dark:text-slate-50">customer Profile Management</h3>
            <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
              Store contact numbers, email logs, profile variables, lease dates, and security deposit details. Ensure compliant record handling for every customer.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100/40 dark:border-slate-700/50 rounded-3xl p-8 space-y-4 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-navy-950 dark:text-slate-50">Issue Tracker & Complaints</h3>
            <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
              Customers can report apartment failures, maintenance issues, or noise. Owners receive immediate dashboard updates to resolve requests and assign work logs.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100/40 dark:border-slate-700/50 rounded-3xl p-8 space-y-4 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-navy-950 dark:text-slate-50">Occupancy Analytics</h3>
            <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
              Track building layout fill rates, identify upcoming lease expiries, and analyze overall monthly revenue streams across properties.
            </p>
          </div>

          {/* Card 6 */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100/40 dark:border-slate-700/50 rounded-3xl p-8 space-y-4 hover:shadow-md transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <h3 className="font-extrabold text-lg text-navy-950 dark:text-slate-50">Role-Based Portals</h3>
            <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
              SAMS routes users to designated dashboards: Admin controls systems, owners manage buildings, and customers manage self-service.
            </p>
          </div>

        </div>
      </section>
    </PublicLayout>
  );
};
