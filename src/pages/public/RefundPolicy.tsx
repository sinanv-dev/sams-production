import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { FileText, ShieldAlert, Award } from 'lucide-react';

export const RefundPolicy: React.FC = () => {
  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-6 pt-6 text-xs font-semibold text-navy-450 dark:text-slate-400 flex items-center space-x-2">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span>/</span>
        <span className="text-navy-950 dark:text-slate-50">Refund Policy</span>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-16 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            Legal Directory
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Refund Policy
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Effective Date: June 23, 2026. This policy outlines terms for platform license refunds and rent payments.
          </p>
        </div>
      </section>

      {/* Refund Details */}
      <section className="py-20 px-6 max-w-3xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-navy-950 dark:text-slate-50">
            <Award size={20} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xl font-black tracking-tight">SaaS Subscription Licensing</h2>
          </div>
          <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
            SAMS licensing plans and subscription plans billed to property owners or business organizations are non-refundable. Since our platform offers access to cloud-connected profile dashboards and management tools, we do not issue prorated adjustments or subscription refunds once a billing cycle begins.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-navy-950 dark:text-slate-50">
            <ShieldAlert size={20} className="text-emerald-500" />
            <h2 className="text-xl font-black tracking-tight">Rent & Customer Payments</h2>
          </div>
          <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
            Rent transactions, security deposit payments, and utility fees paid by customers are transferred directly to the property owner's account. SAMS is an administrative portal and does not process, handle, or hold client rent transactions directly.
          </p>
          <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
            If you need to dispute an invoice or request a rental refund due to incorrect meter logging or moving cancellations, please coordinate directly with your owner or property manager.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-navy-950 dark:text-slate-50">
            <FileText size={20} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xl font-black tracking-tight">Contact Us for Disputes</h2>
          </div>
          <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
            For questions about billing logs or platform payment processing issues, please email our support staff at <a href="mailto:support@sams.in" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">support@sams.in</a>.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
};
