import React from 'react';
import { Link } from 'react-router-dom';
import { Building, Mail, Phone, MapPin, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-950 text-slate-350 dark:bg-slate-950 dark:text-slate-400 border-t border-navy-900 dark:border-slate-800 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-16">
        
        {/* Footer Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-navy-900/60 dark:border-slate-800/60">
          
          {/* Column 1: Company */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/mission" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Our Mission</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Contact Us</Link>
              </li>
              <li className="text-slate-500 dark:text-slate-650 flex items-center space-x-1.5 cursor-not-allowed">
                <span>Careers</span>
                <span className="text-[9px] font-bold bg-navy-900 text-brand-400 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-navy-800 dark:border-slate-800">Soon</span>
              </li>
            </ul>
          </div>

          {/* Column 2: Platform */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/apartments" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Find Apartments</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Customer Portal</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Owner Portal</Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Features</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/help" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Help Center</Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">FAQ</Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Report an Issue</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Support Email</Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/privacy" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Terms & Conditions</Link>
              </li>
              <li>
                <Link to="/refund" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Refund Policy</Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-brand-400 dark:hover:text-brand-400 transition-colors">Cookie Policy</Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Contact Information */}
          <div className="space-y-4">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">Contact Us</h4>
            <ul className="space-y-3.5 text-xs">
              <li className="flex items-start space-x-2.5">
                <Mail size={16} className="text-brand-500 mt-0.5 flex-shrink-0" />
                <a href="mailto:support@sams.in" className="hover:text-brand-400 transition-colors break-all">support@sams.in</a>
              </li>
              <li className="flex items-center space-x-2.5">
                <Phone size={16} className="text-brand-500 flex-shrink-0" />
                <span className="text-slate-450">Phone: Coming Soon</span>
              </li>
              <li className="flex items-start space-x-2.5">
                <MapPin size={16} className="text-brand-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-450">Address: Available Soon</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom Bar */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500 dark:text-slate-650">
          <div className="flex items-center space-x-2">
            <Building size={16} className="text-brand-500" />
            <span>&copy; 2026 SAMS - Smart Apartment Management System. All Rights Reserved.</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/privacy" className="hover:text-brand-400 transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link to="/terms" className="hover:text-brand-400 transition-colors">Terms & Conditions</Link>
            <span>|</span>
            <Link to="/contact" className="hover:text-brand-400 transition-colors">Contact Us</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
