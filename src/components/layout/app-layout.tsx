'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { BottomNav } from './bottom-nav';
import { QuickAddTaskDialog } from '../modals/quick-add-task-dialog';
import { QuickAddEventDialog } from '../modals/quick-add-event-dialog';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle } from 'lucide-react';
import { showLocalNotification } from '@/lib/push/client';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

function isWithinQuietHours(time: string, quietStart?: string | null, quietEnd?: string | null) {
  if (!quietStart || !quietEnd) return false;
  return quietStart > quietEnd
    ? time >= quietStart || time <= quietEnd
    : time >= quietStart && time <= quietEnd;
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
    let isCheckingNotifications = false;
    let activeUserId: string | null = null;
    let cachedProfileSettings: {
      pushRemindersEnabled: boolean;
      quietHoursStart: string | null;
      quietHoursEnd: string | null;
      timezone: string;
      cachedAt: number;
    } | null = null;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      activeUserId = session?.user.id ?? null;
    });
    const initialUserLoad = supabase.auth.getUser().then(({ data: { user } }) => {
      activeUserId = user?.id ?? null;
    });

    const checkNotifications = async () => {
      if (isCheckingNotifications) return;

      const lockKey = 'tempo:notification-poll-lock';
      const startedAt = Date.now();
      if (Number(localStorage.getItem(lockKey) || 0) > startedAt) return;
      const lockValue = String(startedAt + 10000);
      localStorage.setItem(lockKey, lockValue);
      isCheckingNotifications = true;

      try {
        await initialUserLoad;
        const userId = activeUserId;
        if (!userId) return;

        const cursorKey = `tempo:notification-cursor:${userId}`;
        const seenKey = `tempo:notification-seen:${userId}`;
        const storedCursor = localStorage.getItem(cursorKey);
        const cursor = storedCursor || new Date(startedAt - 2 * 60_000).toISOString();

        if (!cachedProfileSettings || startedAt - cachedProfileSettings.cachedAt > 60_000) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('push_reminders_enabled, quiet_hours_start, quiet_hours_end, timezone')
            .eq('id', userId)
            .maybeSingle();
          cachedProfileSettings = {
            pushRemindersEnabled: profile?.push_reminders_enabled !== false,
            quietHoursStart: profile?.quiet_hours_start ?? null,
            quietHoursEnd: profile?.quiet_hours_end ?? null,
            timezone: profile?.timezone || 'America/Bogota',
            cachedAt: startedAt,
          };
        }
        const profileSettings = cachedProfileSettings;

        const currentTime = new Intl.DateTimeFormat('en-GB', {
          timeZone: profileSettings.timezone,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).format(new Date());
        const mayShowSystemNotification = typeof Notification !== 'undefined'
          && Notification.permission === 'granted'
          && profileSettings.pushRemindersEnabled
          && !isWithinQuietHours(currentTime, profileSettings.quietHoursStart, profileSettings.quietHoursEnd);

        const { data: pendingNotifications, error } = await supabase
          .from('notifications')
          .select('id, title, body, related_task_id, related_event_id, created_at')
          .eq('user_id', userId)
          .eq('is_read', false)
          .gt('created_at', cursor)
          .order('created_at', { ascending: true })
          .limit(50);
        if (error) throw error;

        const seenValue = localStorage.getItem(seenKey);
        let seenIds: string[] = [];
        try {
          const parsed: unknown = seenValue ? JSON.parse(seenValue) : [];
          if (Array.isArray(parsed)) seenIds = parsed.filter((id): id is string => typeof id === 'string');
        } catch {
          seenIds = [];
        }
        const seen = new Set(seenIds);

        for (const notification of pendingNotifications || []) {
          if (seen.has(notification.id)) continue;
          seen.add(notification.id);

          if (mayShowSystemNotification && Notification.permission === 'granted') {
            const url = notification.related_task_id
              ? '/tasks'
              : notification.related_event_id
                ? '/calendar'
                : '/notifications';
            await showLocalNotification(notification.title, {
              body: notification.body,
              tag: `notification-${notification.id}`,
              data: { url },
            });
          }
        }

        const notificationRows = pendingNotifications || [];
        const latestTime = notificationRows.length > 0
          ? Math.max(...notificationRows.map((notification) => new Date(notification.created_at).getTime()))
          : startedAt;
        const overlapStart = startedAt - 2000;
        const notificationCursor = Math.max(overlapStart, latestTime - 2000);
        localStorage.setItem(cursorKey, new Date(notificationCursor).toISOString());
        localStorage.setItem(seenKey, JSON.stringify(Array.from(seen).slice(-200)));

        if (notificationRows.some((notification) => !seenIds.includes(notification.id))) {
          window.dispatchEvent(new CustomEvent('tempo:data-updated'));
        }
      } catch (error) {
        console.warn('Notification polling failed:', error);
      } finally {
        isCheckingNotifications = false;
        if (localStorage.getItem(lockKey) === lockValue) {
          localStorage.removeItem(lockKey);
        }
      }
    };

    void checkNotifications();
    const interval = window.setInterval(checkNotifications, 10000);
    return () => {
      window.clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
    if (process.env.NODE_ENV !== 'development' && !isLocalHost) return;

    let isProcessing = false;
    const processDueReminders = async () => {
      if (isProcessing) return;

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
        for (const alert of result.alerts || []) {
          if (alert.allowed && !alert.deliveredByPush) {
            await showLocalNotification(alert.title, {
              body: alert.body,
              tag: alert.tag,
              data: { url: alert.url },
            });
          }
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
