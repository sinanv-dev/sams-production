import React from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Shield, Sparkles, Compass, Target, ArrowUpRight, Award, Building, Users } from 'lucide-react';

export const AboutUs: React.FC = () => {
  return (
    <PublicLayout>
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-20 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            About SAMS
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Empowering Modern Property Ecosystems
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            SAMS is a modern, all-in-one apartment management solution that bridges the gap between property owners, Owners, and Customers.
          </p>
        </div>
      </section>

      {/* Company Intro & Mission */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center" id="mission">
        <div className="space-y-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-sm">
            <Compass size={24} />
          </div>
          <h2 className="text-3xl font-black text-navy-950 dark:text-slate-50 tracking-tight">Who We Are</h2>
          <p className="text-sm md:text-base text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
            Founded with the belief that property management shouldn't be chaotic, SAMS (Smart Apartment Management System) provides cutting-edge tools to simplify billing, streamline owner-customer communication, and keep operations running smoothly. We serve thousands of customers and property managers across the country, transforming complex operations into intuitive digital flows.
          </p>
          <div className="p-6 bg-white dark:bg-slate-800 border border-navy-100/50 dark:border-slate-700/50 rounded-3xl shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-brand-600 dark:text-brand-400 font-bold text-sm">
              <Target size={18} />
              <span>OUR MISSION</span>
            </div>
            <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
              To build the most reliable, transparent, and user-friendly platform for managing Customerial properties, ensuring seamless rent tracking, utility calculations, and maintenance for a stress-free living experience.
            </p>
          </div>
        </div>
        <div className="relative group overflow-hidden rounded-3xl shadow-lg border border-navy-100/50 dark:border-slate-800/80 bg-gradient-to-tr from-brand-600/10 to-transparent p-8 h-96 flex flex-col justify-end">
          <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/40 to-transparent z-10"></div>
          <div className="relative z-20 space-y-3 text-white">
            <h3 className="font-extrabold text-xl">Innovation in Real Estate Tech</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              We continue to iterate on user-driven feedback, designing features that automate the billing cycles, predict maintenance challenges, and provide real-time occupancy updates.
            </p>
          </div>
        </div>
      </section>

      {/* Why SAMS Section */}
      <section className="py-20 px-6 bg-white dark:bg-slate-900 border-y border-navy-100/40 dark:border-slate-800/60">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-navy-950 dark:text-slate-50 tracking-tight">Why Choose SAMS?</h2>
            <p className="text-xs md:text-sm text-navy-450 dark:text-slate-400 leading-relaxed">
              Unlike traditional property databases that are cluttered and slow, SAMS offers a sleek, modern user interface, light/dark mode styling, and lightning-fast state synchronization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-navy-50/50 dark:bg-slate-800/50 border border-navy-100/40 dark:border-slate-700/40 rounded-3xl space-y-4 hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <h3 className="font-bold text-lg text-navy-950 dark:text-slate-50">Sleek User Interface</h3>
              <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
                Designed with a modern SaaS framework, using clean, visual elements that eliminate steep learning curves for staff and customers alike.
              </p>
            </div>

            <div className="p-8 bg-navy-50/50 dark:bg-slate-800/50 border border-navy-100/40 dark:border-slate-700/40 rounded-3xl space-y-4 hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-lg text-navy-950 dark:text-slate-50">Secure & Reliable</h3>
              <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
                All profile records, payment structures, and utility metrics are securely tracked with role-based checks and robust configurations.
              </p>
            </div>

            <div className="p-8 bg-navy-50/50 dark:bg-slate-800/50 border border-navy-100/40 dark:border-slate-700/40 rounded-3xl space-y-4 hover:shadow-md transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award size={20} />
              </div>
              <h3 className="font-bold text-lg text-navy-950 dark:text-slate-50">Automated Calculations</h3>
              <p className="text-xs md:text-sm text-navy-500 dark:text-slate-400 leading-relaxed">
                Log meter readings and let SAMS automatically compute energy costs, generate statements, and track customer invoice statuses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Owners Benefits */}
        <div className="p-8 bg-white dark:bg-slate-800 border border-navy-100/50 dark:border-slate-700/50 rounded-3xl space-y-6 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Building size={24} />
          </div>
          <h3 className="font-black text-2xl text-navy-950 dark:text-slate-50">Benefits for Property Owners</h3>
          <ul className="space-y-4">
            {[
              "Clear visual dashboard for monthly rent flow and collections.",
              "Track real-time occupancy rates and vacancy ratios across all complexes.",
              "Manage profile lists for customers and owners securely.",
              "Direct work-order tracking to address property maintenance items instantly."
            ].map((benefit, idx) => (
              <li key={idx} className="flex items-start space-x-3 text-xs md:text-sm text-navy-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Benefits */}
        <div className="p-8 bg-white dark:bg-slate-800 border border-navy-100/50 dark:border-slate-700/50 rounded-3xl space-y-6 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Users size={24} />
          </div>
          <h3 className="font-black text-2xl text-navy-950 dark:text-slate-50">Benefits for Customers</h3>
          <ul className="space-y-4">
            {[
              "Seamless self-service customer portal available 24/7.",
              "Pay rent balances and view detailed utility/billing history online.",
              "Report issues and log complaints with instant status updates.",
              "Browse active properties, layouts, and request showing schedules."
            ].map((benefit, idx) => (
              <li key={idx} className="flex items-start space-x-3 text-xs md:text-sm text-navy-600 dark:text-slate-300">
                <span className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-950/30 text-brand-600 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Future Vision */}
      <section className="bg-gradient-to-t from-white to-navy-50 dark:from-slate-800/10 dark:to-slate-900 border-t border-navy-100/20 dark:border-slate-800/50 py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-sm">
            <ArrowUpRight size={24} />
          </div>
          <h2 className="text-3xl font-black text-navy-950 dark:text-slate-50 tracking-tight">Our Future Vision</h2>
          <p className="text-sm md:text-base text-navy-500 dark:text-slate-400 leading-relaxed font-medium">
            We are working toward smart-home integrations, predictive maintenance using machine learning models, and automated bank reconciliations. SAMS aims to continue leading real estate management into a highly automated, digital-first era.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
};
