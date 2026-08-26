import { createClient, createAdminClient } from './supabase/server'
import { UserRole, FacultyProfile, StudentProfile } from './types'

export interface AppUserSession {
  userId: string
  email: string
  role: UserRole
  facultyProfile?: FacultyProfile | null
  studentProfile?: StudentProfile | null
}


/**
 * Creates or ensures an auth user exists in auth.users & users_roles.
 */
export async function ensureAuthUser(id: string, email: string, role: UserRole) {
  const adminClient = createAdminClient()
  try {
    await adminClient.auth.admin.createUser({
      id,
      email,
      email_confirm: true,
      user_metadata: { role },
    })
  } catch {
    // User already exists in auth.users
  }

  await adminClient.from('users_roles').upsert({
    id,
    role,
  })
}

export async function getSession(): Promise<AppUserSession | null> {
  const adminClient = createAdminClient()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: roleRecord } = await adminClient
    .from('users_roles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: UserRole = roleRecord?.role || 'STUDENT'

  let facultyProfile: FacultyProfile | null = null
  let studentProfile: StudentProfile | null = null

  if (role === 'FACULTY') {
    const { data } = await adminClient
      .from('faculty_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    facultyProfile = data
  } else if (role === 'STUDENT') {
    const { data } = await adminClient
      .from('student_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    studentProfile = data
  }

  return {
    userId: user.id,
    email: user.email || '',
    role,
    facultyProfile,
    studentProfile,
  }
}

