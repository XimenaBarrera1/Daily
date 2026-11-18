'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { createClient } from '@/lib/supabase/client';
import { Bell, Globe, LogOut, User as UserIcon, Palette, Check, Sparkles } from 'lucide-react';

interface HeaderProps {
  title?: string;
  userName?: string;
  unreadCount?: number;
}

export function Header({ title, userName, unreadCount = 0 }: HeaderProps) {
  const { locale, setLocale, t, formatDate } = useI18n();
  const { theme, setTheme, availableThemes } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const router = useRouter();

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const handleLanguageToggle = async () => {
    const nextLocale = locale === 'es' ? 'en' : 'es';
    setLocale(nextLocale);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: nextLocale })
          .eq('id', user.id);
      }
    } catch {
      // Ignore background sync error
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth/login');
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const todayFormatted = currentDate
    ? formatDate(currentDate, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    : '';

  const activeThemeObj = availableThemes.find((t) => t.id === theme) || availableThemes[0];

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 select-none transition-colors duration-200">
      {/* Page Title & Date */}
      <div>
        <h1 className="text-base sm:text-lg font-bold text-[var(--foreground)] tracking-tight flex items-center gap-2">
          <span>{title || t('app.name')}</span>
        </h1>
        {todayFormatted && (
          <p className="text-[11px] text-[var(--muted-foreground)] capitalize hidden sm:block">
            {todayFormatted}
          </p>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Interactive Visual Theme Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setThemeOpen(!themeOpen);
              setProfileOpen(false);
            }}
            className="flex items-center gap-2 py-1.5 px-3 rounded-full text-xs font-semibold bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] transition-all shadow-xs"
            title={locale === 'es' ? 'Personalizar estilo visual' : 'Customize theme'}
          >
            <span
              className="w-3 h-3 rounded-full shadow-xs border border-black/10 shrink-0"
              style={{ backgroundColor: activeThemeObj.primaryColor }}
            />
            <span className="hidden sm:inline text-[11px]">
              {locale === 'es' ? activeThemeObj.nameEs : activeThemeObj.nameEn}
            </span>
            <Palette className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          </button>

          {themeOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between px-2.5 py-1.5 mb-1.5 border-b border-[var(--border)]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5">
                  <Palette className="w-3 h-3 text-[var(--primary)]" />
                  {locale === 'es' ? 'Estilos Visuales' : 'Visual Themes'}
                </span>
                <span className="text-[9px] bg-[var(--primary-light)] text-[var(--primary)] px-1.5 py-0.5 rounded-md font-bold">
                  DAILY
                </span>
              </div>

              <div className="space-y-1">
                {availableThemes.map((thm) => {
                  const isActive = theme === thm.id;
                  return (
                    <button
                      key={thm.id}
                      onClick={() => {
                        setTheme(thm.id);
                        setThemeOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                        isActive
                          ? 'bg-[var(--primary-light)] text-[var(--primary)] font-bold shadow-xs'
                          : 'hover:bg-[var(--surface-hover)] text-[var(--foreground)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10 shadow-xs shrink-0"
                          style={{ backgroundColor: thm.primaryColor }}
                        />
                        <div>
                          <p className="text-xs font-semibold leading-tight">
                            {locale === 'es' ? thm.nameEs : thm.nameEn}
                          </p>
                          <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">
                            {locale === 'es' ? thm.descEs : thm.descEn}
                          </p>
                        </div>
                      </div>

                      {isActive && <Check className="w-4 h-4 text-[var(--primary)] shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Language Selector Button */}
        <button
          onClick={handleLanguageToggle}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-[var(--border)] bg-[var(--surface)] transition-all shadow-xs"
          title={locale === 'es' ? 'Switch to English' : 'Cambiar a Español'}
        >
          <Globe className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
          <span>{locale.toUpperCase()}</span>
        </button>

        {/* Notifications Bell */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border)] transition-all"
          title={t('nav.notifications')}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface)]" />
          )}
        </Link>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setThemeOpen(false);
            }}
            className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-full text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-[var(--border)] bg-[var(--surface)] transition-all shadow-xs"
          >
            <div className="w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xs shadow-xs">
              {(userName || 'D')[0].toUpperCase()}
            </div>
            <span className="max-w-[100px] truncate hidden md:inline font-semibold">
              {userName || 'DAILY'}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-[var(--border)] mb-1">
                <p className="text-xs font-bold text-[var(--foreground)] truncate">
                  {userName || 'Estudiante'}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]">DAILY Workspace</p>
              </div>

              <Link
                href="/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                <span>{t('nav.settings')}</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t('nav.signOut')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
