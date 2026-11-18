'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Task, CalendarEvent, Note } from '@/types';
import {
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Timer,
  ChevronRight,
  BookOpen,
  Pin,
  GraduationCap,
  Flame,
  Check,
} from 'lucide-react';
import { QuickAddTaskDialog } from '@/components/modals/quick-add-task-dialog';
import { QuickAddEventDialog } from '@/components/modals/quick-add-event-dialog';

function DashboardContent() {
  const { locale, t, formatDate, formatTime } = useI18n();

  const [userName, setUserName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Time of day greeting
  const getGreeting = () => {
    const hour = (now || new Date()).getHours();
    if (hour < 12) return t('dashboard.greetingMorning');
    if (hour < 18) return t('dashboard.greetingAfternoon');
    return t('dashboard.greetingEvening');
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // 1. User profile
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

      // 2. Fetch Tasks
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_at', { ascending: true, nullsFirst: false });

      if (userTasks) {
        setTasks(userTasks as Task[]);
      }

      // 3. Fetch upcoming Events
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: userEvents } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('ends_at', startOfToday.toISOString())
        .order('starts_at', { ascending: true })
        .limit(10);

      if (userEvents) {
        setEvents(userEvents as CalendarEvent[]);
      }

      // 4. Fetch Recent Notes
      try {
        const { data: notesData } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('is_pinned', { ascending: false })
          .order('updated_at', { ascending: false })
          .limit(3);

        if (notesData && notesData.length > 0) {
          setRecentNotes(notesData as Note[]);
        } else {
          const local = localStorage.getItem('daily_workspace_notes');
          if (local) setRecentNotes(JSON.parse(local).slice(0, 3));
        }
      } catch {
        const local = localStorage.getItem('daily_workspace_notes');
        if (local) setRecentNotes(JSON.parse(local).slice(0, 3));
      }
    } catch (err) {
      console.warn('Dashboard data fetch note:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    loadDashboardData();

    const handleDataUpdate = () => {
      setNow(new Date());
      loadDashboardData();
    };
    window.addEventListener('tempo:data-updated', handleDataUpdate);

    return () => {
      window.removeEventListener('tempo:data-updated', handleDataUpdate);
    };
  }, [loadDashboardData]);

  // Calculate task subsets
  const todayStr = now ? now.toISOString().split('T')[0] : '';

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const todayTasks = tasks.filter((t) => {
    if (!t.due_at || !todayStr) return false;
    return t.due_at.startsWith(todayStr);
  });

  const overdueTasks = tasks.filter((t) => {
    if (!t.due_at || t.status === 'completed' || !now) return false;
    return new Date(t.due_at) < now && !t.due_at.startsWith(todayStr);
  });

  // Next upcoming event
  const nextEvent = events.find((e) => (now ? new Date(e.ends_at) > now : false));

  // Upcoming deadlines (next 7 days)
  const upcomingDeadlines = pendingTasks
    .filter((t) => (now && t.due_at ? new Date(t.due_at) >= now : false))
    .slice(0, 5);

  // Daily Progress percentage
  const totalRelevantToday = todayTasks.length;
  const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
  const progressPercent = totalRelevantToday > 0 ? Math.round((completedToday / totalRelevantToday) * 100) : 0;

  // Toggle task completion
  const handleToggleTask = async (task: Task) => {
    const isNowCompleted = task.status !== 'completed';
    const newStatus = isNowCompleted ? 'completed' : 'pending';

    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: newStatus, completed_at: isNowCompleted ? new Date().toISOString() : null }
          : t
      )
    );

    try {
      const supabase = createClient();
      await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: isNowCompleted ? new Date().toISOString() : null,
        })
        .eq('id', task.id);
    } catch (err) {
      console.warn('Error toggling task:', err);
      loadDashboardData();
    }
  };

  return (
    <AppLayout title={t('nav.overview')}>
      {/* 1. Warm Editorial Welcome Banner */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 mb-8 shadow-[var(--card-shadow)] relative overflow-hidden transition-all">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--primary)] opacity-[0.04] rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-xs font-semibold mb-3">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{locale === 'es' ? 'Semestre Activo' : 'Current Semester'}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              {getGreeting()}, {userName || (locale === 'es' ? 'Estudiante' : 'Student')}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-1.5 max-w-xl leading-relaxed">
              {t('dashboard.tagline')}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/notes">
              <button className="flex items-center gap-1.5 py-2 px-3.5 bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold rounded-2xl transition-all shadow-xs active:scale-[0.98]">
                <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{t('dashboard.quickAddNote')}</span>
              </button>
            </Link>

            <button
              onClick={() => setIsEventModalOpen(true)}
              className="flex items-center gap-1.5 py-2 px-3.5 bg-[var(--surface-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--foreground)] text-xs font-semibold rounded-2xl transition-all shadow-xs active:scale-[0.98]"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>{t('dashboard.quickAddEvent')}</span>
            </button>

            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-1.5 py-2.5 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-bold rounded-2xl transition-all shadow-[var(--card-shadow)] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>{t('dashboard.quickAddTask')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Stats in Refined Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Pending Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--card-shadow)] hover:border-[var(--primary)]/40 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
            {t('dashboard.pendingCard')}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
              {pendingTasks.length}
            </span>
            <span className="text-xs text-[var(--muted-foreground)] font-medium">
              {todayTasks.filter((t) => t.status !== 'completed').length} {locale === 'es' ? 'para hoy' : 'for today'}
            </span>
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--card-shadow)] hover:border-[var(--primary)]/40 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
            {t('dashboard.completedCard')}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-[var(--success)] tracking-tight">
              {completedTasks.length}
            </span>
            <span className="text-xs text-[var(--success)] font-medium">
              {completedToday} {locale === 'es' ? 'hoy' : 'today'}
            </span>
          </div>
        </div>

        {/* Overdue Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--card-shadow)] hover:border-[var(--primary)]/40 transition-all">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] block">
            {t('dashboard.overdueCard')}
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-3xl font-extrabold tracking-tight ${overdueTasks.length > 0 ? 'text-[var(--danger)]' : 'text-[var(--foreground)]'}`}>
              {overdueTasks.length}
            </span>
            {overdueTasks.length > 0 && (
              <span className="text-xs text-[var(--danger)] font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {locale === 'es' ? 'Revisar' : 'Review'}
              </span>
            )}
          </div>
        </div>

        {/* Daily Progress Card */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-[var(--card-shadow)] hover:border-[var(--primary)]/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('dashboard.dailyProgress')}
            </span>
            <span className="text-xs font-bold text-[var(--primary)]">{progressPercent}%</span>
          </div>

          <div className="w-full bg-[var(--surface-secondary)] h-2 rounded-full overflow-hidden mb-2">
            <div
              className="bg-[var(--primary)] h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <span className="text-[11px] text-[var(--muted-foreground)] block text-right">
            {completedToday}/{totalRelevantToday || 0} {locale === 'es' ? 'completadas hoy' : 'done today'}
          </span>
        </div>
      </div>

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Today's Tasks & Deadlines & Notes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Focus Section */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight">
                  {t('dashboard.todayTasks')}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {todayTasks.length > 0
                    ? `${todayTasks.length} ${locale === 'es' ? 'tareas asignadas para hoy' : 'tasks scheduled for today'}`
                    : t('dashboard.emptyStateDesc')}
                </p>
              </div>

              <Link
                href="/planner"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:opacity-80 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('dashboard.planMyDay')}</span>
              </Link>
            </div>

            {todayTasks.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/50">
                <Clock className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2 opacity-60" />
                <h4 className="text-sm font-semibold text-[var(--foreground)]">{t('dashboard.emptyStateTitle')}</h4>
                <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto mt-1 mb-4">
                  {t('dashboard.emptyStateDesc')}
                </p>
                <Button variant="primary" size="sm" onClick={() => setIsTaskModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  {t('tasks.newTask')}
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      task.status === 'completed'
                        ? 'bg-[var(--surface-secondary)]/40 border-[var(--border)] opacity-60'
                        : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                          task.status === 'completed'
                            ? 'bg-[var(--primary)] text-white shadow-xs'
                            : 'border-2 border-[var(--border)] hover:border-[var(--primary)]'
                        }`}
                        aria-label="Toggle task status"
                      >
                        {task.status === 'completed' && <Check className="w-3.5 h-3.5 stroke-[2.5px]" />}
                      </button>

                      <div>
                        <p
                          className={`text-sm font-semibold text-[var(--foreground)] ${
                            task.status === 'completed' ? 'line-through text-[var(--muted-foreground)]' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[var(--muted-foreground)]">
                          {task.subject && (
                            <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.2 rounded-md">
                              {task.subject}
                            </span>
                          )}
                          <span>•</span>
                          <span>{task.estimated_minutes} min</span>
                          {task.due_at && (
                            <>
                              <span>•</span>
                              <span>{formatTime(task.due_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          task.priority === 'high'
                            ? 'danger'
                            : task.priority === 'medium'
                            ? 'warning'
                            : 'neutral'
                        }
                      >
                        {task.priority}
                      </Badge>

                      <Link
                        href={`/focus?taskId=${task.id}`}
                        title={t('dashboard.startFocus')}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-xl transition-colors"
                      >
                        <Timer className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Deadlines & Exams Section */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight">
                {t('dashboard.upcomingDeadlines')}
              </h3>
              <Link href="/tasks" className="text-xs font-bold text-[var(--primary)] hover:underline">
                {t('common.all')}
              </Link>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4">{t('dashboard.noDeadlines')}</p>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-[var(--border)] hover:bg-[var(--surface-secondary)]/50 transition-colors"
                  >
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[var(--foreground)]">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                        <span>{formatDate(task.due_at, { month: 'short', day: 'numeric', weekday: 'short' })}</span>
                        {task.due_at && <span>• {formatTime(task.due_at)}</span>}
                        {task.subject && (
                          <span className="font-semibold text-[var(--primary)]">• {task.subject}</span>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={
                        task.priority === 'high'
                          ? 'danger'
                          : task.priority === 'medium'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notes Notebooks (Notion-inspired) */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--primary)]" />
                <h3 className="text-base font-bold text-[var(--foreground)] tracking-tight">
                  {t('dashboard.recentNotes')}
                </h3>
              </div>
              <Link href="/notes" className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1">
                <span>{locale === 'es' ? 'Ver todos los apuntes' : 'View all notes'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentNotes.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-[var(--border)] rounded-2xl bg-[var(--surface-secondary)]/30">
                <p className="text-xs text-[var(--muted-foreground)] mb-3">
                  {locale === 'es'
                    ? 'Aún no has registrado apuntes de clase o resúmenes de estudio.'
                    : 'No class notes or study summaries registered yet.'}
                </p>
                <Link href="/notes">
                  <Button variant="outline" size="sm">
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {t('notes.newNote')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href="/notes"
                    className="p-4 rounded-2xl border border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--surface-secondary)]/30 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        {note.subject ? (
                          <span className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.2 rounded-md truncate max-w-[120px]">
                            {note.subject}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--muted-foreground)]">Apunte</span>
                        )}
                        {note.is_pinned && <Pin className="w-3 h-3 text-[var(--primary)]" />}
                      </div>
                      <h4 className="text-xs font-bold text-[var(--foreground)] line-clamp-1">{note.title}</h4>
                      {note.content && (
                        <p className="text-[11px] text-[var(--muted-foreground)] mt-1 line-clamp-2 leading-relaxed">
                          {note.content}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--muted-foreground)] mt-3 block">
                      {formatDate(note.updated_at, { month: 'short', day: 'numeric' })}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Next Commitment & Focus Gadget */}
        <div className="space-y-6">
          {/* Next Scheduled Commitment Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {t('dashboard.nextEvent')}
              </span>
              <CalendarIcon className="w-4 h-4 text-[var(--primary)]" />
            </div>

            {nextEvent ? (
              <div className="space-y-3">
                <div>
                  <h4 className="text-base font-bold text-[var(--foreground)]">{nextEvent.title}</h4>
                  {nextEvent.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{nextEvent.description}</p>
                  )}
                </div>

                <div className="p-3 bg-[var(--primary-light)] rounded-xl text-xs text-[var(--primary)] font-semibold flex items-center justify-between">
                  <span>{formatDate(nextEvent.starts_at, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span>
                    {formatTime(nextEvent.starts_at)} - {formatTime(nextEvent.ends_at)}
                  </span>
                </div>

                <Link href="/calendar">
                  <Button variant="outline" size="sm" className="w-full mt-1">
                    {t('nav.calendar')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-[var(--muted-foreground)] mb-3">{t('dashboard.noUpcomingEvents')}</p>
                <Button variant="outline" size="sm" onClick={() => setIsEventModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {t('calendar.newEvent')}
                </Button>
              </div>
            )}
          </div>

          {/* Study Focus Gadget Card */}
          <div className="bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                {t('nav.focus')}
              </span>
              <Timer className="w-5 h-5 text-white/90" />
            </div>
            <h4 className="text-lg font-bold mb-1">
              {locale === 'es' ? '¿Listo para estudiar?' : 'Ready to study?'}
            </h4>
            <p className="text-xs text-white/90 mb-5 leading-relaxed">
              {locale === 'es'
                ? 'Inicia un bloque Pomodoro de 25 minutos para preparar exámenes o proyectos sin distracciones.'
                : 'Start a calm 25-minute Pomodoro block to study for exams or make progress on projects.'}
            </p>
            <Link href="/focus">
              <button className="w-full bg-white text-[var(--foreground)] py-2.5 px-4 rounded-2xl text-xs font-bold hover:bg-white/90 transition-all shadow-xs flex items-center justify-center gap-2 active:scale-[0.98]">
                <span>{t('dashboard.startFocus')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>

          {/* Weekly Timetable Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-[var(--card-shadow)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {t('nav.schedule')}
              </span>
              <Clock className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mb-4 leading-relaxed">
              {locale === 'es'
                ? 'Gestiona tus clases universitarias, materias recurrentes y cuadrantes de la semana.'
                : 'Manage your weekly university courses, recurring subjects, and timetable.'}
            </p>
            <Link href="/schedule">
              <Button variant="outline" size="sm" className="w-full">
                {t('schedule.title')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Global Quick Add Dialogs */}
      <QuickAddTaskDialog
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={loadDashboardData}
      />
      <QuickAddEventDialog
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventCreated={loadDashboardData}
      />
    </AppLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <DashboardContent />
    </Suspense>
  );
}
