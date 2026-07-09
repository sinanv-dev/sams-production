import React from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Shield, Eye, Lock, RefreshCw, Key, Scale } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <PublicLayout>
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-20 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            Legal Directory
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Privacy Policy
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Effective Date: June 23, 2026. This policy outlines how SAMS collects, stores, and handles your information.
          </p>
        </div>
      </section>

      {/* Policy Content Layout */}
      <section className="py-20 px-6 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12" id="cookies">
        
        {/* Table of Contents - Left Column (4 cols) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 h-fit space-y-4 hidden lg:block">
          <div className="bg-white dark:bg-slate-800 border border-navy-100/50 dark:border-slate-700/50 rounded-3xl p-6 shadow-sm">
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-navy-950 dark:text-slate-50 mb-4 pb-2 border-b border-navy-100 dark:border-slate-700">Sections</h3>
            <ul className="space-y-3 text-xs font-bold text-navy-500 dark:text-slate-400">
              <li>
                <a href="#collection" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <Eye size={14} />
                  <span>1. Data Collection</span>
                </a>
              </li>
              <li>
                <a href="#info" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <Key size={14} />
                  <span>2. User Information</span>
                </a>
              </li>
              <li>
                <a href="#security" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <Lock size={14} />
                  <span>3. Security Measures</span>
                </a>
              </li>
              <li>
                <a href="#usage" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <RefreshCw size={14} />
                  <span>4. Data Usage</span>
                </a>
              </li>
              <li>
                <a href="#rights" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <Scale size={14} />
                  <span>5. User Rights</span>
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-brand-500 transition-colors flex items-center space-x-2">
                  <Shield size={14} />
                  <span>6. Contact Information</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Details - Right Column (8 cols) */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* 1. Data Collection */}
          <div className="space-y-4 scroll-mt-24" id="collection">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Eye size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">1. Data Collection</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              We collect information you provide directly to us when setting up profiles, submitting work requests, logging utility readings, or communicating with owners. This includes name, email address, property details, and billing history.
            </p>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              Additionally, we automatically collect specific log parameters, such as access timestamps, device metadata, and utility consumption details (such as electricity meters logged in our database system).
            </p>
          </div>

          {/* 2. User Information */}
          <div className="space-y-4 scroll-mt-24" id="info">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Key size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">2. User Information</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              User information is securely stored inside database environments mapping to designated owner and customer accounts. We do not sell user profile lists, customer logs, or individual billing logs to advertising agencies or outside third parties.
            </p>
          </div>

          {/* 3. Security Measures */}
          <div className="space-y-4 scroll-mt-24" id="security">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Lock size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">3. Security Measures</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              We employ robust administrative, operational, and digital security measures to safeguard user data. This includes database firewalls, role-based session authorizations, and encrypted data transfers over SSL/TLS.
            </p>
          </div>

          {/* 4. Data Usage */}
          <div className="space-y-4 scroll-mt-24" id="usage">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <RefreshCw size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">4. Data Usage</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              Your data is processed only to support apartment management operations. This includes generating monthly utility bills, processing rental balance records, keeping owner profile registers, and compiling maintenance notifications.
            </p>
          </div>

          {/* 5. User Rights */}
          <div className="space-y-4 scroll-mt-24" id="rights">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Scale size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">5. User Rights</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              Under applicable laws, users have the right to access, rectify, or purge their profile records from our platform directory. To trigger profile purges or data exports, please submit an issue request via the Customer Portal or contact support.
            </p>
          </div>

          {/* 6. Contact Information */}
          <div className="space-y-4 scroll-mt-24" id="contact">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Shield size={16} />
              </div>
              <h2 className="text-xl font-black text-navy-950 dark:text-slate-50 tracking-tight">6. Contact Information</h2>
            </div>
            <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
              For security concerns, GDPR inquiries, or standard privacy assistance, email our compliance officer directly at <a href="mailto:privacy@sams.com" className="font-bold text-brand-600 dark:text-brand-400 hover:underline">privacy@sams.com</a>.
            </p>
          </div>

        </div>

      </section>
    </PublicLayout>
  );
};
