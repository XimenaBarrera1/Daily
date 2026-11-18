-- ==============================================================================
-- DAILY: Extension for University Workspace (Notes, Themes & Workspace Layout)
-- ==============================================================================

-- 1. Add theme and layout customization columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'sage';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workspace_layout JSONB DEFAULT '{"showFocus":true,"showDeadlines":true,"showSchedule":true,"showNotes":true}'::jsonb;

-- 2. Notes Table (Academic & Personal Notebooks)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'university',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  color TEXT DEFAULT 'default',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Add subject column to tasks and schedule_entries if not present
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';

-- 4. Enable RLS on notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policy if any and recreate
DROP POLICY IF EXISTS "Users manage own notes" ON public.notes;
CREATE POLICY "Users manage own notes"
  ON public.notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Trigger for updated_at on notes
DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON public.notes(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON public.notes(user_id, updated_at DESC);
