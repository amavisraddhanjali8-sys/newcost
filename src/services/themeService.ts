/**
 * Theme Management Service
 * Supports: 'light' | 'blue-night' | 'black' | 'red' | 'forest' | 'cream'
 */

export type ThemeMode =
  | 'light'
  | 'blue-night'
  | 'black'
  | 'red'
  | 'forest'
  | 'cream'
  | 'dark'
  | 'system';

export interface ThemeOption {
  id: ThemeMode;
  label: string;
  shortLabel: string;
  isDark: boolean;
  swatch: string;
  bgHex: string;
  accentHex: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'light',
    label: 'Day Shift Light',
    shortLabel: 'Light',
    isDark: false,
    swatch: '#ffffff',
    bgHex: '#ffffff',
    accentHex: '#003049'
  },
  {
    id: 'blue-night',
    label: 'Blue Night',
    shortLabel: 'Night',
    isDark: true,
    swatch: '#0a192f',
    bgHex: '#070f20',
    accentHex: '#38bdf8'
  },
  {
    id: 'black',
    label: 'OLED Black',
    shortLabel: 'Black',
    isDark: true,
    swatch: '#000000',
    bgHex: '#050505',
    accentHex: '#f8fafc'
  },
  {
    id: 'red',
    label: 'Crimson Night',
    shortLabel: 'Red',
    isDark: true,
    swatch: '#1f060a',
    bgHex: '#150306',
    accentHex: '#f43f5e'
  },
  {
    id: 'forest',
    label: 'Forest Night',
    shortLabel: 'Forest',
    isDark: true,
    swatch: '#051b11',
    bgHex: '#04140c',
    accentHex: '#10b981'
  },
  {
    id: 'cream',
    label: 'Executive Cream',
    shortLabel: 'Cream',
    isDark: false,
    swatch: '#fdf6e7',
    bgHex: '#f9f3e5',
    accentHex: '#78350f'
  }
];

const THEME_STORAGE_KEY = 'fxtt_theme_mode';

function resolveEffectiveMode(mode: ThemeMode): ThemeMode {
  if (mode === 'dark') return 'blue-night';
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'blue-night';
    }
    return 'light';
  }
  return mode;
}

/**
 * Reads the currently stored theme preference, defaults to 'light'
 */
export function getStoredThemeMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
    if (saved && (saved === 'dark' || saved === 'system' || THEME_OPTIONS.some((t) => t.id === saved))) {
      return saved;
    }
  } catch (e) {
    console.warn('Unable to read theme from localStorage', e);
  }
  return 'light';
}

/**
 * Determines whether dark mode is currently effective for the given theme
 */
export function isDarkEffective(mode: ThemeMode = getStoredThemeMode()): boolean {
  const resolved = resolveEffectiveMode(mode);
  const opt = THEME_OPTIONS.find((t) => t.id === resolved);
  return opt ? opt.isDark : false;
}

/**
 * Applies the theme classes and attributes on document.documentElement
 */
export function applyThemeToDocument(mode: ThemeMode = getStoredThemeMode()): void {
  if (typeof document === 'undefined') return;

  const resolved = resolveEffectiveMode(mode);
  const root = document.documentElement;
  const opt = THEME_OPTIONS.find((t) => t.id === resolved) || THEME_OPTIONS[0];

  // Remove all previous theme classes
  THEME_OPTIONS.forEach((t) => {
    root.classList.remove(`theme-${t.id}`);
  });

  // Apply new theme class
  root.classList.add(`theme-${opt.id}`);

  // Apply or remove generic Tailwind 'dark' class
  if (opt.isDark) {
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.style.colorScheme = 'light';
  }

  // Dispatch custom event for subscribers
  window.dispatchEvent(
    new CustomEvent('fxtt-theme-changed', {
      detail: { mode: opt.id, isDark: opt.isDark }
    })
  );
}

/**
 * Persists theme selection to localStorage and updates DOM
 */
export function setStoredThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (e) {
    console.warn('Unable to save theme to localStorage', e);
  }
  applyThemeToDocument(mode);
}

/**
 * Initialize theme listener on window startup
 */
export function initThemeListener(): () => void {
  const current = getStoredThemeMode();
  applyThemeToDocument(current);
  return () => {};
}
