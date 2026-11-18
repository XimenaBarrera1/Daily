'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import {
  Compass,
  CheckCircle2,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Timer,
  Bell,
  BarChart3,
  Settings,
  Plus,
  Palette,
} from 'lucide-react';

interface SidebarProps {
  onQuickAdd?: () => void;
  unreadCount?: number;
}

export function Sidebar({ onQuickAdd, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const { theme } = useTheme();

  const academicItems = [
    { href: '/dashboard', label: t('nav.overview'), icon: Compass },
    { href: '/tasks', label: t('nav.tasks'), icon: CheckCircle2 },
    { href: '/notes', label: t('nav.notes'), icon: BookOpen },
    { href: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { href: '/schedule', label: t('nav.schedule'), icon: Clock },
  ];

  const focusItems = [
    { href: '/planner', label: t('nav.planner'), icon: Sparkles },
    { href: '/focus', label: t('nav.focus'), icon: Timer },
    { href: '/notifications', label: t('nav.notifications'), icon: Bell, badge: unreadCount },
    { href: '/progress', label: t('nav.progress'), icon: BarChart3 },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[var(--surface)] border-r border-[var(--border)] h-screen sticky top-0 p-5 select-none z-20 transition-colors duration-200">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] flex items-center justify-center text-white font-extrabold text-lg shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
          D
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg text-[var(--foreground)] tracking-tight leading-none">
              DAILY
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--primary)] bg-[var(--primary-light)] px-1.5 py-0.5 rounded-md">
              v2.0
            </span>
          </div>
          <span className="text-[10px] text-[var(--muted-foreground)] font-medium leading-none block mt-1">
            {locale === 'es' ? 'Espacio Universitario' : 'Student Workspace'}
          </span>
        </div>
      </div>

      {/* Quick Add Action Button */}
      {onQuickAdd && (
        <div className="mb-6">
          <button
            onClick={onQuickAdd}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-2xl text-xs font-semibold transition-all shadow-[var(--card-shadow)] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{t('tasks.newTask')}</span>
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-6 overflow-y-auto pr-1">
        {/* Academic Group */}
        <div>
          <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            {locale === 'es' ? 'Espacio Académico' : 'Academic Space'}
          </span>
          <div className="space-y-1">
            {academicItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--primary-light)] text-[var(--primary)] font-bold shadow-xs'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-[var(--primary)] stroke-[2.2px]' : 'text-[var(--muted-foreground)]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Productivity & Focus Group */}
        <div>
          <span className="block px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
            {locale === 'es' ? 'Enfoque & Hábitos' : 'Focus & Planning'}
          </span>
          <div className="space-y-1">
            {focusItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--primary-light)] text-[var(--primary)] font-bold shadow-xs'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-[var(--primary)] stroke-[2.2px]' : 'text-[var(--muted-foreground)]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span className="bg-[var(--danger)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Footer: Active Theme Pill */}
      <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)] px-2">
        <Link
          href="/settings"
          className="flex items-center justify-between p-2 rounded-xl hover:bg-[var(--surface-hover)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--primary)] shadow-xs" />
            <span className="text-[11px] font-medium text-[var(--foreground)] capitalize">
              {theme}
            </span>
          </div>
          <Palette className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
        </Link>
      </div>
    </aside>
  );
}
