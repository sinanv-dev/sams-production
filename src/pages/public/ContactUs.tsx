import React, { useState } from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { Mail, Phone, MapPin, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const ContactUs: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 1200);
  };

  return (
    <PublicLayout>
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-20 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            Get in Touch
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            We'd Love to Hear From You
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Have questions about our platform, need support, or want a demo? Contact our team.
          </p>
        </div>
      </section>

      {/* Main Body Split Layout */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Form - Left Column (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 border border-navy-100/50 dark:border-slate-700/50 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-navy-950 dark:text-slate-50 tracking-tight">Send Us a Message</h2>
            <p className="text-xs md:text-sm text-navy-450 dark:text-slate-400">Fill out the form below and we will get back to you within 24 hours.</p>
          </div>

          {submitted ? (
            <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-400 animate-fadeIn">
              <CheckCircle2 size={24} className="flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-bold text-sm">Message Sent Successfully!</h3>
                <p className="text-xs leading-relaxed text-emerald-700 dark:text-emerald-400/80">Thank you for contacting us. A member of our support team will reach out to you shortly.</p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs font-bold underline hover:no-underline"
                >
                  Send another message
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="How can we help?"
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 px-4 text-sm font-medium text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1">Message</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your query here..."
                  className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2 px-4 text-sm font-medium text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-navy-200 dark:disabled:bg-slate-700 disabled:text-navy-400 dark:disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-95 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Send size={16} />
                <span>{submitting ? 'Sending Message...' : 'Send Message'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Contact Info - Right Column (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Info Card */}
          <div className="bg-navy-50/50 dark:bg-slate-800/50 border border-navy-100/50 dark:border-slate-700/50 rounded-3xl p-8 space-y-6">
            <h3 className="font-extrabold text-xl text-navy-950 dark:text-slate-50">Company Information</h3>
            
            <ul className="space-y-5">
              <li className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Email Us</p>
                  <a href="mailto:info@sams.com" className="text-sm font-bold text-navy-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">info@sams.com</a>
                </div>
              </li>

              <li className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Call Us</p>
                  <a href="tel:+15550192834" className="text-sm font-bold text-navy-800 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">+1 (555) 019-2834</a>
                </div>
              </li>

              <li className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Business Address</p>
                  <p className="text-sm font-semibold text-navy-700 dark:text-slate-300 leading-relaxed">
                    100 Real Estate Ave, Suite 500,<br />Austin, TX 78701
                  </p>
                </div>
              </li>

              <li className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-xl bg-brand-100 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-navy-400 dark:text-slate-400">Business Hours</p>
                  <p className="text-sm font-semibold text-navy-700 dark:text-slate-300 leading-relaxed">
                    Monday - Friday: 9:00 AM - 6:00 PM<br />Saturday - Sunday: Closed
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Support Information Card */}
          <div className="bg-brand-600 text-white rounded-3xl p-8 space-y-4 shadow-lg shadow-brand-500/10">
            <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <h3 className="font-extrabold text-lg">Need Immediate Assistance?</h3>
            <p className="text-xs text-brand-100 leading-relaxed">
              If you are a customer experiencing an emergency utility issue or rent payment error, please log in directly to file an urgent complaint.
            </p>
            <p className="text-xs font-semibold text-white/95">
              Support Desk Email: <a href="mailto:support@sams.com" className="underline hover:text-brand-200">support@sams.com</a>
            </p>
          </div>

        </div>

      </section>
    </PublicLayout>
  );
};
