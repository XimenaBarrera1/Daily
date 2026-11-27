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
  document.documentElement.setAttribute('data-theme', theme);
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
