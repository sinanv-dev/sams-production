import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, MessageCircle, Mail, Book, ChevronRight, ExternalLink } from 'lucide-react';

const faqs = [
  { q: 'How do I view rent payment status for my customers?', a: 'Go to Rent Management from the sidebar. You can filter by status (Paid, Pending, Overdue) and by month to track all payments.' },
  { q: 'Can I change electricity unit prices?', a: 'No. Electricity unit pricing is controlled by the system Admin. You can view bills and their amounts, but cannot modify the per-unit rate.' },
  { q: 'How do I update a complaint status?', a: 'Open Complaints from the sidebar, find the complaint and click "Update Progress". You can change the status and add your notes.' },
  { q: 'Where can I see all documents for my apartments?', a: 'Go to Documents from the sidebar. You will see all rental agreements and ID proofs submitted by your customers.' },
  { q: 'How do I check overall performance metrics?', a: 'Visit Reports & Analytics from the sidebar. It shows occupancy rate, rent collection rate, and a 6-month revenue trend.' },
  { q: 'What happens when a customer is assigned to my apartment?', a: 'You will receive a notification and can see the customer in the Customers section. Their rent payments will also appear in Rent Management.' },
];

export const OwnerHelp: React.FC = () => {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Help & Support</h1>
        <p className="text-muted-foreground text-sm font-medium mt-0.5">Everything you need to use the SAMS Owner Portal effectively.</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Book, label: 'User Guide', desc: 'Learn how to use all features', color: 'blue' },
          { icon: MessageCircle, label: 'Contact Admin', desc: 'Get help from the system admin', color: 'emerald' },
          { icon: Mail, label: 'Email Support', desc: 'support@sams.in', color: 'purple' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className={`bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer`}>
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
              color==='blue' ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400' :
              color==='emerald' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400' :
              'bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400'
            }`}><Icon size={20}/></div>
            <p className="text-sm font-bold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-base font-bold text-foreground">Frequently Asked Questions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Common questions from apartment owners</p>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-800">
          {faqs.map((faq, i) => (
            <details key={i} className="group p-5">
              <summary className="flex items-center justify-between cursor-pointer list-none">
                <span className="text-sm font-semibold text-foreground group-open:text-emerald-600 dark:group-open:text-emerald-400 transition-colors pr-4">{faq.q}</span>
                <ChevronRight size={16} className="text-slate-400 flex-shrink-0 group-open:rotate-90 transition-transform"/>
              </summary>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Contact Box */}
      <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <HelpCircle size={20}/>
          </div>
          <div>
            <h4 className="font-bold text-base">Still need help?</h4>
            <p className="text-emerald-100 text-sm mt-1">Contact our support team and we'll get back to you quickly.</p>
            <a href="mailto:support@sams.in" className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-white text-emerald-700 text-sm font-bold hover:bg-emerald-50 transition-colors">
              <Mail size={14}/> support@sams.in <ExternalLink size={12}/>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
