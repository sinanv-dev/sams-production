import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Zap, ArrowRight, UserCheck } from 'lucide-react';
import { PublicLayout } from '../../layouts/PublicLayout';

export const LandingPage: React.FC = () => {

  return (
    <PublicLayout>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-20 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            Smart Apartment Management System
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            The Complete Apartment Management Platform
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Track rent payments, electricity bills, occupancy, customer requests, and maintenance issues from one modern platform designed for apartment owners and customers.
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/login" className="flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all shadow-lg shadow-brand-500/10">
              <span>Access SAMS Portals</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-xl md:text-2xl font-black text-navy-950 dark:text-slate-50 tracking-tight">Everything you need to run your properties</h2>
          <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold uppercase tracking-wider">Built for property managers, owners, and customers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Owner card */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-64 hover:shadow-md transition-all duration-300">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-950 dark:text-slate-50">For Property Owners</h3>
              <p className="text-xs text-navy-500 dark:text-slate-300 leading-relaxed font-medium">Monitor monthly rent collection, view vacancy rates, manage customer profiles, and assign maintenance work orders with clear oversight.</p>
            </div>
            <Link to="/login" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center">
              Login as Owner &rarr;
            </Link>
          </div>

          {/* Customer card */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-64 hover:shadow-md transition-all duration-300">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-950 dark:text-slate-50">For Apartment Customers</h3>
              <p className="text-xs text-navy-500 dark:text-slate-300 leading-relaxed font-medium">View layouts, request apartment tours, check your electricity utility meter readings, pay rent balances, and submit maintenance reports online.</p>
            </div>
            <Link to="/register" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center">
              Register Customer &rarr;
            </Link>
          </div>

          {/* Utilities & Billing card */}
          <div className="bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between h-64 hover:shadow-md transition-all duration-300">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-950 dark:text-slate-50">Rent & Utility Billing</h3>
              <p className="text-xs text-navy-500 dark:text-slate-300 leading-relaxed font-medium">Generate utility and rent bills. Compute electricity costs from utility meters, apply flat-fee late charges, and issue clear monthly invoices.</p>
            </div>
            <Link to="/login" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 flex items-center">
              Access SAMS Portal &rarr;
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
