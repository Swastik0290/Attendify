/**
 * Run this SQL in Supabase SQL Editor to add the email and passkeys columns.
 * This is safe to run even if columns already exist (uses IF NOT EXISTS).
 */

-- Add email column to faculty_profiles if not present
ALTER TABLE public.faculty_profiles 
  ADD COLUMN IF NOT EXISTS email text;

-- Add email column to student_profiles if not present  
ALTER TABLE public.student_profiles 
  ADD COLUMN IF NOT EXISTS email text;

-- Create passkeys table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.passkeys (
  id text PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  public_key bytea NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  transports text[],
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- Enable RLS on passkeys
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

-- Passkey policies (safe to re-run)
DROP POLICY IF EXISTS "Students can read own passkeys" ON public.passkeys;
DROP POLICY IF EXISTS "Students can manage own passkeys" ON public.passkeys;

CREATE POLICY "Students can read own passkeys" ON public.passkeys 
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can manage own passkeys" ON public.passkeys 
  FOR ALL USING (student_id = auth.uid());
