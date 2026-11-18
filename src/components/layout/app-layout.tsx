'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { QuickAddTaskDialog } from '../modals/quick-add-task-dialog';
import { QuickAddEventDialog } from '../modals/quick-add-event-dialog';
import { createClient } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n';
import { AlertCircle, Download } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { t } = useI18n();
  const [userName, setUserName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isKeysMissing, setIsKeysMissing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if Supabase keys are default/missing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      setIsKeysMissing(true);
    }

    // Capture PWA install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Load user profile & unread notification count
    const loadUserData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

          if (profile?.full_name) {
            setUserName(profile.full_name);
          } else if (user.email) {
            setUserName(user.email.split('@')[0]);
          }

          // Unread notifications count
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

          setUnreadCount(count || 0);
        }
      } catch (err) {
        console.error('Error loading app user data:', err);
      }
    };

    loadUserData();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-[var(--background)] flex flex-row text-[var(--foreground)] transition-colors duration-200"
    >
      {/* Desktop Sidebar */}
      <Sidebar
        onQuickAdd={() => setIsTaskModalOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        {/* Top Header */}
        <Header
          title={title}
          userName={userName}
          unreadCount={unreadCount}
        />

        {/* Missing Keys Setup Banner */}
        {isKeysMissing && (
          <div className="bg-[var(--warning-soft)] border-b border-[var(--warning-border)] px-4 py-2.5 text-xs text-[var(--warning)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[var(--warning)]" />
              <span>
                <strong>Modo Configuración:</strong> Conecta tus credenciales de Supabase en <code>.env.local</code> para habilitar la persistencia y autenticación en la nube.
              </span>
            </div>
            <a
              href="/settings"
              className="underline font-semibold hover:opacity-80 shrink-0 ml-2"
            >
              Ver guía
            </a>
          </div>
        )}

        {/* PWA Install Banner (Desktop/Mobile) */}
        {deferredPrompt && (
          <div className="bg-[var(--primary-light)] border-b border-[var(--border)] px-4 py-2 text-xs text-[var(--foreground)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-[var(--primary)]" />
              <span>{t('pwa.installDesc')}</span>
            </div>
            <button
              onClick={handleInstallClick}
              className="bg-[var(--primary)] text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              {t('pwa.installButton')}
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Global Quick Add Modals */}
      <QuickAddTaskDialog
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={() => {
          // Trigger a window refresh event so views reload their data
          window.dispatchEvent(new CustomEvent('tempo:data-updated'));
        }}
      />
      <QuickAddEventDialog
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventCreated={() => {
          window.dispatchEvent(new CustomEvent('tempo:data-updated'));
        }}
      />
    </div>
  );
}
