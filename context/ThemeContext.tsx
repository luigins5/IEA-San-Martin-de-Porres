import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { UserRole } from '../types';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper function to convert hex to an "R G B" string
function hexToRgb(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : null;
}

export const ThemeProvider = ({ children }: { children?: ReactNode }) => {
  const { user } = useAuth();
  const { globalSettings, campusSettings } = useData();
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') as Theme;
      if (storedTheme) {
        return storedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const applyCustomColors = () => {
      let settingsToApply: any = null;
      
      if (user?.role === UserRole.CAMPUS_ADMIN && user.campusId && campusSettings) {
          settingsToApply = campusSettings;
      }

      if (!settingsToApply && globalSettings) {
          settingsToApply = globalSettings;
      }

      const primaryColor = settingsToApply?.primaryColor || '#005A9C';
      const secondaryColor = settingsToApply?.secondaryColor || '#FDB813';
      
      const primaryRgb = hexToRgb(primaryColor);
      const secondaryRgb = hexToRgb(secondaryColor);

      if (primaryRgb && secondaryRgb) {
        const styleId = 'custom-theme-colors';
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
        }
        styleElement.innerHTML = `
          :root {
            --color-primary: ${primaryRgb};
            --color-secondary: ${secondaryRgb};
          }
        `;
      }
    };
    
    // Apply colors on initial load and when the user changes
    applyCustomColors();
  }, [user, globalSettings, campusSettings]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
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