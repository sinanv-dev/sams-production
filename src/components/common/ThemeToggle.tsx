import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { themePreference, setThemePreference } = useTheme();

  const cycleTheme = () => {
    if (themePreference === 'light') {
      setThemePreference('dark');
    } else if (themePreference === 'dark') {
      setThemePreference('system');
    } else {
      setThemePreference('light');
    }
  };

  const getIcon = () => {
    switch (themePreference) {
      case 'light':
        return <Sun size={18} className="text-amber-500 animate-spin-slow" />;
      case 'dark':
        return <Moon size={18} className="text-blue-400" />;
      case 'system':
        return <Monitor size={18} className="text-muted-foreground dark:text-slate-400" />;
    }
  };

  const getLabel = () => {
    switch (themePreference) {
      case 'light':
        return 'Light Mode';
      case 'dark':
        return 'Dark Mode';
      case 'system':
        return 'System Mode';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      type="button"
      title={`Active: ${getLabel()} (Click to switch)`}
      className="p-2.5 rounded-xl border border-navy-100 hover:border-navy-200 bg-white hover:bg-navy-50 text-muted-foreground transition-all duration-300 flex items-center justify-center shadow-sm relative group dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700/50 dark:text-slate-200"
    >
      <div className="transition-transform duration-300 group-active:scale-90 flex items-center justify-center">
        {getIcon()}
      </div>
      
      {/* Tooltip */}
      <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-200 bg-navy-950 dark:bg-slate-950 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap z-50">
        {getLabel()}
      </span>
    </button>
  );
};
