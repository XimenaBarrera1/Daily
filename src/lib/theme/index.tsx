'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeStyle } from '@/types';
import { createClient } from '@/lib/supabase/client';

export interface ThemeInfo {
  id: ThemeStyle;
  nameEs: string;
  nameEn: string;
  descEs: string;
  descEn: string;
  primaryColor: string;
  accentColor: string;
  bgPreview: string;
  badgePreview: string;
}

const THEMES: ThemeInfo[] = [
  {
    id: 'minimal',
    nameEs: 'Minimal Studio',
    nameEn: 'Minimal Studio',
    descEs: 'Tranquilo y monoespaciado, con bordes discretos y espacio para concentrarte.',
    descEn: 'Quiet and monospaced, with sparse borders and room to focus.',
    primaryColor: '#6D44C2',
    accentColor: '#B89BF0',
    bgPreview: '#F9F7FD',
    badgePreview: 'bg-[#F3EEFC] text-[#6D44C2]',
  },
  {
    id: 'rose',
    nameEs: 'Rose & Plum',
    nameEn: 'Rose & Plum',
    descEs: 'Estilo editorial cálido, con paletas suaves para leer y escribir.',
    descEn: 'Warm editorial style with soft colors for reading and journaling.',
    primaryColor: '#BE4A8B',
    accentColor: '#F09BC6',
    bgPreview: '#FFF5FA',
    badgePreview: 'bg-[#FBE5F0] text-[#9B356F]',
  },
  {
    id: 'focus',
    nameEs: 'Focus Grid',
    nameEn: 'Focus Grid',
    descEs: 'Tablero Kanban compacto, fechas visibles y listas rápidas.',
    descEn: 'High-density Kanban with clear deadlines and quick checklists.',
    primaryColor: '#F077B5',
    accentColor: '#9690F4',
    bgPreview: '#11131F',
    badgePreview: 'bg-[#302943] text-[#F077B5]',
  },
];

// Apply the active tokens inline as well as through globals.css. This keeps a
// deployed theme change immediate even when a client has an older cached CSS file.
const THEME_TOKENS: Record<ThemeStyle, Record<string, string>> = {
  minimal: {
    '--background': '#F9F7FD', '--surface': '#FFFFFF', '--surface-secondary': '#F2ECFB', '--surface-hover': '#E9DEFA',
    '--foreground': '#23153C', '--muted-foreground': '#675385', '--border': '#E6DAFA', '--border-strong': '#CFC0E8',
    '--border-focus': '#6D44C2', '--primary': '#6D44C2', '--primary-hover': '#5532A0', '--primary-light': '#F3EEFC',
    '--primary-foreground': '#FFFFFF', '--accent': '#B89BF0', '--accent-soft': '#EDE5FA',
    '--primary-gradient': 'linear-gradient(135deg, #6D44C2 0%, #512E99 100%)',
    '--hero-gradient': 'linear-gradient(135deg, #6D44C2 0%, #8258DE 50%, #482390 100%)',
    '--success': '#238636', '--success-light': '#E6F4EA', '--success-soft': '#E6F4EA', '--success-border': '#86C994',
    '--warning': '#B45309', '--warning-light': '#FEF3C7', '--warning-soft': '#FEF3C7', '--warning-border': '#E7B448',
    '--danger': '#C53030', '--danger-light': '#FDE8E8', '--danger-soft': '#FDE8E8', '--danger-border': '#E5A0A0',
    '--card-shadow': '0 2px 10px -2px rgba(35, 21, 60, 0.05), 0 1px 3px rgba(35, 21, 60, 0.03)',
    '--card-shadow-hover': '0 12px 28px -4px rgba(35, 21, 60, 0.1), 0 4px 12px -2px rgba(35, 21, 60, 0.05)',
    '--shadow-card': '0 2px 10px -2px rgba(35, 21, 60, 0.05), 0 1px 3px rgba(35, 21, 60, 0.03)',
  },
  rose: {
    '--background': '#FFF5FA', '--surface': '#FFFCFE', '--surface-secondary': '#FBEAF3', '--surface-hover': '#F7DCEB',
    '--foreground': '#321629', '--muted-foreground': '#79556B', '--border': '#EED2E2', '--border-strong': '#D7A9C1',
    '--border-focus': '#BE4A8B', '--primary': '#BE4A8B', '--primary-hover': '#9B356F', '--primary-light': '#FBE5F0',
    '--primary-foreground': '#FFFFFF', '--accent': '#F09BC6', '--accent-soft': '#FCE8F2',
    '--primary-gradient': 'linear-gradient(135deg, #BE4A8B 0%, #8F326E 100%)',
    '--hero-gradient': 'linear-gradient(135deg, #F7D5E7 0%, #F4B7D4 50%, #D87AAA 100%)',
    '--success': '#238636', '--success-light': '#E6F4EA', '--success-soft': '#E6F4EA', '--success-border': '#86C994',
    '--warning': '#A84E0B', '--warning-light': '#FEF3C7', '--warning-soft': '#FEF3C7', '--warning-border': '#E7B448',
    '--danger': '#B42335', '--danger-light': '#FDE8E8', '--danger-soft': '#FDE8E8', '--danger-border': '#E5A0A0',
    '--card-shadow': '0 2px 10px -2px rgba(76, 31, 58, 0.06), 0 1px 3px rgba(76, 31, 58, 0.04)',
    '--card-shadow-hover': '0 12px 28px -4px rgba(76, 31, 58, 0.12), 0 4px 12px -2px rgba(76, 31, 58, 0.06)',
    '--shadow-card': '0 2px 10px -2px rgba(76, 31, 58, 0.06), 0 1px 3px rgba(76, 31, 58, 0.04)',
  },
  focus: {
    '--background': '#11131F', '--surface': '#1C1F30', '--surface-secondary': '#252A3F', '--surface-hover': '#333952',
    '--foreground': '#F6F3FF', '--muted-foreground': '#AAB0C5', '--border': '#393D54', '--border-strong': '#535873',
    '--border-focus': '#F077B5', '--primary': '#F077B5', '--primary-hover': '#E65B9F', '--primary-light': '#302943',
    '--primary-foreground': '#261020', '--accent': '#9690F4', '--accent-soft': '#292944',
    '--primary-gradient': 'linear-gradient(135deg, #F077B5 0%, #D75499 100%)',
    '--hero-gradient': 'linear-gradient(135deg, #292944 0%, #1C1F30 55%, #11131F 100%)',
    '--success': '#5CD6A0', '--success-light': '#173B32', '--success-soft': '#173B32', '--success-border': '#347E62',
    '--warning': '#F2C267', '--warning-light': '#45351B', '--warning-soft': '#45351B', '--warning-border': '#806331',
    '--danger': '#FF8B95', '--danger-light': '#48232D', '--danger-soft': '#48232D', '--danger-border': '#874650',
    '--card-shadow': '0 2px 10px -2px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.25)',
    '--card-shadow-hover': '0 12px 28px -4px rgba(0, 0, 0, 0.5), 0 4px 12px -2px rgba(0, 0, 0, 0.3)',
    '--shadow-card': '0 2px 10px -2px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.25)',
  },
};

