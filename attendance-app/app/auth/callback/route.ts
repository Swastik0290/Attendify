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
    // Move the faculty_profile row to point to new auth ID
    // (This handles: admin pre-created faculty, now they log in via Google)
    await adminClient.from('users_roles').upsert({ id: user.id, role: 'FACULTY' })
    // Update faculty_profiles if id changed
    if (facultyByEmail.id !== user.id) {
      // Remap: update references then profile id
      await adminClient
        .from('faculty_profiles')
        .update({ id: user.id })
        .eq('id', facultyByEmail.id)
    }
    return redirectTo(origin, '/faculty', request)
  }

  // 2. Check if they match a student_profiles entry by email
  const { data: studentByEmail } = await adminClient
    .from('student_profiles')
    .select('id, roll_number')
    .eq('email', email)
    .single()

  if (studentByEmail && studentByEmail.id !== user.id) {
    // Student was pre-created by roster import — relink to their real Google Auth ID
    // We need to: create a users_roles for the new id, update student_profiles.id
    // But student_profiles.id is a FK to users_roles.id, so we need a transaction-style approach

    // 1. Create users_roles for new auth id
    await adminClient.from('users_roles').upsert({ id: user.id, role: 'STUDENT' })

    // 2. Reassign enrollment and attendance records to new ID before updating profile
    await adminClient
      .from('enrollments')
      .update({ student_id: user.id })
      .eq('student_id', studentByEmail.id)

    await adminClient
      .from('attendance_records')
      .update({ student_id: user.id })
      .eq('student_id', studentByEmail.id)

    // 3. Update student_profiles to point to new auth ID
    await adminClient
      .from('student_profiles')
      .update({ id: user.id })
      .eq('id', studentByEmail.id)

    // 4. Delete the old placeholder users_roles row
    await adminClient
      .from('users_roles')
      .delete()
      .eq('id', studentByEmail.id)

    return redirectTo(origin, '/student', request)
  }

  if (studentByEmail && studentByEmail.id === user.id) {
    // Already linked correctly
    return redirectTo(origin, '/student', request)
  }

  // 3. Brand new user — default to STUDENT
  await adminClient.from('users_roles').insert({ id: user.id, role: 'STUDENT' })

  return redirectTo(origin, next === '/' ? '/student' : next, request)
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
