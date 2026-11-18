'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';
import { createClient } from '@/lib/supabase/client';
import { Note } from '@/types';
import {
  BookOpen,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Tag,
  Clock,
  Sparkles,
  Bookmark,
} from 'lucide-react';

const LOCAL_STORAGE_NOTES_KEY = 'daily_workspace_notes';

function NotesContent() {
  const { locale, t, formatDate, formatTime } = useI18n();

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadNotes = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      // 1. Try to fetch from Supabase
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setNotes(data as Note[]);
        localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(data));
      } else {
        // Fallback to localStorage if table doesn't exist yet
        const local = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
        if (local) {
          setNotes(JSON.parse(local));
        }
      }
    } catch (err) {
      console.warn('Notes load fallback to local:', err);
      const local = localStorage.getItem(LOCAL_STORAGE_NOTES_KEY);
      if (local) {
        setNotes(JSON.parse(local));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Unique list of subjects
  const availableSubjects = Array.from(
    new Set(notes.map((n) => n.subject).filter((s): s is string => Boolean(s?.trim())))
  );

  // Handle Save Note (Create or Edit)
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setIsSubmitting(true);
    const nowIso = new Date().toISOString();

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (editingNote) {
        // Update existing note
        const updated: Note = {
          ...editingNote,
          title: formTitle.trim(),
          content: formContent.trim(),
          subject: formSubject.trim(),
          is_pinned: formIsPinned,
          updated_at: nowIso,
        };

        setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? updated : n)));

        if (user) {
          await supabase
            .from('notes')
            .update({
              title: updated.title,
              content: updated.content,
              subject: updated.subject,
              is_pinned: updated.is_pinned,
              updated_at: nowIso,
            })
            .eq('id', editingNote.id);
        }
      } else {
        // Create new note
        const newNote: Note = {
          id: crypto.randomUUID(),
          user_id: user?.id || 'local-user',
          title: formTitle.trim(),
          content: formContent.trim(),
          subject: formSubject.trim(),
          category: 'university',
          is_pinned: formIsPinned,
          created_at: nowIso,
          updated_at: nowIso,
        };

        setNotes((prev) => [newNote, ...prev]);

        if (user) {
          await supabase.from('notes').insert({
            id: newNote.id,
            user_id: user.id,
            title: newNote.title,
            content: newNote.content,
            subject: newNote.subject,
            category: 'university',
            is_pinned: newNote.is_pinned,
          });
        }
      }

      // Update local storage backup
      const updatedNotes = editingNote
        ? notes.map((n) => (n.id === editingNote.id ? { ...n, title: formTitle.trim(), content: formContent.trim(), subject: formSubject.trim(), is_pinned: formIsPinned, updated_at: nowIso } : n))
        : [{ id: crypto.randomUUID(), user_id: user?.id || 'local', title: formTitle.trim(), content: formContent.trim(), subject: formSubject.trim(), category: 'university', is_pinned: formIsPinned, created_at: nowIso, updated_at: nowIso }, ...notes];

      localStorage.setItem(LOCAL_STORAGE_NOTES_KEY, JSON.stringify(updatedNotes));

      // Close modal & reset
      setIsCreateOpen(false);
      setEditingNote(null);
      setFormTitle('');
      setFormContent('');
      setFormSubject('');
      setFormIsPinned(false);
    } catch (err) {
      console.warn('Note save notice:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Pin state
  const handleTogglePin = async (note: Note) => {
    const nextPinned = !note.is_pinned;
    const nowIso = new Date().toISOString();

    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, is_pinned: nextPinned, updated_at: nowIso } : n))
    );

    try {
      const supabase = createClient();
      await supabase
        .from('notes')
        .update({ is_pinned: nextPinned, updated_at: nowIso })
        .eq('id', note.id);
    } catch (err) {
      console.warn('Pin toggle notice:', err);
    }
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setDeletingNoteId(null);

    try {
      const supabase = createClient();
      await supabase.from('notes').delete().eq('id', id);
    } catch (err) {
      console.warn('Note delete notice:', err);
    }
  };

  // Open edit modal
  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormSubject(note.subject || '');
    setFormIsPinned(note.is_pinned);
    setIsCreateOpen(true);
  };

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    if (selectedSubject !== 'all' && note.subject !== selectedSubject) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = note.title.toLowerCase().includes(q);
      const matchContent = note.content.toLowerCase().includes(q);
      const matchSubject = note.subject?.toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchSubject) return false;
    }
    return true;
  });

  const pinnedNotes = filteredNotes.filter((n) => n.is_pinned);
  const otherNotes = filteredNotes.filter((n) => !n.is_pinned);

  return (
    <AppLayout title={t('nav.notes')}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <span>{t('notes.title')}</span>
          </h2>
          <p className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{t('notes.subtitle')}</p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setEditingNote(null);
            setFormTitle('');
            setFormContent('');
            setFormSubject('');
            setFormIsPinned(false);
            setIsCreateOpen(true);
          }}
          className="rounded-xl shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" />
          <span>{t('notes.newNote')}</span>
        </Button>
      </div>

      {/* Search and Subject Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-6">
        {/* Search */}
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[var(--muted-foreground)]/60" />
          <input
            type="text"
            placeholder={locale === 'es' ? 'Buscar apuntes o conceptos clave...' : 'Search notes or key concepts...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
          />
        </div>

        {/* Subject Filter */}
        <div className="sm:col-span-4">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-xs sm:text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 transition-all"
          >
            <option value="all">{locale === 'es' ? 'Todas las materias' : 'All subjects'}</option>
            {availableSubjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty State */}
      {filteredNotes.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-12 text-center shadow-xs">
          <BookOpen className="w-10 h-10 text-[var(--primary)] mx-auto mb-3 opacity-80" />
          <h4 className="text-base font-semibold text-[var(--foreground)]">{t('notes.emptyNotes')}</h4>
          <p className="text-xs text-[var(--muted-foreground)] max-w-md mx-auto mt-1 mb-5 leading-relaxed">
            {t('notes.emptyNotesDesc')}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingNote(null);
              setFormTitle('');
              setFormContent('');
              setFormSubject('');
              setFormIsPinned(false);
              setIsCreateOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            {t('notes.newNote')}
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pinned Section */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <Pin className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{t('notes.pinnedNotes')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    locale={locale}
                    formatDate={formatDate}
                    onEdit={() => openEditModal(note)}
                    onTogglePin={() => handleTogglePin(note)}
                    onDelete={() => setDeletingNoteId(note.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Notes Section */}
          <div>
            {pinnedNotes.length > 0 && (
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{t('notes.allNotes')}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  locale={locale}
                  formatDate={formatDate}
                  onEdit={() => openEditModal(note)}
                  onTogglePin={() => handleTogglePin(note)}
                  onDelete={() => setDeletingNoteId(note.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Note Dialog */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingNote(null);
        }}
        title={editingNote ? t('notes.editNote') : t('notes.newNote')}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveNote} className="space-y-4 mt-2">
          <Input
            label={t('notes.noteTitle')}
            placeholder="ej. Resumen de Capítulos 1 y 2 - Redes..."
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label={t('notes.subject')}
              placeholder={t('notes.subjectPlaceholder')}
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
            />

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--foreground)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsPinned}
                  onChange={(e) => setFormIsPinned(e.target.checked)}
                  className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <Pin className="w-3.5 h-3.5 text-[var(--primary)]" />
                <span>{t('notes.pin')}</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1.5">
              {locale === 'es' ? 'Contenido del apunte' : 'Note content'}
            </label>
            <textarea
              rows={8}
              placeholder={t('notes.noteContent')}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="w-full p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] hover:border-[var(--primary)]/40 leading-relaxed font-sans transition-all"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setEditingNote(null);
              }}
            >
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

      {/* Delete Confirmation Dialog */}
      {deletingNoteId && (
        <Dialog
          isOpen={!!deletingNoteId}
          onClose={() => setDeletingNoteId(null)}
          title={t('common.delete')}
          maxWidth="sm"
        >
          <p className="text-xs text-[var(--muted-foreground)] mb-4">{t('common.confirmDelete')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingNoteId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={() => handleDeleteNote(deletingNoteId)}>
              {t('common.delete')}
            </Button>
          </div>
        </Dialog>
      )}
    </AppLayout>
  );
}

