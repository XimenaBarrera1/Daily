'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Task, TaskPriority, TaskStatus } from '@/types';
import {
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  AlertCircle,
  Timer,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { QuickAddTaskDialog } from '@/components/modals/quick-add-task-dialog';

function TasksContent() {
  const { locale, t, formatDate, formatTime } = useI18n();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'completed' | 'overdue'>('today');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'due_at' | 'priority' | 'created_at'>('due_at');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) {
        setTasks(data as Task[]);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(new Date());
    loadTasks();
    const handleUpdate = () => {
      setNow(new Date());
      loadTasks();
    };
    window.addEventListener('tempo:data-updated', handleUpdate);
    return () => window.removeEventListener('tempo:data-updated', handleUpdate);
  }, [loadTasks]);

  // Toggle completion
  const handleToggleComplete = async (task: Task) => {
    const isNowCompleted = task.status !== 'completed';
    const newStatus: TaskStatus = isNowCompleted ? 'completed' : 'pending';
    const completedAt = isNowCompleted ? new Date().toISOString() : null;

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus, completed_at: completedAt } : t))
    );

    try {
      const supabase = createClient();
      await supabase
        .from('tasks')
        .update({ status: newStatus, completed_at: completedAt })
        .eq('id', task.id);
    } catch (err) {
      console.error('Error updating task status:', err);
      loadTasks();
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeletingTaskId(null);

    try {
      const supabase = createClient();
      await supabase.from('tasks').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting task:', err);
      loadTasks();
    }
  };

  // Edit task save
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      const supabase = createClient();
      await supabase
        .from('tasks')
        .update({
          title: editingTask.title,
          description: editingTask.description,
          category: editingTask.category,
          priority: editingTask.priority,
          due_at: editingTask.due_at,
          estimated_minutes: editingTask.estimated_minutes,
        })
        .eq('id', editingTask.id);

      setEditingTask(null);
      loadTasks();
    } catch (err) {
      console.error('Error editing task:', err);
    }
  };

  // Filter tasks
  const currentNow = now || new Date('2026-11-13T00:00:00Z');
  const todayStr = now ? now.toISOString().split('T')[0] : '';

  const filteredTasks = tasks.filter((task) => {
    // 1. Tab filter
    if (activeTab === 'today') {
      if (!task.due_at || task.status === 'completed' || !todayStr) return false;
      if (!task.due_at.startsWith(todayStr)) return false;
    } else if (activeTab === 'upcoming') {
      if (!task.due_at || task.status === 'completed') return false;
      if (task.due_at.startsWith(todayStr) || new Date(task.due_at) < currentNow) return false;
    } else if (activeTab === 'completed') {
      if (task.status !== 'completed') return false;
    } else if (activeTab === 'overdue') {
      if (!task.due_at || task.status === 'completed') return false;
      if (new Date(task.due_at) >= currentNow || task.due_at.startsWith(todayStr)) return false;
    }

    // 2. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    // 3. Category filter
    if (categoryFilter !== 'all' && task.category !== categoryFilter) {
      return false;
    }

    // 4. Priority filter
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === 'priority') {
      const weights = { high: 3, medium: 2, low: 1 };
      return (weights[b.priority] || 2) - (weights[a.priority] || 2);
    }
    if (sortBy === 'due_at') {
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <AppLayout title={t('tasks.title')}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{t('tasks.title')}</h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('tasks.subtitle')}</p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-xl shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>{t('tasks.newTask')}</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full sm:w-auto overflow-x-auto mb-6 select-none shadow-xs">
        {(['today', 'upcoming', 'all', 'overdue', 'completed'] as const).map((tab) => {
          const isActive = activeTab === tab;
          const count =
            tab === 'all'
              ? tasks.length
              : tab === 'today'
              ? tasks.filter((t) => t.due_at?.startsWith(todayStr) && t.status !== 'completed').length
              : tab === 'upcoming'
              ? tasks.filter((t) => t.due_at && new Date(t.due_at) > currentNow && !t.due_at.startsWith(todayStr) && t.status !== 'completed').length
              : tab === 'overdue'
              ? tasks.filter((t) => t.due_at && new Date(t.due_at) < currentNow && !t.due_at.startsWith(todayStr) && t.status !== 'completed').length
              : tasks.filter((t) => t.status === 'completed').length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <span>{t(`tasks.${tab}`)}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--surface-secondary)] text-[var(--muted-foreground)]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6">
        {/* Search */}
        <div className="sm:col-span-5 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--muted-foreground)]/60" />
          <input
            type="text"
            placeholder={t('tasks.searchTasks')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:col-span-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
          >
            <option value="all">{t('common.all')} ({t('tasks.category')})</option>
            <option value="university">{t('tasks.catUniversity')}</option>
            <option value="work">{t('tasks.catWork')}</option>
            <option value="personal">{t('tasks.catPersonal')}</option>
            <option value="health">{t('tasks.catHealth')}</option>
            <option value="other">{t('tasks.catOther')}</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="sm:col-span-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
          >
            <option value="all">{t('common.all')} ({t('tasks.priority')})</option>
            <option value="high">{t('tasks.highPriority')}</option>
            <option value="medium">{t('tasks.mediumPriority')}</option>
            <option value="low">{t('tasks.lowPriority')}</option>
          </select>
        </div>

        {/* Sort */}
        <div className="sm:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
          >
            <option value="due_at">{t('tasks.dueDate')}</option>
            <option value="priority">{t('tasks.priority')}</option>
            <option value="created_at">{t('common.date')}</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2.5">
        {sortedTasks.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-12 text-center shadow-xs">
            <Clock className="w-10 h-10 text-[var(--muted-foreground)]/50 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-[var(--foreground)]">{t('tasks.emptyTasks')}</h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto mt-1 mb-5">
              {t('tasks.emptyTasksAction')}
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              {t('tasks.newTask')}
            </Button>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isTaskOverdue =
              task.due_at && new Date(task.due_at) < currentNow && !task.due_at.startsWith(todayStr) && !isCompleted;

            return (
              <div
                key={task.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-3 ${
                  isCompleted
                    ? 'bg-[var(--surface-secondary)]/50 border-[var(--border)] opacity-65'
                    : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--primary)]/40 shadow-[var(--card-shadow)]'
                }`}
              >
                {/* Left info */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleComplete(task)}
                    className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                      isCompleted
                        ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                        : 'border-2 border-[var(--border)] hover:border-[var(--primary)]'
                    }`}
                    aria-label="Toggle task completion"
                  >
                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div>
                    <h4
                      className={`text-sm font-semibold text-[var(--foreground)] ${
                        isCompleted ? 'line-through text-[var(--muted-foreground)]' : ''
                      }`}
                    >
                      {task.title}
                    </h4>

                    {task.description && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-[var(--muted-foreground)]">
                      <Badge variant="neutral" className="capitalize">
                        {task.category}
                      </Badge>

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

                      <span>{task.estimated_minutes} min</span>

                      {task.due_at && (
                        <span className={`flex items-center gap-1 ${isTaskOverdue ? 'text-[var(--danger)] font-semibold' : ''}`}>
                          • {formatDate(task.due_at, { month: 'short', day: 'numeric' })}, {formatTime(task.due_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-1 self-end sm:self-center">
                  <Link
                    href={`/focus?taskId=${task.id}`}
                    title={t('dashboard.startFocus')}
                    className="p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-xl transition-colors"
                  >
                    <Timer className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-xl transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeletingTaskId(task.id)}
                    className="p-2 text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-xl transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <QuickAddTaskDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTaskCreated={loadTasks}
      />

      {/* Edit Dialog */}
      {editingTask && (
        <Dialog
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          title={t('tasks.editTask')}
        >
          <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
            <Input
              label={t('tasks.taskTitle')}
              value={editingTask.title}
              onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
              required
            />

            <Input
              label={t('tasks.taskDescription')}
              value={editingTask.description || ''}
              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  {t('tasks.category')}
                </label>
                <select
                  value={editingTask.category}
                  onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                >
                  <option value="university">{t('tasks.catUniversity')}</option>
                  <option value="work">{t('tasks.catWork')}</option>
                  <option value="personal">{t('tasks.catPersonal')}</option>
                  <option value="health">{t('tasks.catHealth')}</option>
                  <option value="other">{t('tasks.catOther')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
                  {t('tasks.priority')}
                </label>
                <select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                >
                  <option value="low">{t('tasks.lowPriority')}</option>
                  <option value="medium">{t('tasks.mediumPriority')}</option>
                  <option value="high">{t('tasks.highPriority')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="datetime-local"
                label={t('tasks.dueDate')}
                value={editingTask.due_at ? editingTask.due_at.slice(0, 16) : ''}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    due_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                  })
                }
              />
              <Input
                type="number"
                label={t('tasks.estimatedMinutes')}
                value={editingTask.estimated_minutes}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, estimated_minutes: Number(e.target.value) || 30 })
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button type="button" variant="outline" onClick={() => setEditingTask(null)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingTaskId && (
        <Dialog
          isOpen={!!deletingTaskId}
          onClose={() => setDeletingTaskId(null)}
          title={t('common.delete')}
          maxWidth="sm"
        >
          <p className="text-xs text-[var(--muted-foreground)] mb-4">{t('common.confirmDelete')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingTaskId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => handleDeleteTask(deletingTaskId)}>
              {t('common.delete')}
            </Button>
          </div>
        </Dialog>
      )}
    </AppLayout>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <TasksContent />
    </Suspense>
  );
}
