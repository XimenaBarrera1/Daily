'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { QuickAddTaskDialog } from '../modals/quick-add-task-dialog';
import { QuickAddEventDialog } from '../modals/quick-add-event-dialog';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [userName, setUserName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isKeysMissing, setIsKeysMissing] = useState(false);

  useEffect(() => {
    // Check if Supabase keys are default/missing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      setIsKeysMissing(true);
    }

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
  }, []);

  useEffect(() => {
    let isProcessing = false;
    const processDueReminders = async () => {
      if (isProcessing || document.visibilityState === 'hidden') return;

      const lockKey = 'tempo:local-reminder-check';
      const now = Date.now();
      if (Number(localStorage.getItem(lockKey) || 0) > now) return;

      const lockUntil = String(now + 20000);
      localStorage.setItem(lockKey, lockUntil);
      isProcessing = true;

      try {
        const response = await fetch('/api/reminders/process', { method: 'POST' });
        if (!response.ok) return;

        const result = await response.json();
        if (result.sent > 0) {
          window.dispatchEvent(new CustomEvent('tempo:data-updated'));
        }
        if (result.failed > 0) {
          window.dispatchEvent(new CustomEvent('tempo:reminder-failed'));
        }
      } catch (error) {
        console.warn('Local reminder check failed:', error);
      } finally {
        isProcessing = false;
        if (localStorage.getItem(lockKey) === lockUntil) {
          localStorage.removeItem(lockKey);
        }
      }
    };

    void processDueReminders();
    const interval = window.setInterval(processDueReminders, 15000);
    return () => window.clearInterval(interval);
  }, []);

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
