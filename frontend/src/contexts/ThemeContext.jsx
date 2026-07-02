import { useLayoutEffect, useMemo, useState } from 'react';
import { ThemeContext } from './theme-context';

const THEME_STORAGE_KEY = 'korvix-gym:theme';
const DARK_THEME_COLOR = '#0c0f14';
const LIGHT_THEME_COLOR = '#f6f8fa';

function getInitialTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyDocumentTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useLayoutEffect(() => {
    applyDocumentTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // O tema continua funcionando na sessão mesmo sem armazenamento.
    }
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    dark: theme === 'dark',
    setTheme,
    toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
