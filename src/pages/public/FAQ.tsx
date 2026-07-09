import React, { useState } from 'react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { HelpCircle, ChevronDown, ChevronUp, Search, UserPlus, Home, CreditCard, Zap, AlertCircle, Briefcase } from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  icon: React.ReactNode;
  category: string;
}

export const FAQ: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openId, setOpenId] = useState<number | null>(1); // default open first

  const faqData: FAQItem[] = [
    {
      id: 1,
      category: "Account",
      icon: <UserPlus size={18} className="text-brand-500" />,
      question: "How do I create an account?",
      answer: "Creating an account is simple. Click the 'Create Account' button in the top navigation bar. Fill out your name, email, role (Owner or Customer), password, and click register. Owners and Customers can instantly log in and start using their custom portals."
    },
    {
      id: 2,
      category: "Apartments",
      icon: <Home size={18} className="text-emerald-500" />,
      question: "How do I request an apartment?",
      answer: "Customers can browse active real estate layouts inside the SAMS client portal. Once you find a suitable complex, click 'Request Booking' or submit a showing visitation schedule request. Owners can view, approve, or coordinate showing schedules directly from their owner dashboards."
    },
    {
      id: 3,
      category: "Billing",
      icon: <CreditCard size={18} className="text-brand-500" />,
      question: "How are rent payments tracked?",
      answer: "Rent schedules and billing periods are initialized by Owners. Each month, an automated invoice is generated for the customer. Customers can view their due balance, pay online, and review previous receipts. Owners get clear audit visibility to monitor collections and check customer lists."
    },
    {
      id: 4,
      category: "Billing",
      icon: <Zap size={18} className="text-amber-500" />,
      question: "How are electricity bills calculated?",
      answer: "Electricity costs are computed directly from logs registered inside the utility panel. Owners log monthly meter readings for each apartment. SAMS then calculates the usage automatically based on pre-set rates, aggregates flat fee penalties if applicable, and lists the fee on the customer's invoice."
    },
    {
      id: 5,
      category: "Support",
      icon: <AlertCircle size={18} className="text-red-500" />,
      question: "How do complaints work?",
      answer: "Customers experiencing problems (maintenance, noise, security) can log complaints inside the SAMS customer dashboard. Owners are notified instantly and can update the ticket status (e.g. Pending, In Progress, Resolved) and assign maintenance work orders."
    },
    {
      id: 6,
      category: "Owners",
      icon: <Briefcase size={18} className="text-emerald-500" />,
      question: "How do owners manage apartments?",
      answer: "Owners get an audit-level dashboard. From there, they can list apartment buildings, register new customer listings, track overall occupancy ratios, edit property profiles, record utility metrics, and handle maintenance schedules from a centralized web view."
    }
  ];

  const filteredFaqs = faqData.filter(item => 
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleOpen = (id: number) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <PublicLayout>
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-white to-navy-50 dark:from-slate-800/20 dark:to-slate-900 py-20 px-6 border-b border-navy-100/20 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30">
            F.A.Q.
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-navy-950 dark:text-slate-50 tracking-tight leading-tight md:leading-none">
            Frequently Asked Questions
          </h1>
          <p className="text-base md:text-lg text-navy-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            Quickly find answers to common queries about accounts, billing, properties, and support.
          </p>
          
          {/* Search bar */}
          <div className="max-w-md mx-auto relative pt-4">
            <Search className="absolute left-6 top-7 text-navy-400 dark:text-slate-500 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions or answers..."
              className="w-full bg-white dark:bg-slate-800 border border-navy-100 dark:border-slate-700 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium text-navy-850 dark:text-slate-100 focus:outline-none focus:border-brand-500 shadow-md shadow-brand-500/5 transition-all duration-200"
            />
          </div>
        </div>
      </section>

      {/* Accordions */}
      <section className="py-20 px-6 max-w-4xl mx-auto space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 text-navy-400 dark:text-slate-400 text-sm">
            No matching questions found. Try searching for other terms like "rent", "account", or "electricity".
          </div>
        ) : (
          filteredFaqs.map(item => {
            const isOpen = openId === item.id;
            return (
              <div 
                key={item.id} 
                className="bg-white dark:bg-slate-800 border border-navy-100/50 dark:border-slate-700/50 rounded-2xl shadow-sm overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => toggleOpen(item.id)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-navy-50/20 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 pr-4">
                    <div className="w-9 h-9 rounded-xl bg-navy-50 dark:bg-slate-900 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="font-extrabold text-sm md:text-base text-navy-950 dark:text-slate-50 leading-snug">{item.question}</span>
                  </div>
                  <div className="text-navy-400 dark:text-slate-500 flex-shrink-0">
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {/* Answer Content */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100 border-t border-navy-100/30 dark:border-border/30' : 'max-h-0 opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="p-6 text-xs md:text-sm text-navy-600 dark:text-slate-300 leading-relaxed font-medium">
                    {item.answer}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </PublicLayout>
  );
};
