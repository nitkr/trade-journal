import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeColors {
  // Chart colors optimized for WCAG AA contrast
  chartGreen: string;
  chartRed: string;
  chartGreenFill: string;
  chartRedFill: string;
  chartBlue: string;
  chartOrange: string;
  chartPurple: string;
  chartTeal: string;
  chartGrid: string;
  chartText: string;
  chartTooltipBg: string;
  chartTooltipBorder: string;
}

const lightThemeColors: ThemeColors = {
  chartGreen: '#16a34a',
  chartRed: '#dc2626',
  chartGreenFill: 'rgba(22, 163, 74, 0.3)',
  chartRedFill: 'rgba(220, 38, 38, 0.3)',
  chartBlue: '#2563eb',
  chartOrange: '#ea580c',
  chartPurple: '#7c3aed',
  chartTeal: '#0d9488',
  chartGrid: '#e5e7eb',
  chartText: '#374151',
  chartTooltipBg: '#ffffff',
  chartTooltipBorder: '#e5e7eb',
};

const darkThemeColors: ThemeColors = {
  chartGreen: '#22c55e',
  chartRed: '#ef4444',
  chartGreenFill: 'rgba(34, 197, 94, 0.25)',
  chartRedFill: 'rgba(239, 68, 68, 0.25)',
  chartBlue: '#3b82f6',
  chartOrange: '#f97316',
  chartPurple: '#a855f7',
  chartTeal: '#14b8a6',
  chartGrid: '#334155',
  chartText: '#e2e8f0',
  chartTooltipBg: '#1e293b',
  chartTooltipBorder: '#334155',
};

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  colors: ThemeColors;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'trade-journal-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(getStoredTheme()));
  const [colors, setColors] = useState<ThemeColors>(resolveTheme(getStoredTheme()) === 'dark' ? darkThemeColors : lightThemeColors);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    setColors(resolved === 'dark' ? darkThemeColors : lightThemeColors);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newResolved = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolved);
        setColors(newResolved === 'dark' ? darkThemeColors : lightThemeColors);
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, colors, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}