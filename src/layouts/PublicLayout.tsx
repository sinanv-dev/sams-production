import React from 'react';
import { Link } from 'react-router-dom';
import { Building } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Footer } from '../components/common/Footer';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col transition-colors duration-300">
      {/* Navigation header */}
      <header className="bg-navbar/75 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-md shadow-brand-500/25">
              <Building size={18} className="text-white" />
            </div>
            <span className="font-black text-xl text-foreground tracking-tight">SAMS</span>
          </Link>

          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-bold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-all">
              Sign In
            </Link>
            <Link to="/register" className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-md shadow-brand-500/10">
              Create Account
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
