'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/app-layout';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Task, CalendarEvent, Note } from '@/types';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  Clock,
  GraduationCap,
  ListChecks,
  Plus,
  Sparkles,
  Timer,
} from 'lucide-react';
import { QuickAddTaskDialog } from '@/components/modals/quick-add-task-dialog';
import { QuickAddEventDialog } from '@/components/modals/quick-add-event-dialog';
// NUEVO: Importamos el mini calendario
import { MiniWeekCalendar } from '@/components/ui/mini-week-calendar';

function DashboardContent() {
  const { locale, t, formatDate, formatTime } = useI18n();

  const [userName, setUserName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const getGreeting = () => {
    const hour = (now || new Date()).getHours();

    if (hour < 12) {
      return t('dashboard.greetingMorning');
    }

    if (hour < 18) {
      return t('dashboard.greetingAfternoon');
    }

    return t('dashboard.greetingEvening');
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

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

      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('due_at', {
          ascending: true,
          nullsFirst: false,
        });

      if (userTasks) {
        setTasks(userTasks as Task[]);
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: userEvents } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .gte('ends_at', startOfToday.toISOString())
        .order('starts_at', {
          ascending: true,
        })
        .limit(10);

      if (userEvents) {
        setEvents(userEvents as CalendarEvent[]);
      }

      try {
        const { data: notesData } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('is_pinned', {
            ascending: false,
          })
          .order('updated_at', {
            ascending: false,
          })
          .limit(3);

        if (notesData && notesData.length > 0) {
          setRecentNotes(notesData as Note[]);
        } else {
          const localNotes = localStorage.getItem(
            'daily_workspace_notes'
          );

          if (localNotes) {
            setRecentNotes(
              JSON.parse(localNotes).slice(0, 3)
            );
          }
        }
      } catch {
        const localNotes = localStorage.getItem(
          'daily_workspace_notes'
        );

        if (localNotes) {
          setRecentNotes(
            JSON.parse(localNotes).slice(0, 3)
          );
        }
      }
    } catch (error) {
      console.warn('Error cargando el dashboard:', error);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    loadDashboardData();

    const handleDataUpdate = () => {
      setNow(new Date());
      loadDashboardData();
    };

    window.addEventListener(
      'tempo:data-updated',
      handleDataUpdate
    );

    return () => {
      window.removeEventListener(
        'tempo:data-updated',
        handleDataUpdate
      );
    };
  }, [loadDashboardData]);

  const todayString = now
    ? now.toISOString().split('T')[0]
    : '';

  const pendingTasks = tasks.filter(
    (task) => task.status !== 'completed'
  );

  const completedTasks = tasks.filter(
    (task) => task.status === 'completed'
  );

  const todayTasks = tasks.filter((task) => {
    if (!task.due_at || !todayString) {
      return false;
    }

    return task.due_at.startsWith(todayString);
  });

  const overdueTasks = tasks.filter((task) => {
    if (!task.due_at || task.status === 'completed' || !now) {
      return false;
    }

    return (
      new Date(task.due_at) < now &&
      !task.due_at.startsWith(todayString)
    );
  });

  const nextEvent = events.find((event) => {
    if (!now) {
      return false;
    }

    return new Date(event.ends_at) > now;
  });

  const upcomingDeadlines = pendingTasks
    .filter((task) => {
      if (!now || !task.due_at) {
        return false;
      }

      return new Date(task.due_at) >= now;
    })
    .slice(0, 5);

  const completedToday = todayTasks.filter(
    (task) => task.status === 'completed'
  ).length;

  const progressPercent =
    todayTasks.length > 0
      ? Math.round(
          (completedToday / todayTasks.length) * 100
        )
      : 0;

  const handleToggleTask = async (task: Task) => {
    const isNowCompleted = task.status !== 'completed';
    const newStatus = isNowCompleted
      ? 'completed'
      : 'pending';

    const completedAt = isNowCompleted
      ? new Date().toISOString()
      : null;

    setTasks((currentTasks) =>
      currentTasks.map((currentTask) =>
        currentTask.id === task.id
          ? {
              ...currentTask,
              status: newStatus,
              completed_at: completedAt,
            }
          : currentTask
      )
    );

    try {
      const supabase = createClient();

      await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: completedAt,
        })
        .eq('id', task.id);
    } catch (error) {
      console.warn('Error actualizando la tarea:', error);
      loadDashboardData();
    }
  };

  return (
    <AppLayout title={t('nav.overview')}>
      <main className="mx-auto max-w-7xl pb-12">
        <section className="pb-16 pt-2">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                <GraduationCap className="h-4 w-4" />

                <span>
                  {locale === 'es'
                    ? 'Tu espacio universitario'
                    : 'Your university workspace'}
                </span>
              </div>

              <h1 className="text-4xl font-semibold leading-[1.04] tracking-[-0.05em] text-[var(--foreground)] sm:text-6xl">
                {getGreeting()},{' '}
                {userName ||
                  (locale === 'es'
                    ? 'estudiante'
                    : 'student')}
                .

                <span className="block text-[var(--muted-foreground)]">
                  {locale === 'es'
                    ? 'Haz espacio para lo que importa hoy.'
                    : 'Make room for what matters today.'}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-[var(--muted-foreground)]">
                {t('dashboard.tagline')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/planner"
                className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
              >
                <Sparkles className="h-4 w-4 text-[var(--primary)]" />

                {t('dashboard.planMyDay')}
              </Link>

              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--background)] transition hover:opacity-80"
              >
                <Plus className="h-4 w-4" />

                {t('dashboard.quickAddTask')}
              </button>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="mb-7 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                {locale === 'es'
                  ? 'Una mirada rápida'
                  : 'A quick look'}
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {locale === 'es'
                  ? 'Lo que está pasando.'
                  : 'What is happening.'}
              </h2>
            </div>

            <Link
              href="/progress"
              className="hidden items-center gap-1 text-sm font-semibold text-[var(--primary)] sm:inline-flex"
            >
              {locale === 'es'
                ? 'Ver progreso'
                : 'View progress'}

              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[var(--muted-foreground)]">
                <ListChecks className="h-4 w-4 text-[var(--primary)]" />

                <span className="text-xs">
                  {t('dashboard.pendingCard')}
                </span>
              </div>

              <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {pendingTasks.length}
              </p>

              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {todayTasks.filter(
                  (task) => task.status !== 'completed'
                ).length}{' '}
                {locale === 'es'
                  ? 'para hoy'
                  : 'for today'}
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[var(--muted-foreground)]">
                <Check className="h-4 w-4 text-[var(--primary)]" />

                <span className="text-xs">
                  {t('dashboard.completedCard')}
                </span>
              </div>

              <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {completedTasks.length}
              </p>

              <p className="mt-1 text-xs text-[var(--success)]">
                {completedToday}{' '}
                {locale === 'es'
                  ? 'completadas hoy'
                  : 'completed today'}
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[var(--muted-foreground)]">
                <AlertCircle className="h-4 w-4 text-[var(--primary)]" />

                <span className="text-xs">
                  {t('dashboard.overdueCard')}
                </span>
              </div>

              <p
                className={`text-4xl font-semibold tracking-tight ${
                  overdueTasks.length > 0
                    ? 'text-[var(--danger)]'
                    : 'text-[var(--foreground)]'
                }`}
              >
                {overdueTasks.length}
              </p>

              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {overdueTasks.length > 0
                  ? locale === 'es'
                    ? 'para revisar'
                    : 'to review'
                  : locale === 'es'
                    ? 'todo en orden'
                    : 'all clear'}
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2 text-[var(--muted-foreground)]">
                <Timer className="h-4 w-4 text-[var(--primary)]" />

                <span className="text-xs">
                  {t('dashboard.dailyProgress')}
                </span>
              </div>

              <p className="text-4xl font-semibold tracking-tight text-[var(--foreground)]">
                {progressPercent}%
              </p>

              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {completedToday}/{todayTasks.length || 0}{' '}
                {locale === 'es'
                  ? 'completadas'
                  : 'completed'}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-20">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                Agenda
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                {locale === 'es'
                  ? 'Tu día, sin ruido.'
                  : 'Your day, without the noise.'}
              </h2>
            </div>

            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setIsEventModalOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
              >
                <Plus className="h-4 w-4" />

                {locale === 'es'
                  ? 'Agregar evento'
                  : 'Add event'}
              </button>

              <Link
                href="/calendar"
                className="hidden items-center gap-1 text-sm font-semibold text-[var(--muted-foreground)] transition hover:text-[var(--primary)] sm:inline-flex"
              >
                {t('nav.calendar')}

                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-14 lg:grid-cols-[1.35fr_0.65fr]">
            <div>
              {/* NUEVO: Mini Calendario integrado */}
              <div className="mb-8">
                <MiniWeekCalendar events={events} tasks={tasks} />
              </div>

              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-[var(--primary)]" />

                  <p className="text-sm font-semibold capitalize text-[var(--foreground)]">
                    {formatDate(
                      new Date().toISOString(),
                      {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </p>
                </div>

                <span className="text-xs text-[var(--muted-foreground)]">
                  {todayTasks.length}{' '}
                  {locale === 'es'
                    ? 'tareas hoy'
                    : 'tasks today'}
                </span>
              </div>

              <div className="space-y-6">
                {todayTasks.length === 0 && !nextEvent ? (
                  <div className="py-12">
                    <Clock className="h-8 w-8 text-[var(--primary)] opacity-60" />

                    <h3 className="mt-5 text-lg font-semibold text-[var(--foreground)]">
                      {t('dashboard.emptyStateTitle')}
                    </h3>

                    <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
                      {t('dashboard.emptyStateDesc')}
                    </p>

                    <button
                      type="button"
                      onClick={() => setIsTaskModalOpen(true)}
                      className="mt-5 text-sm font-semibold text-[var(--primary)]"
                    >
                      + {t('tasks.newTask')}
                    </button>
                  </div>
                ) : (
                  <>
                    {todayTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-center justify-between gap-4"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleTask(task)
                            }
                            aria-label={
                              locale === 'es'
                                ? 'Cambiar estado de tarea'
                                : 'Change task status'
                            }
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition ${
                              task.status === 'completed'
                                ? 'bg-[var(--primary)] text-white'
                                : 'bg-[var(--surface-secondary)] text-transparent hover:bg-[var(--primary-light)]'
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </button>

                          <div className="min-w-0">
                            <p
                              className={`truncate text-sm font-semibold ${
                                task.status === 'completed'
                                  ? 'text-[var(--muted-foreground)] line-through'
                                  : 'text-[var(--foreground)]'
                              }`}
                            >
                              {task.title}
                            </p>

                            <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                              {task.subject ||
                                (locale === 'es'
                                  ? 'Tarea universitaria'
                                  : 'University task')}{' '}
                              · {task.estimated_minutes} min
                            </p>
                          </div>
                        </div>

                        <Link
                          href={`/focus?taskId=${task.id}`}
                          title={t('dashboard.startFocus')}
                          className="rounded-full p-2 text-[var(--muted-foreground)] opacity-0 transition hover:bg-[var(--surface-secondary)] hover:text-[var(--primary)] group-hover:opacity-100"
                        >
                          <Timer className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}

                    {nextEvent && (
                      <div className="flex items-center gap-4 bg-[var(--primary-light)]/60 px-4 py-4 rounded-xl">
                        <CalendarIcon className="h-5 w-5 shrink-0 text-[var(--primary)]" />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                            {nextEvent.title}
                          </p>

                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {formatTime(nextEvent.starts_at)} –{' '}
                            {formatTime(nextEvent.ends_at)}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="space-y-12">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Timer className="h-5 w-5 text-[var(--primary)]" />

                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {t('nav.focus')}
                  </p>
                </div>

                <h3 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {locale === 'es'
                    ? 'Un bloque para concentrarte.'
                    : 'A block to focus.'}
                </h3>

                <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                  {locale === 'es'
                    ? 'Veinticinco minutos para avanzar en una sola cosa, sin presión.'
                    : 'Twenty-five minutes to move one thing forward, without pressure.'}
                </p>

                <Link
                  href="/focus"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
                >
                  {t('dashboard.startFocus')}

                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-[var(--primary)]" />

                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                    {t('dashboard.upcomingDeadlines')}
                  </p>
                </div>

                <div className="space-y-5">
                  {upcomingDeadlines.length === 0 ? (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {t('dashboard.noDeadlines')}
                    </p>
                  ) : (
                    upcomingDeadlines
                      .slice(0, 3)
                      .map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                              {task.title}
                            </p>

                            <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">
                              {task.subject || 'DAILY'} ·{' '}
                              {formatDate(task.due_at, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>

                          <span className="shrink-0 text-xs capitalize text-[var(--muted-foreground)]">
                            {task.priority}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-[var(--primary)]" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  {locale === 'es'
                    ? 'Cuaderno'
                    : 'Notebook'}
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {t('dashboard.recentNotes')}
                </h2>
              </div>
            </div>

            {recentNotes.length === 0 ? (
              <div className="py-5">
                <p className="text-sm text-[var(--muted-foreground)]">
                  {locale === 'es'
                    ? 'Tus apuntes aparecerán aquí.'
                    : 'Your notes will appear here.'}
                </p>

                <Link
                  href="/notes"
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--primary)]"
                >
                  + {t('notes.newNote')}
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-3">
                {recentNotes.map((note) => (
                  <Link
                    key={note.id}
                    href="/notes"
                    className="group bg-[var(--surface-secondary)]/60 p-5 transition hover:bg-[var(--primary-light)] rounded-xl"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--primary)]">
                      {note.subject || 'Apunte'}
                    </p>

                    <h3 className="mt-4 line-clamp-2 text-sm font-semibold text-[var(--foreground)]">
                      {note.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)]">
                      {note.content}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-6 flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-[var(--primary)]" />

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  {t('nav.schedule')}
                </p>

                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
                  {locale === 'es'
                    ? 'Dale aire a tu semana.'
                    : 'Give your week some room.'}
                </h2>
              </div>
            </div>

            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {locale === 'es'
                ? 'Organiza tus clases y compromisos en un horario que puedas sostener.'
                : 'Organize classes and commitments in a schedule you can sustain.'}
            </p>

            <Link
              href="/schedule"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)]"
            >
              {t('schedule.title')}

              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--background)]" />
      }
    >
      <DashboardContent />
    </Suspense>
  );
}