'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import {
  Compass,
  CheckCircle2,
  BookOpen,
  Calendar,
  Sparkles,
  Timer,
  Settings,
} from 'lucide-react';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: '/dashboard', label: t('nav.overview'), icon: Compass },
    { href: '/tasks', label: t('nav.tasks'), icon: CheckCircle2 },
    { href: '/notes', label: t('nav.notes'), icon: BookOpen },
    { href: '/calendar', label: t('nav.calendar'), icon: Calendar },
    { href: '/planner', label: t('nav.planner'), icon: Sparkles },
    { href: '/focus', label: t('nav.focus'), icon: Timer },
    { href: '/settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] px-1 py-1.5 flex items-center justify-around z-30 select-none pb-safe transition-colors duration-200">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-colors min-w-[46px] ${
              isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
            <span className={`text-[9px] mt-0.5 tracking-tight ${isActive ? 'font-semibold' : 'font-normal'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
