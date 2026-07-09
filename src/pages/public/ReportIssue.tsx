import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

export const ReportIssue: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [issueType, setIssueType] = useState('Bug');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setDescription('');
    }, 1200);
  };

  return (
    <PublicLayout>
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-6 pt-6 text-xs font-semibold text-navy-450 dark:text-slate-400 flex items-center space-x-2">
        <Link to="/" className="hover:text-brand-500 transition-colors">Home</Link>
        <span>/</span>
        <span className="text-navy-950 dark:text-slate-50">Report an Issue</span>
      </div>

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-16 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
            Support Form
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Report an Issue
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Submit a support ticket or notify SAMS technical engineers about bugs or platform outages.
          </p>
        </div>
      </section>

      {/* Form Container */}
      <section className="py-20 px-6 max-w-2xl mx-auto">
        <div className="bg-white dark:bg-slate-800 border border-navy-100/50 dark:border-slate-700/50 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center space-x-3 text-navy-950 dark:text-slate-50">
            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-xl font-black tracking-tight">Open a Support Ticket</h2>
          </div>

          {submitted ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-400 animate-fadeIn">
              <CheckCircle2 size={24} className="flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Ticket Logged Successfully!</h3>
                <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-455">Your issue has been submitted to SAMS support engineers. We will inspect the case and respond via email.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-bold underline hover:no-underline"
                >
                  Submit another report
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 px-4 text-sm font-medium text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 px-4 text-sm font-medium text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1">Issue Type</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm font-medium text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                >
                  <option value="Bug">Technical Outage / Bug</option>
                  <option value="Billing">Payment / Billing Issue</option>
                  <option value="Account">Account Access / Roles</option>
                  <option value="Suggestion">Feature Suggestion</option>
                  <option value="Other">Other / General Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1">Description</label>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the issue in detail, including steps to reproduce it."
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 px-4 text-sm font-medium text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-navy-200 dark:disabled:bg-slate-700 disabled:text-navy-400 dark:disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/10 hover:shadow-red-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Send size={16} />
                <span>{submitting ? 'Submitting Ticket...' : 'Submit Ticket'}</span>
              </button>
            </form>
          )}
        </div>
      </section>
    </PublicLayout>
  );
};
