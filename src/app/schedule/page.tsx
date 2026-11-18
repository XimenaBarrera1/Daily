'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { ScheduleEntry } from '@/types';
import { Plus, Clock, Trash2, Edit2, CheckCircle2, XCircle } from 'lucide-react';

export default function SchedulePage() {
  const { locale, t, formatTime } = useI18n();

  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form states for new entry
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('university');
  const [weekday, setWeekday] = useState(1); // 1 = Monday
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('weekday', { ascending: true })
        .order('starts_at_time', { ascending: true });

      if (data) {
        setEntries(data as ScheduleEntry[]);
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Create entry
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user session');

      const { error: insertError } = await supabase.from('schedule_entries').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        weekday: Number(weekday),
        starts_at_time: startTime,
        ends_at_time: endTime,
        is_active: true,
      });

      if (insertError) throw insertError;

      setTitle('');
      setDescription('');
      setIsAddOpen(false);
      loadSchedule();
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active
  const handleToggleActive = async (entry: ScheduleEntry) => {
    const nextState = !entry.is_active;
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, is_active: nextState } : e))
    );

    try {
      const supabase = createClient();
      await supabase
        .from('schedule_entries')
        .update({ is_active: nextState })
        .eq('id', entry.id);
    } catch (err) {
      console.error('Error toggling active state:', err);
      loadSchedule();
    }
  };

  // Delete entry
  const handleDelete = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setDeletingId(null);

    try {
      const supabase = createClient();
      await supabase.from('schedule_entries').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting schedule entry:', err);
      loadSchedule();
    }
  };

  // Days list: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
  const displayDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <AppLayout title={t('nav.schedule')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t('schedule.title')}</h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('schedule.subtitle')}</p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsAddOpen(true)}
          className="rounded-xl shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>{t('schedule.newEntry')}</span>
        </Button>
      </div>

      {entries.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-12 text-center shadow-xs">
          <Clock className="w-10 h-10 text-[var(--muted-foreground)]/50 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-[var(--foreground)]">{t('schedule.emptySchedule')}</h4>
          <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto mt-1 mb-5 leading-relaxed">
            {t('schedule.emptyScheduleDesc')}
          </p>
          <Button variant="primary" size="sm" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            {t('schedule.newEntry')}
          </Button>
        </div>
      ) : (
        /* Weekly Timetable Grid */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {displayDays.map((dayNum) => {
            const dayEntries = entries.filter((e) => e.weekday === dayNum);
            const dayName = t(`schedule.days.${dayNum}`);

            return (
              <div
                key={dayNum}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-[var(--card-shadow)] flex flex-col"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)]">
                    {dayName}
                  </h3>
                  <span className="text-[11px] font-semibold text-[var(--muted-foreground)] bg-[var(--surface-secondary)] px-2 py-0.5 rounded-full">
                    {dayEntries.length}
                  </span>
                </div>

                {/* Day Schedule Items */}
                <div className="space-y-2.5 flex-1">
                  {dayEntries.length === 0 ? (
                    <p className="text-[11px] text-[var(--muted-foreground)]/50 italic py-4 text-center">
                      {locale === 'es' ? 'Libre' : 'Free'}
                    </p>
                  ) : (
                    dayEntries.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all ${
                          item.is_active
                            ? 'bg-[var(--primary-light)]/60 border-[var(--primary)]/20 text-[var(--foreground)] shadow-xs'
                            : 'bg-[var(--surface-secondary)]/50 border-[var(--border)] text-[var(--muted-foreground)] opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="text-xs font-semibold leading-tight">{item.title}</h4>
                          <button
                            onClick={() => handleToggleActive(item)}
                            title={item.is_active ? 'Desactivar compromiso' : 'Activar compromiso'}
                            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            {item.is_active ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-[var(--muted-foreground)] mb-2 font-mono">
                          <Clock className="w-3 h-3 text-[var(--primary)]" />
                          <span>
                            {formatTime(item.starts_at_time)} - {formatTime(item.ends_at_time)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/60 text-[10px]">
                          <span className="capitalize text-[var(--muted-foreground)]">{item.category}</span>
                          <button
                            onClick={() => setDeletingId(item.id)}
                            className="text-[var(--danger)] hover:underline"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Commitment Modal */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={t('schedule.newEntry')}
        description={t('schedule.subtitle')}
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          {error && (
            <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/30 rounded-xl text-xs text-[var(--danger)]">
              {error}
            </div>
          )}

          <Input
            label={t('schedule.entryTitle')}
            placeholder="ej. Cálculo Multivariable, Turno Biblioteca, Gimnasio..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label={t('tasks.taskDescription')}
            placeholder="Profesor, aula, notas de la clase..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                {t('schedule.weekday')}
              </label>
              <select
                value={weekday}
                onChange={(e) => setWeekday(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
              >
                <option value={1}>{t('schedule.days.1')}</option>
                <option value={2}>{t('schedule.days.2')}</option>
                <option value={3}>{t('schedule.days.3')}</option>
                <option value={4}>{t('schedule.days.4')}</option>
                <option value={5}>{t('schedule.days.5')}</option>
                <option value={6}>{t('schedule.days.6')}</option>
                <option value={0}>{t('schedule.days.0')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                {t('tasks.category')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
              >
                <option value="university">{t('tasks.catUniversity')}</option>
                <option value="work">{t('tasks.catWork')}</option>
                <option value="personal">{t('tasks.catPersonal')}</option>
                <option value="health">{t('tasks.catHealth')}</option>
                <option value="other">{t('tasks.catOther')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="time"
              label={t('schedule.startTime')}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
            <Input
              type="time"
              label={t('schedule.endTime')}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      {deletingId && (
        <Dialog
          isOpen={!!deletingId}
          onClose={() => setDeletingId(null)}
          title={t('common.delete')}
          maxWidth="sm"
        >
          <p className="text-xs text-[var(--muted-foreground)] mb-4">{t('schedule.deleteEntryConfirm')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => handleDelete(deletingId)}>
              {t('common.delete')}
            </Button>
          </div>
        </Dialog>
      )}
    </AppLayout>
  );
}
