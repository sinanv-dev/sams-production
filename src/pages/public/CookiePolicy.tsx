import React from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { ShieldCheck, Info } from 'lucide-react';

export const CookiePolicy: React.FC = () => {
  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-6 pt-6 text-xs font-semibold text-navy-450 dark:text-slate-400 flex items-center space-x-2">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span>/</span>
        <span className="text-navy-950 dark:text-slate-50">Cookie Policy</span>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-16 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            Legal Directory
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Cookie Policy
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Effective Date: June 23, 2026. This policy outlines how SAMS handles local cache, web cookies, and session data.
          </p>
        </div>
      </section>

      {/* Cookie Details */}
      <section className="py-20 px-6 max-w-3xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-navy-950 dark:text-slate-50">
            <ShieldCheck size={20} className="text-brand-600 dark:text-brand-400" />
            <h2 className="text-xl font-black tracking-tight">Essential Session Cookies</h2>
          </div>
          <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
            We use essential cookies and localStorage keys to manage active user authorization sessions. These tokens identify whether you are signed in as an Admin, Owner, or Customer, and prevent cross-site request forgery attacks.
          </p>
          <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
            Since these files are mandatory for running basic role redirections, database actions, and page access loops, they cannot be deactivated without causing system authentication outages.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-navy-950 dark:text-slate-50">
            <Info size={20} className="text-emerald-500" />
            <h2 className="text-xl font-black tracking-tight">Preference & LocalStorage Cache</h2>
          </div>
          <p className="text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
            We store theme configurations (light mode/dark mode) inside your browser's localStorage. This guarantees that when you navigate back to the site, SAMS displays your chosen style options instantly without jarring screen flashes.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
};
