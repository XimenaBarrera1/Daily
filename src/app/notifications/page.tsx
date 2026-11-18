'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Notification } from '@/types';
import {
  Bell,
  Check,
  Send,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Clock,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermissionState,
  subscribeToPushNotifications,
  showLocalNotification,
} from '@/lib/push/client';

export default function NotificationsPage() {
  const { locale, t, formatDate, formatTime } = useI18n();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Push notification states
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [hasRemoteSub, setHasRemoteSub] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

  // Scheduler & Reminders state
  const [pendingRemindersCount, setPendingRemindersCount] = useState<number>(0);
  const [isCheckingReminders, setIsCheckingReminders] = useState(false);
  const [schedulerNotice, setSchedulerNotice] = useState<string | null>(null);

  const loadNotificationsAndReminders = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // 1. Fetch Notifications
      const { data: notifs } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (notifs) {
        setNotifications(notifs as Notification[]);
      }

      // 2. Fetch pending reminders count
      const { count: remCount } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      setPendingRemindersCount(remCount || 0);

      // 3. Check if user has remote push subscriptions
      const { count: subCount } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setHasRemoteSub((subCount || 0) > 0);
    } catch (err) {
      console.warn('Error fetching notifications/reminders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotificationsAndReminders();

    // Check push support
    const checkPush = async () => {
      const supported = await isPushNotificationSupported();
      setPushSupported(supported);
      if (supported) {
        const state = await getNotificationPermissionState();
        setPushPermission(state);
      }
    };
    checkPush();
  }, [loadNotificationsAndReminders]);

  // Mark single as read
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      const supabase = createClient();
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (err) {
      console.warn('Error marking as read:', err);
      loadNotificationsAndReminders();
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      }
    } catch (err) {
      console.warn('Error marking all as read:', err);
      loadNotificationsAndReminders();
    }
  };

  // Subscribe to Web Push
  const handleEnablePush = async () => {
    setIsSubscribing(true);
    setPushMessage(null);

    const result = await subscribeToPushNotifications(locale as any);
    setIsSubscribing(false);

    const updatedState = await getNotificationPermissionState();
    setPushPermission(updatedState);

    if (result.success) {
      setPushMessage({
        text: t('notifications.pushEnabled'),
        type: 'success',
      });
      await loadNotificationsAndReminders();
    } else if (result.isPushServiceBlocked) {
      setPushMessage({
        text: result.error || t('notifications.pushServiceBlocked'),
        type: 'warning',
      });
    } else {
      setPushMessage({
        text: result.error || 'Error enabling notifications',
        type: 'error',
      });
    }
  };

  // Send Test Notification (both in-app and native OS notification)
  const handleSendTestPush = async () => {
    setIsTestingPush(true);
    setPushMessage(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const testTitle = locale === 'es' ? 'Tempo — Notificación de prueba' : 'Tempo — Test Notification';
      const testBody = locale === 'es'
        ? '¡Tus recordatorios y avisos están configurados correctamente!'
        : 'Your reminders and notices are configured correctly!';

      // 1. Insert in-app notification in Supabase
      if (user) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: testTitle,
          body: testBody,
          type: 'reminder',
          is_read: false,
        });
      }

      // 2. Show native OS notification in Windows/Mac
      await showLocalNotification(testTitle, {
        body: testBody,
      });

      // 3. If remote push subscription exists, trigger push test API
      if (hasRemoteSub) {
        await fetch('/api/push/test', { method: 'POST' }).catch(() => {});
      }

      setPushMessage({
        text: t('notifications.testPushSent'),
        type: 'success',
      });

      await loadNotificationsAndReminders();
      window.dispatchEvent(new CustomEvent('tempo:data-updated'));
    } catch (err: any) {
      setPushMessage({ text: err.message || t('notifications.testPushError'), type: 'error' });
    } finally {
      setIsTestingPush(false);
    }
  };

  // Process reminders manually (on-demand scheduler)
  const handleProcessReminders = async () => {
    setIsCheckingReminders(true);
    setSchedulerNotice(null);

    try {
      const res = await fetch('/api/reminders/process', { method: 'POST' });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.processed > 0) {
          setSchedulerNotice(
            locale === 'es'
              ? `Se despacharon ${data.sent} recordatorio(s) pendiente(s).`
              : `Dispatched ${data.sent} due reminder(s).`
          );
        } else {
          setSchedulerNotice(t('notifications.noPendingReminders'));
        }
        await loadNotificationsAndReminders();
        window.dispatchEvent(new CustomEvent('tempo:data-updated'));
      } else {
        setSchedulerNotice(data.error || 'Error checking reminders');
      }
    } catch (err: any) {
      setSchedulerNotice(err.message || 'Error executing check');
    } finally {
      setIsCheckingReminders(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const unreadTotal = notifications.filter((n) => !n.is_read).length;

  return (
    <AppLayout title={t('nav.notifications')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
            {t('notifications.title')}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('notifications.subtitle')}</p>
        </div>

        {unreadTotal > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <Check className="w-4 h-4 mr-1" />
            <span>{t('notifications.markAllRead')}</span>
          </Button>
        )}
      </div>

      {/* 1. Reminder Scheduler Section (Local & Cloud) */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  {t('notifications.schedulerTitle')}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)] font-semibold border border-[var(--border)]">
                  {t('notifications.pendingRemindersCount')} {pendingRemindersCount}
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-xl leading-relaxed">
                {t('notifications.schedulerDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleProcessReminders}
              isLoading={isCheckingReminders}
              className="rounded-xl shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>{isCheckingReminders ? t('notifications.checkingReminders') : t('notifications.checkRemindersNow')}</span>
            </Button>
          </div>
        </div>

        {schedulerNotice && (
          <div className="mt-4 p-3 bg-[var(--primary-light)]/70 border border-[var(--primary)]/30 rounded-xl text-xs text-[var(--foreground)] flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-[var(--primary)]" />
            <span>{schedulerNotice}</span>
          </div>
        )}
      </div>

      {/* 2. Web & System Notifications Banner */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 mb-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--surface-secondary)] text-[var(--primary)] flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                {t('notifications.pushBannerTitle')}
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-xl leading-relaxed">
                {t('notifications.pushBannerDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            {pushPermission === 'granted' ? (
              <>
                <Badge variant="success" className="py-1 px-3">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                  {t('notifications.pushEnabled')}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestPush}
                  isLoading={isTestingPush}
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {t('notifications.testPush')}
                </Button>
              </>
            ) : pushPermission === 'denied' ? (
              <Badge variant="danger" className="py-1 px-3">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {t('notifications.pushDenied')}
              </Badge>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleEnablePush}
                isLoading={isSubscribing}
              >
                {t('notifications.enablePush')}
              </Button>
            )}
          </div>
        </div>

        {pushMessage && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs leading-relaxed border flex items-start gap-2.5 ${
              pushMessage.type === 'success'
                ? 'bg-[var(--success-light)] border-[var(--success)]/30 text-[var(--success)]'
                : pushMessage.type === 'warning'
                ? 'bg-[var(--warning-light)] border-[var(--warning)]/30 text-[var(--warning)]'
                : pushMessage.type === 'info'
                ? 'bg-[var(--primary-light)] border-[var(--primary)]/30 text-[var(--primary)]'
                : 'bg-[var(--danger-light)] border-[var(--danger)]/30 text-[var(--danger)]'
            }`}
          >
            {pushMessage.type === 'warning' ? (
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
            ) : pushMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span>{pushMessage.text}</span>
          </div>
        )}

        <p className="text-[11px] text-[var(--muted-foreground)]/70 mt-4 pt-3 border-t border-[var(--border)]">
          <strong>{locale === 'es' ? 'Nota para dispositivos móviles:' : 'Mobile Note:'}</strong>{' '}
          {t('pwa.iosInstructions')}
        </p>
      </div>

      {/* 3. Filter Tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'all'
              ? 'bg-[var(--primary)] text-white shadow-xs'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--surface)] border border-[var(--border)]'
          }`}
        >
          {t('notifications.all')} ({notifications.length})
        </button>

        <button
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            filter === 'unread'
              ? 'bg-[var(--primary)] text-white shadow-xs'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] bg-[var(--surface)] border border-[var(--border)]'
          }`}
        >
          {t('notifications.unread')} ({unreadTotal})
        </button>
      </div>

      {/* 4. Notifications Inbox List */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-12 text-center shadow-xs">
            <Bell className="w-10 h-10 text-[var(--muted-foreground)]/50 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-[var(--foreground)]">{t('notifications.empty')}</h4>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                notif.is_read
                  ? 'bg-[var(--surface)] border-[var(--border)] opacity-75'
                  : 'bg-[var(--primary-light)]/40 border-[var(--primary)]/30 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    notif.is_read ? 'bg-[var(--surface-secondary)] text-[var(--muted-foreground)]' : 'bg-[var(--primary-light)] text-[var(--primary)]'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">{notif.title}</h4>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 leading-relaxed">{notif.body}</p>
                  <span className="text-[11px] text-[var(--muted-foreground)]/60 block mt-1.5">
                    {formatDate(notif.created_at, { month: 'short', day: 'numeric' })}, {formatTime(notif.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {notif.related_task_id && (
                  <Link
                    href="/tasks"
                    className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
                    title="Ver tarea"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
                {notif.related_event_id && (
                  <Link
                    href="/calendar"
                    className="p-1.5 text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
                    title="Ver evento"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}

                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                    title={locale === 'es' ? 'Marcar como leída' : 'Mark as read'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  );
}