function NoteCard({
  note,
  locale,
  formatDate,
  onEdit,
  onTogglePin,
  onDelete,
}: {
  note: Note;
  locale: string;
  formatDate: any;
  onEdit: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-5 hover:border-[var(--primary)]/40 transition-all shadow-[var(--card-shadow)] hover:shadow-[var(--card-shadow-hover)] flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          {note.subject ? (
            <span className="text-[11px] font-semibold text-[var(--primary)] bg-[var(--primary-light)] px-2.5 py-0.5 rounded-full inline-block">
              {note.subject}
            </span>
          ) : (
            <span className="text-[11px] text-[var(--muted-foreground)]/60">
              {locale === 'es' ? 'Apunte general' : 'General note'}
            </span>
          )}

          <button
            onClick={onTogglePin}
            className={`p-1.5 rounded-lg transition-colors ${
              note.is_pinned
                ? 'text-[var(--primary)] bg-[var(--primary-light)]'
                : 'text-[var(--muted-foreground)]/60 hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
            }`}
            title={note.is_pinned ? 'Desfijar' : 'Fijar'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        </div>

        <h4 className="text-sm sm:text-base font-bold text-[var(--foreground)] tracking-tight mb-1.5 line-clamp-2">
          {note.title}
        </h4>

        {note.content && (
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed line-clamp-4 whitespace-pre-line mb-3 font-normal">
            {note.content}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
        <span>
          {formatDate(note.updated_at, { month: 'short', day: 'numeric' })}
        </span>

        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <NotesContent />
    </Suspense>
  );
}
