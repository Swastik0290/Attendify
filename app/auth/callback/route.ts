import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  const adminClient = createAdminClient()

  // ─── Check existing role ──────────────────────────────────────────────────
  const { data: roleRecord } = await adminClient
    .from('users_roles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleRecord) {
    // User already has a role — route them appropriately
    const destination = getDestination(roleRecord.role, next)
    return redirectTo(origin, destination, request)
  }

  // ─── New user — figure out who they are ──────────────────────────────────
  const email = user.email?.toLowerCase() || ''

  // 1. Check if they match a faculty_profiles entry by email
  const { data: facultyByEmail } = await adminClient
    .from('faculty_profiles')
    .select('id, status')
    .eq('email', email)
    .single()

  if (facultyByEmail) {
    // Relink this Google auth ID to the existing faculty profile
    await adminClient.from('users_roles').upsert({ id: user.id, role: 'FACULTY' })
    if (facultyByEmail.id !== user.id) {
      await adminClient
        .from('faculty_profiles')
        .update({ id: user.id })
        .eq('id', facultyByEmail.id)
      // Clean up the old placeholder auth user if it was a system-created one
      try {
        await adminClient.auth.admin.deleteUser(facultyByEmail.id)
      } catch {
        // Old ID may not exist or may be a real user — ignore
      }
    }
    return redirectTo(origin, '/faculty', request)
  }

  // 2. Check if they match a student_profiles entry by exact email match
  const { data: studentByEmail } = await adminClient
    .from('student_profiles')
    .select('id, roll_number, email')
    .eq('email', email)
    .single()

  if (studentByEmail) {
    return await relinkStudentAndRedirect(
      adminClient, user, studentByEmail, origin, request
    )
  }

  // 3. Fallback: if email is rollnumber@nitrkl.ac.in, look up by roll number
  if (email.endsWith('@nitrkl.ac.in')) {
    const rollFromEmail = email.split('@')[0].toUpperCase()
    const { data: studentByRoll } = await adminClient
      .from('student_profiles')
      .select('id, roll_number, email')
      .eq('roll_number', rollFromEmail)
      .single()

    if (studentByRoll) {
      return await relinkStudentAndRedirect(
        adminClient, user, studentByRoll, origin, request
      )
    }
  }

  // 4. Brand new user — default to STUDENT
  await adminClient.from('users_roles').insert({ id: user.id, role: 'STUDENT' })

  return redirectTo(origin, next === '/' ? '/student' : next, request)
}

/**
 * Relinks a pre-created student profile to the newly signed-in user's real auth ID.
 * Handles cascading FK updates and cleanup of the old placeholder auth user.
 */
async function relinkStudentAndRedirect(
  adminClient: ReturnType<typeof createAdminClient>,
  user: { id: string; email?: string },
  studentProfile: { id: string; roll_number: string; email?: string | null },
  origin: string,
  request: Request
) {
  const { id: oldStudentId } = studentProfile

  if (oldStudentId === user.id) {
    // Already linked — ensure role exists and route
    await adminClient.from('users_roles').upsert({ id: user.id, role: 'STUDENT' })
    return redirectTo(origin, '/student', request)
  }

  try {
    // Step 1: Create role for new auth ID
    await adminClient.from('users_roles').upsert({ id: user.id, role: 'STUDENT' })

    // Step 2: Reassign related records to new ID
    await adminClient
      .from('enrollments')
      .update({ student_id: user.id })
      .eq('student_id', oldStudentId)

    await adminClient
      .from('attendance_records')
      .update({ student_id: user.id })
      .eq('student_id', oldStudentId)

    // Step 3: Update student_profiles to point to new auth ID + sync real email
    await adminClient
      .from('student_profiles')
      .update({
        id: user.id,
        // Update email to the actual sign-in email so future lookups work
        ...(user.email ? { email: user.email.toLowerCase() } : {}),
      })
      .eq('id', oldStudentId)

    // Step 4: Delete the old placeholder users_roles row
    await adminClient.from('users_roles').delete().eq('id', oldStudentId)

    // Step 5: Clean up old placeholder auth user (was system-created with roll@nitrkl.ac.in)
    try {
      await adminClient.auth.admin.deleteUser(oldStudentId)
    } catch {
      // Ignore — old placeholder user may not exist in auth.users
    }
  } catch (err) {
    console.error('Student profile relink failed:', err)
    // Even if relink fails, let them sign in as a new student — don't block them
    await adminClient.from('users_roles').upsert({ id: user.id, role: 'STUDENT' })
  }

  return redirectTo(origin, '/student', request)
}

function getDestination(role: string, fallback: string): string {
  if (role === 'SUPER_ADMIN') return '/admin'
  if (role === 'FACULTY') return '/faculty'
  if (role === 'STUDENT') return '/student'
  return fallback
}

function redirectTo(origin: string, path: string, request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocal = process.env.NODE_ENV === 'development'
  if (isLocal) return NextResponse.redirect(`${origin}${path}`)
  if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${path}`)
  return NextResponse.redirect(`${origin}${path}`)
}
