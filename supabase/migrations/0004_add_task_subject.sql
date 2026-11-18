-- Ensure existing Supabase projects have the subject field used by task creation.
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT '';

-- Refresh PostgREST so the new column is immediately available through the API.
NOTIFY pgrst, 'reload schema';
