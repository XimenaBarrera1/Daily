'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';

interface QuickAddEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
  initialDate?: string; // YYYY-MM-DD
}

export function QuickAddEventDialog({
  isOpen,
  onClose,
  onEventCreated,
  initialDate,
}: QuickAddEventDialogProps) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('personal');
  const [startDate, setStartDate] = useState(initialDate || '');
  const [startTime, setStartTime] = useState('10:00');
  const [endDate, setEndDate] = useState(initialDate || '');
  const [endTime, setEndTime] = useState('11:00');
  const [reminderOffset, setReminderOffset] = useState('15m');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0];
      if (!startDate) setStartDate(initialDate || today);
      if (!endDate) setEndDate(initialDate || today);
    }
  }, [isOpen, initialDate, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('auth.nameRequired'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('No active session');
        setIsSubmitting(false);
        return;
      }

      const startsAt = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endsAt = new Date(`${endDate}T${endTime}:00`).toISOString();

      // 1. Insert Event
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          starts_at: startsAt,
          ends_at: endsAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
        })
        .select()
        .single();

      if (eventError) throw eventError;

      // 2. Schedule Reminder
      if (reminderOffset !== 'none' && event) {
        let offsetMs = 15 * 60 * 1000;
        if (reminderOffset === '0m') offsetMs = 0;
        if (reminderOffset === '5m') offsetMs = 5 * 60 * 1000;
        if (reminderOffset === '15m') offsetMs = 15 * 60 * 1000;
        if (reminderOffset === '30m') offsetMs = 30 * 60 * 1000;
        if (reminderOffset === '1h') offsetMs = 60 * 60 * 1000;
        if (reminderOffset === '1d') offsetMs = 24 * 60 * 60 * 1000;

        const scheduledTime = new Date(new Date(startsAt).getTime() - offsetMs).toISOString();

        await supabase.from('reminders').insert({
          user_id: user.id,
          event_id: event.id,
          scheduled_at: scheduledTime,
          channel: 'all',
          status: 'pending',
          idempotency_key: `event-${event.id}-${scheduledTime}`,
        });
      }

      setTitle('');
      setDescription('');
      onClose();
      if (onEventCreated) onEventCreated();
    } catch (err: any) {
      console.error('Error creating event:', err);
      setError(err.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('calendar.newEvent')}
      description={t('calendar.subtitle')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {error && (
          <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/30 rounded-xl text-xs text-[var(--danger)]">
            {error}
          </div>
        )}

        <Input
          label={t('calendar.eventTitle')}
          placeholder="ej. Reunión de equipo, Consulta médica..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <Textarea
          label={t('calendar.eventDescription')}
          placeholder="Lugar, enlace de videollamada, detalles..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              {t('tasks.category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            >
              <option value="personal">{t('tasks.catPersonal')}</option>
              <option value="university">{t('tasks.catUniversity')}</option>
              <option value="work">{t('tasks.catWork')}</option>
              <option value="health">{t('tasks.catHealth')}</option>
              <option value="other">{t('tasks.catOther')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              {t('tasks.reminderOffset')}
            </label>
            <select
              value={reminderOffset}
              onChange={(e) => setReminderOffset(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            >
              <option value="none">{t('tasks.noReminder')}</option>
              <option value="0m">{t('tasks.remindAtDue')}</option>
              <option value="5m">{t('tasks.remind5m')}</option>
              <option value="15m">{t('tasks.remind15m')}</option>
              <option value="30m">{t('tasks.remind30m')}</option>
              <option value="1h">{t('tasks.remind1h')}</option>
              <option value="1d">{t('tasks.remind1d')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Fecha inicio"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="time"
            label="Hora inicio"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Fecha fin"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Input
            type="time"
            label="Hora fin"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
