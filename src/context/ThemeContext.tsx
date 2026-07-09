import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { updateUserProfile } from '../firebase/db';

type Theme = 'light' | 'dark';
type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Load initial preference from localStorage or default to system
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('sams_theme_preference');
    return (saved as ThemePreference) || 'system';
  });

  const [theme, setTheme] = useState<Theme>('dark');

  // Resolve preference to actual theme (light or dark)
  useEffect(() => {
    if (themePreference === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      setTheme(systemTheme);
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setTheme(themePreference);
    }
  }, [themePreference]);

  // Synchronize preference from user profile on login
  useEffect(() => {
    if (user) {
      if (user.themePreference && user.themePreference !== themePreference) {
        // Preference exists in DB and is different from local state -> load it
        setThemePreferenceState(user.themePreference);
        localStorage.setItem('sams_theme_preference', user.themePreference);
      } else if (!user.themePreference) {
        // No preference in DB yet -> sync current local preference to DB
        updateUserProfile(user.uid, { themePreference }).catch(err => {
          console.error("Error syncing theme preference to database:", err);
        });
      }
    }
  }, [user]);

  // Apply dark mode class to HTML element and handle transitions
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Add smooth transition classes temporarily, or let Tailwind classes handle it
    root.classList.add('transition-colors', 'duration-300');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Function to change theme preference
  const setThemePreference = async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    localStorage.setItem('sams_theme_preference', pref);

    // If user logged in, update remote profile
    if (user) {
      try {
        await updateUserProfile(user.uid, { themePreference: pref });
      } catch (err) {
        console.error("Failed to update user profile theme preference:", err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
