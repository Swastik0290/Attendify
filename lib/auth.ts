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

    // If profile not found by auth user ID, search across entire database by email and roll number
    if (!studentProfile && user.email) {
      const cleanEmail = user.email.toLowerCase().trim()
      
      // 1. Search by exact or case-insensitive email
      const { data: byEmail } = await adminClient
        .from('student_profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .limit(1)

      if (byEmail && byEmail.length > 0) {
        const matched = byEmail[0]
        const oldId = matched.id
        studentProfile = matched
        if (oldId !== user.id) {
          try {
            await adminClient.from('enrollments').update({ student_id: user.id }).eq('student_id', oldId)
            await adminClient.from('attendance_records').update({ student_id: user.id }).eq('student_id', oldId)
            await adminClient.from('student_profiles').update({ id: user.id, email: cleanEmail }).eq('id', oldId)
            studentProfile = { ...matched, id: user.id }
          } catch { /* ignore */ }
        }
      } else {
        // 2. Search by roll number extracted from email (e.g. 124cs1001@nitrkl.ac.in -> 124CS1001)
        const rollCandidate = cleanEmail.split('@')[0].toUpperCase()
        if (rollCandidate.length >= 4) {
          const { data: byRoll } = await adminClient
            .from('student_profiles')
            .select('*')
            .ilike('roll_number', rollCandidate)
            .limit(1)

          if (byRoll && byRoll.length > 0) {
            const matched = byRoll[0]
            const oldId = matched.id
            studentProfile = matched
            if (oldId !== user.id) {
              try {
                await adminClient.from('enrollments').update({ student_id: user.id }).eq('student_id', oldId)
                await adminClient.from('attendance_records').update({ student_id: user.id }).eq('student_id', oldId)
                await adminClient.from('student_profiles').update({ id: user.id, email: cleanEmail }).eq('id', oldId)
                studentProfile = { ...matched, id: user.id, email: cleanEmail }
              } catch { /* ignore */ }
            }
          }
        }
      }
    }
  }

  return {
    userId: user.id,
    email: user.email || '',
    role,
    facultyProfile,
    studentProfile,
  }
}


