import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Target, Heart, Eye, Award } from 'lucide-react';

export const OurMission: React.FC = () => {
  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-6 pt-6 text-xs font-semibold text-navy-450 dark:text-slate-400 flex items-center space-x-2">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span>/</span>
        <span className="text-navy-950 dark:text-slate-50">Our Mission</span>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-16 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            Our Purpose
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Empowering Modern Property Ecosystems
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            We are dedicated to building standard Customerial management platforms that align the goals of property owners and Customers.
          </p>
        </div>
      </section>

      {/* Detailed Content */}
      <section className="py-20 px-6 max-w-5xl mx-auto space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-navy-950 dark:text-slate-50 tracking-tight">Driving Transparency in Property Management</h2>
            <p className="text-sm text-navy-650 dark:text-slate-300 leading-relaxed">
              We started SAMS with a clear objective: to eliminate the friction in communication, billing, and request tracking between property managers and Customers. We believe in providing audit-level visibility for Owners while giving Customers a seamless self-service interface.
            </p>
          </div>
          <div className="bg-brand-50/50 dark:bg-brand-950/10 border border-brand-100/40 dark:border-brand-900/30 rounded-3xl p-8 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Target size={20} />
            </div>
            <h3 className="font-bold text-lg text-navy-950 dark:text-slate-50">Our Target</h3>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-400 leading-relaxed">
              To automate building management loops—from utility index tracking to invoice processing—thereby freeing property managers to focus on real community support.
            </p>
          </div>
        </div>

        {/* Vision & Core Values */}
        <div className="space-y-8">
          <h2 className="text-2xl font-black text-center text-navy-950 dark:text-slate-50 tracking-tight">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-slate-800 border border-navy-100/45 dark:border-slate-700/50 rounded-2xl p-6 space-y-3">
              <div className="text-emerald-500"><Heart size={24} /></div>
              <h3 className="font-bold text-base text-navy-950 dark:text-slate-50">customer First</h3>
              <p className="text-xs text-navy-500 dark:text-slate-400 leading-relaxed">
                Every tool we build is focused on providing Customers with a clean, stress-free self-service portal.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-navy-100/45 dark:border-slate-700/50 rounded-2xl p-6 space-y-3">
              <div className="text-brand-500"><Eye size={24} /></div>
              <h3 className="font-bold text-base text-navy-950 dark:text-slate-50">Absolute Clarity</h3>
              <p className="text-xs text-navy-500 dark:text-slate-400 leading-relaxed">
                No hidden costs or complicated billing tables. We maintain direct computation formulas for electricity usage and flat fees.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-800 border border-navy-100/45 dark:border-slate-700/50 rounded-2xl p-6 space-y-3">
              <div className="text-amber-500"><Award size={24} /></div>
              <h3 className="font-bold text-base text-navy-950 dark:text-slate-50">Robust Engineering</h3>
              <p className="text-xs text-navy-500 dark:text-slate-400 leading-relaxed">
                Reliable state tracking, theme synchronization, and session checks ensure a clean platform experience.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
