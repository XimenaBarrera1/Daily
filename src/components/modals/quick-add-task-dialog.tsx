'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { TaskPriority } from '@/types';

interface QuickAddTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
}

export function QuickAddTaskDialog({ isOpen, onClose, onTaskCreated }: QuickAddTaskDialogProps) {
  const { locale, t } = useI18n();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('university');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('45');
  const [reminderOffset, setReminderOffset] = useState<'none' | '0m' | '5m' | '15m' | '30m' | '1h' | '1d'>('15m');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError(locale === 'es' ? 'Debes iniciar sesión para guardar tareas.' : 'You must be signed in to save tasks.');
        setIsSubmitting(false);
        return;
      }

      let dueDateTime: string | null = null;
      if (dueDate) {
        const timePart = dueTime || '23:59';
        dueDateTime = new Date(`${dueDate}T${timePart}:00`).toISOString();
      }

      // 1. Insert Task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          category,
          subject: subject.trim(),
          priority,
          status: 'pending',
          due_at: dueDateTime,
          estimated_minutes: Number(estimatedMinutes) || 45,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // 2. Schedule Reminder if requested and task has due_at
      if (dueDateTime && reminderOffset !== 'none' && task) {
        let offsetMs = 0;
        if (reminderOffset === '5m') offsetMs = 5 * 60 * 1000;
        if (reminderOffset === '15m') offsetMs = 15 * 60 * 1000;
        if (reminderOffset === '30m') offsetMs = 30 * 60 * 1000;
        if (reminderOffset === '1h') offsetMs = 60 * 60 * 1000;
        if (reminderOffset === '1d') offsetMs = 24 * 60 * 60 * 1000;

        const scheduledTime = new Date(new Date(dueDateTime).getTime() - offsetMs).toISOString();

        await supabase.from('reminders').insert({
          user_id: user.id,
          task_id: task.id,
          scheduled_at: scheduledTime,
          channel: 'all',
          status: 'pending',
          idempotency_key: `task-${task.id}-${scheduledTime}`,
        });
      }

      // Reset form
      setTitle('');
      setDescription('');
      setSubject('');
      onClose();
      if (onTaskCreated) onTaskCreated();
      window.dispatchEvent(new CustomEvent('tempo:data-updated'));
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || t('common.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('tasks.newTask')}
      description={t('tasks.subtitle')}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 mt-2">
        {error && (
          <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger)]/30 rounded-xl text-xs text-[var(--danger)]">
            {error}
          </div>
        )}

        <Input
          label={t('tasks.taskTitle')}
          placeholder={locale === 'es' ? 'ej. Estudiar para examen de redes, Entrega Taller 2...' : 'e.g. Study for networks exam, Workshop 2 submission...'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t('tasks.subject')}
            placeholder={locale === 'es' ? 'ej. Redes, Cálculo I, Algoritmos...' : 'e.g. Networks, Calculus, Algorithms...'}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              {t('tasks.category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            >
              <option value="university">{t('tasks.catUniversity')}</option>
              <option value="work">{t('tasks.catWork')}</option>
              <option value="personal">{t('tasks.catPersonal')}</option>
              <option value="health">{t('tasks.catHealth')}</option>
              <option value="other">{t('tasks.catOther')}</option>
            </select>
          </div>
        </div>

        <Textarea
          label={t('tasks.taskDescription')}
          placeholder={locale === 'es' ? 'Notas adicionales, enlaces o detalles de entrega...' : 'Additional notes, links or submission details...'}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              {t('tasks.priority')}
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            >
              <option value="low">{t('tasks.lowPriority')}</option>
              <option value="medium">{t('tasks.mediumPriority')}</option>
              <option value="high">{t('tasks.highPriority')}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              {t('tasks.estimatedMinutes')}
            </label>
            <input
              type="number"
              min="5"
              step="5"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              className="w-full px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label={t('tasks.dueDate')}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <Input
            type="time"
            label={locale === 'es' ? 'Hora de entrega' : 'Due time'}
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
            {t('tasks.reminder')}
          </label>
          <select
            value={reminderOffset}
            onChange={(e) => setReminderOffset(e.target.value as any)}
            className="w-full px-3.5 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
          >
            <option value="none">{t('tasks.reminderNone')}</option>
            <option value="0m">{t('tasks.reminderAtDue')}</option>
            <option value="5m">{t('tasks.reminder5m')}</option>
            <option value="15m">{t('tasks.reminder15m')}</option>
            <option value="30m">{t('tasks.reminder30m')}</option>
            <option value="1h">{t('tasks.reminder1h')}</option>
            <option value="1d">{t('tasks.reminder1d')}</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
          >
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