const LEGACY_THEME_MAP: Record<string, ThemeStyle> = {
  minimal: 'minimal',
  rose: 'rose',
  focus: 'focus',
  dawn: 'rose',
  dusk: 'focus',
  sage: 'minimal',
  warm: 'minimal',
  slate: 'minimal',
  lavender: 'minimal',
  forest: 'minimal',
};

function normalizeTheme(value: unknown): ThemeStyle {
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_THEME_MAP, value)) {
    return LEGACY_THEME_MAP[value];
  }
  return 'minimal';
}

function applyTheme(theme: ThemeStyle) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  for (const [token, value] of Object.entries(THEME_TOKENS[theme])) {
    root.style.setProperty(token, value);
  }
  const themeColor = THEMES.find((item) => item.id === theme)?.bgPreview;
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColor && themeColorMeta) themeColorMeta.setAttribute('content', themeColor);
}

interface ThemeContextType {
  theme: ThemeStyle;
  setTheme: (theme: ThemeStyle) => Promise<void>;
  availableThemes: ThemeInfo[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'minimal',
  setTheme: async () => {},
  availableThemes: THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeStyle>('minimal');

  useEffect(() => {
    const savedTheme = normalizeTheme(localStorage.getItem('daily_theme'));
    setThemeState(savedTheme);
    applyTheme(savedTheme);
    localStorage.setItem('daily_theme', savedTheme);

    const fetchProfileTheme = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('theme')
            .eq('id', user.id)
            .single();

          if (data?.theme) {
            const profileTheme = normalizeTheme(data.theme);
            setThemeState(profileTheme);
            applyTheme(profileTheme);
            localStorage.setItem('daily_theme', profileTheme);
          }
        }
      } catch (err) {
        console.warn('Theme fetch note:', err);
      }
    };

    fetchProfileTheme();
  }, []);

  const setTheme = async (newTheme: ThemeStyle) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    localStorage.setItem('daily_theme', newTheme);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', user.id);
      }
    } catch (err) {
      console.warn('Could not save theme to profile:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
