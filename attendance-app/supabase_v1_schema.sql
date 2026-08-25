-- 1. Enums
CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'FACULTY', 'STUDENT');
CREATE TYPE faculty_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'CLOSED');

-- 2. Tables

-- users_roles (Extends auth.users to provide role without circular RLS)
CREATE TABLE public.users_roles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'STUDENT',
  created_at timestamptz DEFAULT now()
);
-- We use a secure function to fetch role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users_roles WHERE id = auth.uid();
$$;

-- faculty_profiles
CREATE TABLE public.faculty_profiles (
  id uuid PRIMARY KEY REFERENCES public.users_roles(id) ON DELETE CASCADE,
  name text NOT NULL,
  status faculty_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION public.get_faculty_status()
RETURNS faculty_status
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status FROM public.faculty_profiles WHERE id = auth.uid();
$$;

-- student_profiles
CREATE TABLE public.student_profiles (
  id uuid PRIMARY KEY REFERENCES public.users_roles(id) ON DELETE CASCADE,
  roll_number text UNIQUE NOT NULL,
  name text NOT NULL,
  derived_program text,
  derived_year text,
  derived_department text,
  derived_serial text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- roll_schemas
CREATE TABLE public.roll_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_global boolean DEFAULT true,
  config jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- subjects
CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  faculty_id uuid NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- enrollments
CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, subject_id)
);

-- attendance_sessions
CREATE TABLE public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES public.faculty_profiles(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'ACTIVE',
  started_at timestamptz DEFAULT now(),
  closed_at timestamptz
);

-- attendance_records
CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  scanned_at timestamptz DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- qr_nonces (for replay prevention)
CREATE TABLE public.qr_nonces (
  nonce text PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  used_at timestamptz DEFAULT now()
);

-- passkeys (for WebAuthn)
CREATE TABLE public.passkeys (
  id text PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  public_key bytea NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  transports text[],
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now()
);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.users_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roll_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can do everything on users_roles" ON public.users_roles FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Users can read own role" ON public.users_roles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Super admins can do everything on faculty" ON public.faculty_profiles FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Faculty can read own profile" ON public.faculty_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Anyone can read approved faculty" ON public.faculty_profiles FOR SELECT USING (status = 'APPROVED');

CREATE POLICY "Super admins can do everything on students" ON public.student_profiles FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Students can read own profile" ON public.student_profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Faculty can read enrolled students" ON public.student_profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.subjects sub ON e.subject_id = sub.id
    WHERE e.student_id = public.student_profiles.id AND sub.faculty_id = auth.uid()
  )
);

CREATE POLICY "Anyone can read roll_schemas" ON public.roll_schemas FOR SELECT USING (true);
CREATE POLICY "Super admins can modify roll_schemas" ON public.roll_schemas FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');

CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Super admins can modify subjects" ON public.subjects FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Faculty can modify own subjects" ON public.subjects FOR ALL USING (
  public.get_user_role() = 'FACULTY' AND public.get_faculty_status() = 'APPROVED' AND faculty_id = auth.uid()
);

CREATE POLICY "Anyone can read enrollments" ON public.enrollments FOR SELECT USING (true);
CREATE POLICY "Super admins can modify enrollments" ON public.enrollments FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Faculty can modify enrollments for own subjects" ON public.enrollments FOR ALL USING (
  public.get_user_role() = 'FACULTY' AND public.get_faculty_status() = 'APPROVED' AND 
  EXISTS (SELECT 1 FROM public.subjects WHERE id = subject_id AND faculty_id = auth.uid())
);

CREATE POLICY "Anyone can read sessions" ON public.attendance_sessions FOR SELECT USING (true);
CREATE POLICY "Super admins can modify sessions" ON public.attendance_sessions FOR ALL USING (public.get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Faculty can modify own sessions" ON public.attendance_sessions FOR ALL USING (
  public.get_user_role() = 'FACULTY' AND public.get_faculty_status() = 'APPROVED' AND faculty_id = auth.uid()
);

CREATE POLICY "Super admins can read all attendance" ON public.attendance_records FOR SELECT USING (public.get_user_role() = 'SUPER_ADMIN');
CREATE POLICY "Faculty can read own session attendance" ON public.attendance_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.attendance_sessions WHERE id = session_id AND faculty_id = auth.uid())
);
CREATE POLICY "Students can read own attendance" ON public.attendance_records FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Server actions manage nonces" ON public.qr_nonces FOR ALL USING (false); -- Only accessible via service role

CREATE POLICY "Students can read own passkeys" ON public.passkeys FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can manage own passkeys" ON public.passkeys FOR ALL USING (student_id = auth.uid());

-- 4. Initial default schema
INSERT INTO public.roll_schemas (name, is_global, config)
VALUES ('Default Engineering Schema', true, '{"segments": [{"name": "Program", "length": 1, "type": "numeric"}, {"name": "Year", "length": 2, "type": "numeric"}, {"name": "Department", "length": 2, "type": "alphanumeric"}, {"name": "Serial", "length": 4, "type": "numeric"}]}')
ON CONFLICT DO NOTHING;
