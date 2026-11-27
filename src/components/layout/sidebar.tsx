'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import {
  Home,
  ListChecks,
  NotebookPen,
  CalendarDays,
  CalendarClock,
  WandSparkles,
  TimerReset,
  BellRing,
  ChartNoAxesColumnIncreasing,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from 'lucide-react';

interface SidebarProps {
  onQuickAdd?: () => void;
  unreadCount?: number;
}

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export function Sidebar({
  onQuickAdd,
  unreadCount = 0,
}: SidebarProps) {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const { theme } = useTheme();

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const savedState = window.localStorage.getItem(
      'daily_sidebar_collapsed'
    );

    if (savedState === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const nextState = !isCollapsed;

    setIsCollapsed(nextState);

    window.localStorage.setItem(
      'daily_sidebar_collapsed',
      String(nextState)
    );
  };

  const navigationItems: NavigationItem[] = [
    {
      href: '/dashboard',
      label: t('nav.overview'),
      icon: Home,
    },
    {
      href: '/tasks',
      label: t('nav.tasks'),
      icon: ListChecks,
    },
    {
      href: '/notes',
      label: t('nav.notes'),
      icon: NotebookPen,
    },
    {
      href: '/calendar',
      label: t('nav.calendar'),
      icon: CalendarDays,
    },
    {
      href: '/schedule',
      label: t('nav.schedule'),
      icon: CalendarClock,
    },
    {
      href: '/planner',
      label: t('nav.planner'),
      icon: WandSparkles,
    },
    {
      href: '/focus',
      label: t('nav.focus'),
      icon: TimerReset,
    },
    {
      href: '/notifications',
      label: t('nav.notifications'),
      icon: BellRing,
      badge: unreadCount,
    },
    {
      href: '/progress',
      label: t('nav.progress'),
      icon: ChartNoAxesColumnIncreasing,
    },
    {
      href: '/settings',
      label: t('nav.settings'),
      icon: SlidersHorizontal,
    },
  ];

  return (
    <aside
      className={[
        'sticky top-0 z-30 hidden h-screen shrink-0 flex-col',
        'bg-[var(--surface)]',
        'transition-[width] duration-300 ease-in-out',
        'md:flex',
        isCollapsed ? 'w-[76px]' : 'w-64',
      ].join(' ')}
    >
      <div className="flex h-full flex-col px-3 py-5">
        <div
          className={[
            'mb-8 flex items-center',
            isCollapsed
              ? 'justify-center'
              : 'justify-between px-1',
          ].join(' ')}
        >
          <Link
            href="/dashboard"
            className="flex min-w-0 items-center gap-3"
            title="DAILY"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--foreground)] text-lg font-bold text-[var(--background)]">
              D
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-base font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  DAILY
                </p>

                <p className="truncate text-[10px] text-[var(--muted-foreground)]">
                  {locale === 'es'
                    ? 'Agenda universitaria'
                    : 'University planner'}
                </p>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title={
                locale === 'es'
                  ? 'Ocultar menú lateral'
                  : 'Collapse sidebar'
              }
              aria-label={
                locale === 'es'
                  ? 'Ocultar menú lateral'
                  : 'Collapse sidebar'
              }
              className="rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {isCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            title={
              locale === 'es'
                ? 'Mostrar menú lateral'
                : 'Expand sidebar'
            }
            aria-label={
              locale === 'es'
                ? 'Mostrar menú lateral'
                : 'Expand sidebar'
            }
            className="mb-7 self-center rounded-lg p-2 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}

        {onQuickAdd && (
          <button
            type="button"
            onClick={onQuickAdd}
            title={
              isCollapsed
                ? t('tasks.newTask')
                : undefined
            }
            className={[
              'mb-8 flex items-center justify-center gap-2',
              'rounded-xl bg-[var(--foreground)]',
              'text-xs font-semibold text-[var(--background)]',
              'transition hover:opacity-80',
              isCollapsed
                ? 'mx-auto h-10 w-10'
                : 'w-full px-4 py-3',
            ].join(' ')}
          >
            <Plus className="h-4 w-4 shrink-0" />

            {!isCollapsed && (
              <span>{t('tasks.newTask')}</span>
            )}
          </button>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={[
                  'relative flex items-center rounded-xl',
                  'transition-all duration-200',
                  isCollapsed
                    ? 'justify-center px-3 py-3'
                    : 'gap-3 px-3 py-2.5',
                  isActive
                    ? 'bg-[var(--primary-light)] font-semibold text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]',
                ].join(' ')}
              >
                <Icon
                  className={[
                    'h-[18px] w-[18px] shrink-0',
                    isActive
                      ? 'stroke-[2.2px]'
                      : 'stroke-[1.8px]',
                  ].join(' ')}
                />

                {!isCollapsed && (
                  <span className="truncate text-sm">
                    {item.label}
                  </span>
                )}

                {!isCollapsed &&
                  item.badge !== undefined &&
                  item.badge > 0 && (
                    <span className="ml-auto rounded-full bg-[var(--danger)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}

                {isCollapsed &&
                  item.badge !== undefined &&
                  item.badge > 0 && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface)]" />
                  )}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/settings"
          title={
            isCollapsed
              ? locale === 'es'
                ? 'Tema actual'
                : 'Current theme'
              : undefined
          }
          className={[
            'mt-5 flex items-center rounded-xl',
            'pt-4 text-[var(--muted-foreground)]',
            isCollapsed
              ? 'justify-center'
              : 'justify-between px-2',
          ].join(' ')}
        >
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />

            {!isCollapsed && (
              <span className="text-xs font-medium capitalize text-[var(--foreground)]">
                {theme}
              </span>
            )}
          </span>

          {!isCollapsed && (
            <SlidersHorizontal className="h-3.5 w-3.5" />
          )}
        </Link>
      </div>
    </aside>
  );
}