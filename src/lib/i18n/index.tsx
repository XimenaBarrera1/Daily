'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import esMessages from '../../../messages/es.json';
import enMessages from '../../../messages/en.json';
import { Language, TimeFormat, DateFormat } from '@/types';

type MessagesType = typeof esMessages;

interface I18nContextType {
  locale: Language;
  setLocale: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (timeOrDate: Date | string | null | undefined, timeFormat?: TimeFormat) => string;
  formatDateTime: (date: Date | string | null | undefined) => string;
}

const dictionaries: Record<Language, any> = {
  es: esMessages,
  en: enMessages,
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'tempo_preferred_language';

export function I18nProvider({ 
  children, 
  initialLocale 
}: { 
  children: ReactNode; 
  initialLocale?: Language;
}) {
  const [locale, setLocaleState] = useState<Language>(initialLocale || 'es');

  useEffect(() => {
    // Check saved preference in localStorage or browser language
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (saved && (saved === 'es' || saved === 'en')) {
        setLocaleState(saved);
      } else {
        const browserLang = navigator.language.slice(0, 2);
        if (browserLang === 'en') {
          setLocaleState('en');
        } else {
          setLocaleState('es');
        }
      }
    } catch {
      // Fallback
      setLocaleState('es');
    }
  }, []);

  const setLocale = (lang: Language) => {
    setLocaleState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch (e) {
      console.error('Failed to save language to localStorage', e);
    }
  };

  const t = (path: string, params?: Record<string, string | number>): string => {
    const keys = path.split('.');
    let current = dictionaries[locale] || dictionaries['es'];

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to Spanish if key not found
        let fallback = dictionaries['es'];
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = fallback[fbKey];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== 'string') {
      return path;
    }

    let result = current;
    if (params) {
      for (const [paramKey, val] of Object.entries(params)) {
        result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(val));
      }
    }

    return result;
  };

  const formatDate = (date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string => {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', options || {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch {
      return '';
    }
  };

  const formatTime = (timeOrDate: Date | string | null | undefined, formatPreference: TimeFormat = '12h'): string => {
    if (!timeOrDate) return '';
    try {
      if (typeof timeOrDate === 'string' && timeOrDate.includes(':') && !timeOrDate.includes('T') && !timeOrDate.includes('Z')) {
        // It's a "HH:MM" or "HH:MM:SS" time string
        const [h, m] = timeOrDate.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return timeOrDate;
        if (formatPreference === '24h') {
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        }
        const period = h >= 12 ? (locale === 'es' ? 'PM' : 'PM') : (locale === 'es' ? 'AM' : 'AM');
        const hour12 = h % 12 || 12;
        return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
      }

      const d = typeof timeOrDate === 'string' ? new Date(timeOrDate) : timeOrDate;
      if (isNaN(d.getTime())) return '';

      return new Intl.DateTimeFormat(locale === 'es' ? 'es-ES' : 'en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: formatPreference === '12h',
      }).format(d);
    } catch {
      return '';
    }
  };

  const formatDateTime = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const formattedDate = formatDate(date, { month: 'short', day: 'numeric' });
    const formattedTime = formatTime(date);
    return `${formattedDate}, ${formattedTime}`;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, formatDate, formatTime, formatDateTime }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
