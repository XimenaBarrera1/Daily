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
    id: 'dawn',
    nameEs: 'Amanecer Rosa',
    nameEn: 'Pink Dawn',
    descEs: 'Degradado vibrante de rosas y magentas con toques de cristal',
    descEn: 'Vibrant gradient of pinks and magentas with glass touches',
    primaryColor: '#D946EF',
    accentColor: '#F472B6',
    bgPreview: '#FDF2F8',
    badgePreview: 'bg-[#FCE7F3] text-[#D946EF]',
  },
  {
    id: 'dusk',
    nameEs: 'Atardecer Oscuro',
    nameEn: 'Dark Dusk',
    descEs: 'Azul marino profundo con acentos de magenta y atardecer',
    descEn: 'Deep navy blue with magenta and sunset accents',
    primaryColor: '#F472B6',
    accentColor: '#818CF8',
    bgPreview: '#0F111A',
    badgePreview: 'bg-[#312E81] text-[#F472B6]',
  },
  {
    id: 'sage',
    nameEs: 'Matcha & Salvia',
    nameEn: 'Matcha & Sage',
    descEs: 'Verde sereno y orgánico para concentración zen',
    descEn: 'Serene organic green for calm focus',
    primaryColor: '#2E6B47',
    accentColor: '#95D5B2',
    bgPreview: '#F6F9F6',
    badgePreview: 'bg-[#E5F2E8] text-[#2E6B47]',
  },
  {
    id: 'warm',
    nameEs: 'Café Moka & Pergamino',
    nameEn: 'Espresso & Library',
    descEs: 'Tonos avellana cálidos y papel pergamino',
    descEn: 'Warm hazelnut and old book parchment',
    primaryColor: '#8C532B',
    accentColor: '#DDB892',
    bgPreview: '#FAF7F2',
    badgePreview: 'bg-[#F8EFE6] text-[#8C532B]',
  },
  {
    id: 'slate',
    nameEs: 'Pizarra Nórdica',
    nameEn: 'Nordic Slate',
    descEs: 'Carbón y grafito minimalista de alta precisión',
    descEn: 'Minimalist high-precision graphite & stone',
    primaryColor: '#1E293B',
    accentColor: '#94A3B8',
    bgPreview: '#F8FAFC',
    badgePreview: 'bg-[#F1F5F9] text-[#1E293B]',
  },
  {
    id: 'lavender',
    nameEs: 'Lavanda & Amatista',
    nameEn: 'Lavender & Amethyst',
    descEs: 'Violeta suave para estudio creativo y lectura',
    descEn: 'Soft purple for creative study and reading',
    primaryColor: '#6D44C2',
    accentColor: '#B89BF0',
    bgPreview: '#F9F7FD',
    badgePreview: 'bg-[#F3EEFC] text-[#6D44C2]',
  },
  {
    id: 'forest',
    nameEs: 'Índigo Universitario',
    nameEn: 'Indigo Campus',
    descEs: 'Azul cobalto universitario clásico y estructurado',
    descEn: 'Classic academic cobalt blue and structured ivory',
    primaryColor: '#1D4ED8',
    accentColor: '#85B5F8',
    bgPreview: '#F6F9FD',
    badgePreview: 'bg-[#EDF4FE] text-[#1D4ED8]',
  },
];

interface ThemeContextType {
  theme: ThemeStyle;
  setTheme: (theme: ThemeStyle) => Promise<void>;
  availableThemes: ThemeInfo[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dawn',
  setTheme: async () => {},
  availableThemes: THEMES,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeStyle>('dawn');

  useEffect(() => {
    const saved = localStorage.getItem('daily_theme') as ThemeStyle;
    
    if (saved && THEMES.some((t) => t.id === saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      setThemeState('dawn');
      document.documentElement.setAttribute('data-theme', 'dawn');
      localStorage.setItem('daily_theme', 'dawn');
    }

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

          if (data?.theme && THEMES.some((t) => t.id === data.theme)) {
            setThemeState(data.theme as ThemeStyle);
            document.documentElement.setAttribute('data-theme', data.theme);
            localStorage.setItem('daily_theme', data.theme);
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
    document.documentElement.setAttribute('data-theme', newTheme);
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