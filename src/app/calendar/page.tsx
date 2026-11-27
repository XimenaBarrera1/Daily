'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { CalendarEvent, Task } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Trash2,
} from 'lucide-react';
import { QuickAddEventDialog } from '@/components/modals/quick-add-event-dialog';

function CalendarContent() {
  const { locale, t, formatDate, formatTime } = useI18n();

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date('2026-11-13T00:00:00Z'));
  const [todayIso, setTodayIso] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const d = new Date();
    setCurrentDate(d);
    setTodayIso(d.toISOString().split('T')[0]);
  }, []);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDateForNew, setSelectedDateForNew] = useState<string | undefined>(undefined);
  const [viewingItem, setViewingItem] = useState<{ type: 'event' | 'task'; data: any } | null>(null);

  const loadCalendarData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Fetch Events
      const { data: userEvents } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id);

      if (userEvents) setEvents(userEvents as CalendarEvent[]);

      // Fetch Tasks with due_at
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .not('due_at', 'is', null);

      if (userTasks) setTasks(userTasks as Task[]);
    } catch (err) {
      console.error('Error loading calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalendarData();
    const handleUpdate = () => loadCalendarData();
    window.addEventListener('tempo:data-updated', handleUpdate);
    return () => window.removeEventListener('tempo:data-updated', handleUpdate);
  }, [loadCalendarData]);

  // Date Navigation
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Delete event
  const handleDeleteEvent = async (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setViewingItem(null);

    try {
      const supabase = createClient();
      await supabase.from('events').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting event:', err);
      loadCalendarData();
    }
  };

  // Generate Month Days Grid (6 weeks standard calendar grid)
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Week starts on Monday (1) or Sunday (0)
    const startingDayIndex = firstDay.getDay(); // 0 is Sunday
    const daysInMonth = lastDay.getDate();

    const calendarCells = [];

    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const cellDate = new Date(year, month - 1, dayNum);
      calendarCells.push({ date: cellDate, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const cellDate = new Date(year, month, i);
      calendarCells.push({ date: cellDate, isCurrentMonth: true });
    }

    // Next month padding to reach 35 or 42 cells
    const remaining = (7 - (calendarCells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const cellDate = new Date(year, month + 1, i);
      calendarCells.push({ date: cellDate, isCurrentMonth: false });
    }

    const weekDayNames =
      locale === 'es'
        ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-6 shadow-xs select-none">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2 border-b border-[var(--border)] pb-2 text-center text-xs font-semibold text-[var(--muted-foreground)]">
          {weekDayNames.map((name, idx) => (
            <div key={idx} className="py-1">
              {name}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarCells.map((cell, index) => {
            const cellDateStr = cell.date.toISOString().split('T')[0];
            const isToday = cellDateStr === todayIso;

            // Events on this date
            const dayEvents = events.filter((e) => e.starts_at.startsWith(cellDateStr));
            // Tasks due on this date
            const dayTasks = tasks.filter((t) => t.due_at?.startsWith(cellDateStr));

            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedDateForNew(cellDateStr);
                  setIsEventModalOpen(true);
                }}
                className={`min-h-[75px] sm:min-h-[100px] p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  !cell.isCurrentMonth
                    ? 'bg-[var(--surface-secondary)]/30 border-[var(--border)]/40 text-[var(--muted-foreground)]/40 opacity-50'
                    : isToday
                    ? 'bg-[var(--primary-light)]/40 border-[var(--primary)]/40'
                    : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/40 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                      isToday
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                        : cell.isCurrentMonth
                        ? 'text-[var(--foreground)]'
                        : 'text-[var(--muted-foreground)]/40'
                    }`}
                  >
                    {cell.date.getDate()}
                  </span>
                  {(dayEvents.length > 0 || dayTasks.length > 0) && (
                    <span className="text-[10px] text-[var(--muted-foreground)] font-medium hidden sm:inline">
                      {dayEvents.length + dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Items preview pills */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingItem({ type: 'event', data: ev });
                      }}
                      className="px-1.5 py-0.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-md text-[10px] font-medium truncate hover:opacity-90 transition-opacity shadow-xs"
                    >
                      {ev.title}
                    </div>
                  ))}

                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingItem({ type: 'task', data: t });
                      }}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate border flex items-center gap-1 ${
                        t.status === 'completed'
                          ? 'bg-[var(--surface-secondary)] text-[var(--muted-foreground)] border-[var(--border)]'
                          : 'bg-[var(--warning-light)] text-[var(--warning)] border-[var(--warning)]/30'
                      }`}
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}

                  {dayEvents.length + dayTasks.length > 4 && (
                    <span className="text-[9px] text-[var(--muted-foreground)] block pl-1 font-medium">
                      +{dayEvents.length + dayTasks.length - 4} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Day View
  const renderDayView = () => {
    const dayStr = currentDate.toISOString().split('T')[0];
    const dayEvents = events.filter((e) => e.starts_at.startsWith(dayStr));
    const dayTasks = tasks.filter((t) => t.due_at?.startsWith(dayStr));

    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-[var(--foreground)] mb-4">
          {formatDate(currentDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h3>

        {dayEvents.length === 0 && dayTasks.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)] py-8 text-center">{t('calendar.noItemsDay')}</p>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setViewingItem({ type: 'event', data: ev })}
                className="p-4 rounded-2xl bg-[var(--primary-light)] border border-[var(--primary)]/20 cursor-pointer hover:border-[var(--primary)] transition-all shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider">
                    {t('calendar.eventsLabel')}
                  </span>
                  <span className="text-xs text-[var(--primary)] font-medium">
                    {formatTime(ev.starts_at)} - {formatTime(ev.ends_at)}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-[var(--foreground)] mt-1">{ev.title}</h4>
                {ev.description && <p className="text-xs text-[var(--muted-foreground)] mt-1">{ev.description}</p>}
              </div>
            ))}

            {dayTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setViewingItem({ type: 'task', data: task })}
                className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] cursor-pointer hover:border-[var(--primary)]/40 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--warning)] uppercase tracking-wider">
                    {t('calendar.tasksLabel')}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)]">{formatTime(task.due_at)}</span>
                </div>
                <h4 className="text-sm font-semibold text-[var(--foreground)] mt-1">{task.title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={task.status === 'completed' ? 'success' : 'neutral'}>
                    {task.status}
                  </Badge>
                  <span className="text-xs text-[var(--muted-foreground)]">{task.estimated_minutes} min</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <AppLayout title={t('nav.calendar')}>
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t('calendar.title')}</h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('calendar.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center p-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs font-semibold text-[var(--muted-foreground)] shadow-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'month' ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs' : 'hover:text-[var(--foreground)]'
              }`}
            >
              {t('calendar.month')}
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'day' ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs' : 'hover:text-[var(--foreground)]'
              }`}
            >
              {t('calendar.day')}
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setSelectedDateForNew(undefined);
              setIsEventModalOpen(true);
            }}
            className="rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>{t('calendar.newEvent')}</span>
          </Button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="flex items-center justify-between mb-6 bg-[var(--surface)] border border-[var(--border)] p-3 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrev} className="p-2">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleNext} className="p-2">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            {t('calendar.today')}
          </Button>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] capitalize">
          {formatDate(currentDate, { month: 'long', year: 'numeric' })}
        </h3>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
            <span>{t('calendar.legendEvents')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)]" />
            <span>{t('calendar.legendTasks')}</span>
          </div>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'month' ? renderMonthView() : renderDayView()}

      {/* Quick Add Event Modal */}
      <QuickAddEventDialog
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEventCreated={loadCalendarData}
        initialDate={selectedDateForNew}
      />

      {/* Item Details View Modal */}
      {viewingItem && (
        <Dialog
          isOpen={!!viewingItem}
          onClose={() => setViewingItem(null)}
          title={viewingItem.type === 'event' ? t('calendar.legendEvents') : t('calendar.legendTasks')}
          maxWidth="sm"
        >
          <div className="space-y-4 mt-2">
            <div>
              <h4 className="text-base font-bold text-[var(--foreground)]">{viewingItem.data.title}</h4>
              {viewingItem.data.description && (
                <p className="text-xs text-[var(--muted-foreground)] mt-1">{viewingItem.data.description}</p>
              )}
            </div>

            <div className="p-3 bg-[var(--surface-secondary)] rounded-xl text-xs space-y-1.5 border border-[var(--border)]">
              {viewingItem.type === 'event' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Inicio:</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatDate(viewingItem.data.starts_at)}, {formatTime(viewingItem.data.starts_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Fin:</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatDate(viewingItem.data.ends_at)}, {formatTime(viewingItem.data.ends_at)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Fecha límite:</span>
                    <span className="font-medium text-[var(--foreground)]">
                      {formatDate(viewingItem.data.due_at)}, {formatTime(viewingItem.data.due_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Duración estimada:</span>
                    <span className="font-medium text-[var(--foreground)]">{viewingItem.data.estimated_minutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Prioridad:</span>
                    <span className="font-medium capitalize text-[var(--foreground)]">{viewingItem.data.priority}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
              {viewingItem.type === 'event' ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteEvent(viewingItem.data.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('common.delete')}
                </Button>
              ) : (
                <div />
              )}
              <Button variant="outline" size="sm" onClick={() => setViewingItem(null)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </AppLayout>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <CalendarContent />
    </Suspense>
  );
}
