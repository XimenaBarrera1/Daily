'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Task, CalendarEvent, ScheduleEntry } from '@/types';
import {
  computeDailyRecommendation,
  DailyPlanRecommendation,
  PlannedTaskAllocation,
} from '@/lib/planner/algorithm';
import {
  Sparkles,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Save,
  Check,
  RotateCcw,
} from 'lucide-react';

function PlannerContent() {
  const { locale, t, formatDate, formatTime } = useI18n();

  const [planDate, setPlanDate] = useState<string>('2026-11-13');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setPlanDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Computed recommendation
  const [recommendation, setRecommendation] = useState<DailyPlanRecommendation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // 1. Fetch pending tasks
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('priority', { ascending: false });

      if (userTasks) setTasks(userTasks as Task[]);

      // 2. Fetch events for the plan date
      const { data: userEvents } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id);

      if (userEvents) {
        // Filter events that fall on planDate
        const filteredEvents = (userEvents as CalendarEvent[]).filter((e) =>
          e.starts_at.startsWith(planDate)
        );
        setEvents(filteredEvents);
      }

      // 3. Fetch recurring schedule entries for the plan date's day of week
      const targetDate = new Date(`${planDate}T12:00:00Z`);
      const targetWeekday = targetDate.getDay(); // 0 = Sunday

      const { data: userSchedule } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('weekday', targetWeekday)
        .eq('is_active', true);

      if (userSchedule) {
        setScheduleEntries(userSchedule as ScheduleEntry[]);
      }
    } catch (err) {
      console.error('Error loading planner data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [planDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Run the deterministic algorithm
  const handleGenerate = () => {
    const rec = computeDailyRecommendation({
      planDate,
      tasks,
      events,
      scheduleEntries,
      dayStartHour: 8,
      dayEndHour: 20,
    });
    setRecommendation(rec);
  };

  // Automatically generate recommendation once data is loaded
  useEffect(() => {
    if (!isLoading && tasks.length >= 0) {
      handleGenerate();
    }
  }, [tasks, events, scheduleEntries, planDate, isLoading]);

  // Save the daily plan to Supabase
  const handleSavePlan = async () => {
    if (!recommendation) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Upsert daily_plan
      const { data: plan, error: planError } = await supabase
        .from('daily_plans')
        .upsert(
          {
            user_id: user.id,
            plan_date: planDate,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,plan_date' }
        )
        .select()
        .single();

      if (planError) throw planError;

      // 2. Clear old items for this plan
      await supabase.from('daily_plan_items').delete().eq('daily_plan_id', plan.id);

      // 3. Insert items
      const itemsToInsert = recommendation.plannedTasks.map((pt, idx) => ({
        daily_plan_id: plan.id,
        task_id: pt.task.id,
        custom_title: pt.task.title,
        planned_start: new Date(`${planDate}T${pt.startFormatted}:00`).toISOString(),
        planned_end: new Date(`${planDate}T${pt.endFormatted}:00`).toISOString(),
        position: idx,
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('daily_plan_items')
          .insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving plan:', err);
      alert(err.message || 'Error saving daily plan');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout title={t('planner.title')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t('planner.title')}</h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('planner.subtitle')}</p>
        </div>

        {/* Date Selector & Save Actions */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            className="px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all shadow-xs"
          />

          <Button
            variant="outline"
            size="md"
            onClick={handleGenerate}
            className="rounded-xl shadow-xs"
            title="Recalcular"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleSavePlan}
            isLoading={isSaving}
            className="rounded-xl shadow-xs"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4 mr-1 text-white" />
                <span>{locale === 'es' ? '¡Guardado!' : 'Saved!'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                <span>{t('planner.savePlan')}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Overflow Warning Banner */}
      {recommendation?.hasOverflow && (
        <div className="bg-[var(--warning-light)] border border-[var(--warning)]/30 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-[var(--warning)]">
              {locale === 'es' ? 'Capacidad del día superada' : 'Day Capacity Exceeded'}
            </h4>
            <p className="text-xs text-[var(--warning)]/90 mt-1 leading-relaxed">
              {t('planner.overflowNotice')} (Exceso estimado: {recommendation.overflowMinutes} {t('common.minutes')}).
            </p>
          </div>
        </div>
      )}

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="hover:border-[var(--primary)]/40 transition-all">
          <CardContent className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('planner.availableTime')}
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-[var(--foreground)]">
                {Math.floor((recommendation?.totalAvailableMinutes || 0) / 60)}h{' '}
                {(recommendation?.totalAvailableMinutes || 0) % 60}m
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">08:00 - 20:00</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-[var(--primary)]/40 transition-all">
          <CardContent className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {locale === 'es' ? 'Tiempo requerido en tareas' : 'Estimated Task Work'}
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-[var(--primary)]">
                {Math.floor((recommendation?.totalEstimatedMinutes || 0) / 60)}h{' '}
                {(recommendation?.totalEstimatedMinutes || 0) % 60}m
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {tasks.length} {locale === 'es' ? 'tareas' : 'tasks'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-[var(--primary)]/40 transition-all">
          <CardContent className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {t('planner.commitments')}
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className="text-2xl font-bold text-[var(--foreground)]">
                {events.length + scheduleEntries.length}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">
                {events.length} {locale === 'es' ? 'eventos' : 'events'}, {scheduleEntries.length} {locale === 'es' ? 'clases/fijos' : 'classes'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two Column Planner Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Fixed Commitments & Free Time Overview */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-[var(--foreground)] mb-1">
              {t('planner.commitments')}
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              {formatDate(new Date(`${planDate}T12:00:00Z`), { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>

            {events.length === 0 && scheduleEntries.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4 text-center">
                {locale === 'es'
                  ? 'No hay compromisos fijos hoy. Todo tu día está disponible.'
                  : 'No fixed commitments today. Your entire day is available.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {/* Events */}
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-[var(--surface-secondary)] rounded-xl border border-[var(--border)] flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--foreground)]">{ev.title}</h4>
                      <p className="text-[11px] text-[var(--muted-foreground)] capitalize">{ev.category}</p>
                    </div>
                    <span className="text-xs font-mono font-medium text-[var(--primary)]">
                      {formatTime(ev.starts_at)} - {formatTime(ev.ends_at)}
                    </span>
                  </div>
                ))}

                {/* Recurring Schedule */}
                {scheduleEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-[var(--primary-light)]/60 rounded-xl border border-[var(--primary)]/20 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--foreground)]">{entry.title}</h4>
                      <p className="text-[11px] text-[var(--primary)]">
                        {locale === 'es' ? 'Horario fijo semanal' : 'Weekly fixed schedule'}
                      </p>
                    </div>
                    <span className="text-xs font-mono font-medium text-[var(--primary)]">
                      {formatTime(entry.starts_at_time)} - {formatTime(entry.ends_at_time)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unassigned Tasks if Overflow */}
          {recommendation?.unassignedTasks && recommendation.unassignedTasks.length > 0 && (
            <div className="bg-[var(--warning-light)]/40 border border-[var(--warning)]/30 rounded-3xl p-6 shadow-xs">
              <h3 className="text-sm font-semibold text-[var(--warning)] mb-1">
                {locale === 'es' ? 'Tareas no asignadas (posponer)' : 'Unassigned Tasks (postpone)'}
              </h3>
              <p className="text-xs text-[var(--warning)]/80 mb-3">
                {locale === 'es'
                  ? 'Estas tareas no cupieron en los bloques libres de hoy debido a su duración:'
                  : 'These tasks could not fit in today free slots due to duration:'}
              </p>
              <div className="space-y-2">
                {recommendation.unassignedTasks.map((t) => (
                  <div key={t.id} className="p-2.5 bg-[var(--surface)] rounded-xl border border-[var(--warning)]/30 text-xs shadow-xs">
                    <span className="font-semibold text-[var(--foreground)]">{t.title}</span>
                    <span className="text-[var(--muted-foreground)] block text-[11px]">
                      {t.estimated_minutes} min • {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Suggested Itinerary */}
        <div className="lg:col-span-7">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  {t('planner.plannedBlocks')}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{t('planner.orderHint')}</p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-[var(--primary)] font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>{locale === 'es' ? 'Optimizado' : 'Optimized'}</span>
              </div>
            </div>

            {!recommendation || recommendation.plannedTasks.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-secondary)]/40">
                <CheckCircle2 className="w-8 h-8 text-[var(--primary)] mx-auto mb-2" />
                <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto">{t('planner.noPending')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendation.plannedTasks.map((item, idx) => (
                  <div
                    key={item.task.id}
                    className="p-4 rounded-2xl border border-[var(--border)] hover:border-[var(--primary)]/40 bg-[var(--surface)] transition-all shadow-[var(--card-shadow)] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {idx + 1}
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-[var(--foreground)]">{item.task.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--muted-foreground)]">
                          <Badge
                            variant={
                              item.task.priority === 'high'
                                ? 'danger'
                                : item.task.priority === 'medium'
                                ? 'warning'
                                : 'neutral'
                            }
                          >
                            {item.task.priority}
                          </Badge>
                          <span>{item.task.estimated_minutes} min</span>
                          <span className="capitalize">• {item.task.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Planned Time Interval */}
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2.5 py-1 rounded-lg">
                        {item.startFormatted} - {item.endFormatted}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <PlannerContent />
    </Suspense>
  );
}
