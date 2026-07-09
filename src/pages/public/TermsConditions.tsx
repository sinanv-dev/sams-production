import React from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { BookOpen, User, DollarSign, ShieldAlert, Award, FileText } from 'lucide-react';

export const TermsConditions: React.FC = () => {
  return (
    <PublicLayout>
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-20 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            Legal Directory
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Terms & Conditions
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Effective Date: June 23, 2026. Review the rules governing your usage of the SAMS platform.
          </p>
        </div>
      </section>

      {/* Terms Content Layout */}
      <section className="py-20 px-6 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12" id="refund">
        
        {/* Table of Contents - Left Column (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-4 hidden lg:block">
          <div className="bg-white dark:bg-slate-800 border border-navy-100/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-navy-950 dark:text-slate-50 mb-4 pb-2 border-b border-navy-100 dark:border-slate-700">Sections</h3>
            <ul className="space-y-3 text-xs font-bold text-navy-500 dark:text-slate-400">
              <li>
                <a href="#responsibilities" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <User size={14} />
                  <span>1. User Responsibilities</span>
                </a>
              </li>
              <li>
                <a href="#rules" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <BookOpen size={14} />
                  <span>2. Platform Usage Rules</span>
                </a>
              </li>
              <li>
                <a href="#payments" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <DollarSign size={14} />
                  <span>3. Payment Terms</span>
                </a>
              </li>
              <li>
                <a href="#accounts" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <FileText size={14} />
                  <span>4. Account Policies</span>
                </a>
              </li>
              <li>
                <a href="#liability" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <ShieldAlert size={14} />
                  <span>5. Liability Limitations</span>
                </a>
              </li>
              <li>
                <a href="#refund-policy" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <Award size={14} />
                  <span>6. Refund Policy</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Details - Right Column (8 cols) */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* 1. User Responsibilities */}
          <div className="space-y-4 scroll-mt-24" id="responsibilities">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <User size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">1. User Responsibilities</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              You must provide accurate information when registering for customer or owner profiles. Rent payments, utility readings, showing requests, and owner/customer communications must reflect true and verifiable information.
            </p>
          </div>

          {/* 2. Platform Usage Rules */}
          <div className="space-y-4 scroll-mt-24" id="rules">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <BookOpen size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">2. Platform Usage Rules</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              SAMS grants you a limited, non-exclusive, non-transferable access license to its online web dashboards. Users are strictly prohibited from exploiting system endpoints, scraping public property lists, or executing malicious injection scripts on SAMS databases.
            </p>
          </div>

          {/* 3. Payment Terms */}
          <div className="space-y-4 scroll-mt-24" id="payments">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">3. Payment Terms</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              Owners/owners set rental rates and utility formulas inside their database parameters. Rent and utility invoices generated via SAMS must be settled in full based on the owner's chosen payment schedule. Late penalty fees may be applied automatically.
            </p>
          </div>

          {/* 4. Account Policies */}
          <div className="space-y-4 scroll-mt-24" id="accounts">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <FileText size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">4. Account Policies</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              We reserve the right to suspend or block accounts that violate these terms, post fraudulent apartment lists, submit spam support/complaint tickets, or consistently default on billing payments.
            </p>
          </div>

          {/* 5. Liability Limitations */}
          <div className="space-y-4 scroll-mt-24" id="liability">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <ShieldAlert size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">5. Liability Limitations</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              SAMS acts as an administrative property tool. SAMS does not own property directly, nor do we act as Owners. We are not liable for property damage, lease disputes, incorrect meter readings submitted manually, or transactional errors between Owners and Customers.
            </p>
          </div>

          {/* 6. Refund Policy */}
          <div className="space-y-4 scroll-mt-24" id="refund-policy">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Award size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">6. Refund Policy</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              SaaS licensing fees paid by property owners are non-refundable unless stated otherwise in individual custom enterprise service-level agreements. customer rent payments and utility calculations are handled directly by property owners; any rental disputes or refund requests must be filed with the respective property manager.
            </p>
          </div>

        </div>

      </section>
    </PublicLayout>
  );
};
