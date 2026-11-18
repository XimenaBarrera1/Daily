'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Task, FocusSession } from '@/types';
import { CheckCircle2, Clock, Timer, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';

function ProgressContent() {
  const { locale, t } = useI18n();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // 1. Fetch tasks
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

      if (userTasks) setTasks(userTasks as Task[]);

      // 2. Fetch focus sessions from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: userSessions } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', thirtyDaysAgo.toISOString());

      if (userSessions) setSessions(userSessions as FocusSession[]);
    } catch (err) {
      console.error('Error loading progress data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    loadData();
  }, [loadData]);

  // Compute this week's metrics (from Monday 00:00 to now)
  const currentNow = now || new Date('2026-11-13T00:00:00Z');
  const dayOfWeek = currentNow.getDay(); // 0 is Sunday
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const mondayThisWeek = new Date(currentNow);
  mondayThisWeek.setDate(currentNow.getDate() - distanceToMonday);
  mondayThisWeek.setHours(0, 0, 0, 0);

  const completedThisWeek = tasks.filter((t) => {
    if (t.status !== 'completed' || !t.completed_at) return false;
    return new Date(t.completed_at) >= mondayThisWeek;
  });

  const pendingCount = tasks.filter((t) => t.status !== 'completed').length;
  const overdueCount = tasks.filter((t) => {
    if (t.status === 'completed' || !t.due_at || !now) return false;
    return new Date(t.due_at) < now;
  }).length;

  const focusSessionsThisWeek = sessions.filter(
    (s) => new Date(s.completed_at) >= mondayThisWeek
  );

  const totalFocusMinutesThisWeek = focusSessionsThisWeek.reduce(
    (acc, s) => acc + s.duration_minutes,
    0
  );
  const totalFocusHours = (totalFocusMinutesThisWeek / 60).toFixed(1);

  // Group completed tasks by day of this week (Mon-Sun)
  const daysLabels =
    locale === 'es'
      ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const weeklyActivity = daysLabels.map((label, index) => {
    // index 0 is Monday
    const targetDay = new Date(mondayThisWeek);
    targetDay.setDate(mondayThisWeek.getDate() + index);
    const targetDayStr = targetDay.toISOString().split('T')[0];

    const count = completedThisWeek.filter(
      (t) => t.completed_at && t.completed_at.startsWith(targetDayStr)
    ).length;

    return { label, count };
  });

  const maxDailyCount = Math.max(...weeklyActivity.map((d) => d.count), 1);

  return (
    <AppLayout title={t('nav.progress')}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t('progress.title')}</h2>
        <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('progress.subtitle')}</p>
      </div>

      {/* Calm Philosophy Box */}
      <div className="bg-[var(--primary-light)]/70 border border-[var(--primary)]/20 rounded-3xl p-6 mb-8 text-[var(--foreground)] flex items-center gap-4 shadow-xs">
        <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] text-[var(--primary)] flex items-center justify-center shrink-0 shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t('progress.calmMotto')}</h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {locale === 'es'
              ? 'Tempo mide el avance sereno de tus metas personales y académicas sin generar ansiedad.'
              : 'Tempo measures peaceful progress towards your personal and academic goals without pressure.'}
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="hover:border-[var(--primary)]/40 transition-all">
          <CardContent className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('progress.completedThisWeek')}
            </span>
            <div className="text-3xl font-bold text-[var(--success)] mt-2">
              {completedThisWeek.length}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-[var(--primary)]/40 transition-all">
          <CardContent className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('dashboard.pendingCard')}
            </span>
            <div className="text-3xl font-bold text-[var(--foreground)] mt-2">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card className="hover:border-[var(--primary)]/40 transition-all">
          <CardContent className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('progress.overdueCount')}
            </span>
            <div
              className={`text-3xl font-bold mt-2 ${
                overdueCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]'
              }`}
            >
              {overdueCount}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-[var(--primary)]/40 transition-all">
          <CardContent className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('progress.hoursFocused')}
            </span>
            <div className="text-3xl font-bold text-[var(--primary)] mt-2">
              {totalFocusHours}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Calm Bar Chart */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 shadow-xs mb-8">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-1">
          {locale === 'es' ? 'Actividad completada esta semana' : 'Tasks Completed This Week'}
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-6">
          {locale === 'es'
            ? 'Distribución diaria de compromisos finalizados.'
            : 'Daily distribution of finished commitments.'}
        </p>

        <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-48 pt-6 border-b border-[var(--border)] pb-2">
          {weeklyActivity.map((day, idx) => {
            const heightPercent = Math.max(8, (day.count / maxDailyCount) * 100);

            return (
              <div key={idx} className="flex flex-col items-center h-full justify-end">
                <span className="text-[11px] font-bold text-[var(--muted-foreground)] mb-1">{day.count}</span>
                <div
                  className="w-full max-w-[42px] bg-[var(--surface-secondary)] hover:bg-[var(--primary)] rounded-xl transition-all duration-300"
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-xs font-semibold text-[var(--muted-foreground)] mt-2">{day.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <ProgressContent />
    </Suspense>
  );
}
