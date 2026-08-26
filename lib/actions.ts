'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from './supabase/server'
import { getSession, ensureAuthUser } from './auth'
import {
  FacultyStatus,
  FacultyProfile,
  Subject,
  StudentProfile,
  AttendanceSession,
  RollSchemaConfig,
} from './types'
import { parseRollNumber, DEFAULT_INSTITUTIONAL_SCHEMA } from './schema-parser'
import {
  generateQRPayload,
  encodeQRPayload,
  decodeQRPayload,
  verifyQRPayload,
} from './qr-service'

function safeRevalidate(path: string, type?: 'layout' | 'page') {
  try {
    revalidatePath(path, type)
  } catch {
    // safe fallback when executed in standalone CLI test runners
  }
}

// Dev switcher actions removed

export async function getCurrentUser() {
  return await getSession()
}

// ─── SUPER ADMIN / FACULTY APPROVAL ACTIONS ───────────────────────────────────

export async function getFacultyList(): Promise<FacultyProfile[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('faculty_profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching faculty list:', error)
    return []
  }
  return data || []
}

export async function updateFacultyStatus(facultyId: string, status: FacultyStatus) {
  const session = await getSession()
  if (session?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admin can change faculty status')
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('faculty_profiles')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', facultyId)

  if (error) throw new Error(error.message)

  safeRevalidate('/admin/faculty')
  safeRevalidate('/faculty')
  return { success: true }
}

/**
 * FACULTY SELF-REGISTRATION
 * Called from /faculty page when a logged-in user wants to register as faculty.
 * Uses their real Google auth session — no dummy IDs.
 */
export async function createFacultyRegistration(name: string) {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized: Must be logged in to register as faculty')
  }

  const adminClient = createAdminClient()

  // Already registered — idempotent
  if (session.facultyProfile) {
    return { success: true, facultyId: session.userId }
  }

  // Upgrade their role from STUDENT → FACULTY
  const { error: roleErr } = await adminClient.from('users_roles').upsert({
    id: session.userId,
    role: 'FACULTY',
  })
  if (roleErr) throw new Error(roleErr.message)

  // Create faculty profile with their real email from Google
  const { error } = await adminClient.from('faculty_profiles').insert({
    id: session.userId,
    name,
    email: session.email,
    status: 'PENDING',
  })
  if (error) throw new Error(error.message)

  safeRevalidate('/admin/faculty')
  safeRevalidate('/faculty')
  return { success: true, facultyId: session.userId }
}

/**
 * ADMIN CREATES FACULTY (with credentials)
 * Super Admin creates a faculty account with email + password.
 * Faculty can then log in with these credentials OR via Google.
 */
export async function createFacultyByAdmin(name: string, email: string, password: string) {
  const session = await getSession()
  if (session?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admin can create faculty accounts')
  }

  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  const adminClient = createAdminClient()
  const cleanEmail = email.trim().toLowerCase()

  // Check if faculty already exists by email
  const { data: existing } = await adminClient
    .from('faculty_profiles')
    .select('id')
    .eq('email', cleanEmail)
    .single()

  if (existing) {
    throw new Error(`A faculty profile with email "${cleanEmail}" already exists.`)
  }

  // Create auth user — they'll log in via Google and be auto-linked by callback
  let facultyAuthId: string
  try {
    const { data: created, error: authErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'FACULTY', display_name: name },
    })
    if (authErr) throw authErr
    facultyAuthId = created.user!.id
  } catch (err: any) {
    // User might already exist in auth (e.g., signed up as student before)
    // Find them by email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(u => u.email === cleanEmail)
    if (!existingUser) throw new Error(`Could not create or find user: ${err.message}`)
    facultyAuthId = existingUser.id
  }

  // Upsert role
  await adminClient.from('users_roles').upsert({ id: facultyAuthId, role: 'FACULTY' })

  // Insert faculty profile
  const { error: profileErr } = await adminClient.from('faculty_profiles').insert({
    id: facultyAuthId,
    name,
    email: cleanEmail,
    status: 'PENDING',
  })
  if (profileErr) throw new Error(profileErr.message)

  safeRevalidate('/admin/faculty')
  return { success: true, facultyId: facultyAuthId }
}

/**
 * ADMIN DELETES FACULTY
 * Deletes the faculty profile and removes the FACULTY role.
 */
export async function deleteFaculty(facultyId: string) {
  const session = await getSession()
  if (session?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admin can delete faculty')
  }

  const adminClient = createAdminClient()
  
  // Note: we just delete the profile. In Supabase, if ON DELETE CASCADE is set,
  // the users_roles might be deleted, or we can just delete from users_roles manually.
  await adminClient.from('users_roles').delete().eq('id', facultyId).eq('role', 'FACULTY')
  const { error } = await adminClient.from('faculty_profiles').delete().eq('id', facultyId)
  
  if (error) throw new Error(error.message)
  
  safeRevalidate('/admin/faculty')
  return { success: true }
}

/**
 * ADMIN CHANGES FACULTY PASSWORD
 */
export async function adminChangeFacultyPassword(facultyId: string, newPassword: string) {
  const session = await getSession()
  if (session?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admin can change passwords')
  }

  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(facultyId, { password: newPassword })
  
  if (error) throw new Error(error.message)
  return { success: true }
}

/**
 * SIGN OUT — works for all roles.
 */
export async function signOut() {
  const supabase = await (await import('./supabase/server')).createClient()
  await supabase.auth.signOut()
  redirect('/')
}

// ─── SUBJECT ACTIONS ──────────────────────────────────────────────────────────

export async function getSubjectsList(facultyId?: string): Promise<Subject[]> {
  const adminClient = createAdminClient()
  let query = adminClient
    .from('subjects')
    .select('*, faculty:faculty_profiles(name), enrollments(count)')
    .order('code', { ascending: true })

  if (facultyId) {
    query = query.eq('faculty_id', facultyId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching subjects:', error)
    return []
  }

  return (
    data?.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      faculty_id: s.faculty_id,
      faculty_name: (s.faculty as unknown as { name: string })?.name || 'Assigned Faculty',
      created_at: s.created_at,
      updated_at: s.updated_at,
      student_count: (s.enrollments as unknown as [{ count: number }])?.[0]?.count || 0,
    })) || []
  )
}

export async function createSubject(code: string, name: string, facultyId?: string) {
  const session = await getSession()
  if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'FACULTY')) {
    throw new Error('Unauthorized: Must be logged in as Faculty or Super Admin')
  }

  const assignedFacultyId =
    session.role === 'SUPER_ADMIN' && facultyId ? facultyId : session.facultyProfile?.id

  if (!assignedFacultyId) {
    throw new Error('Unauthorized: Must specify a faculty to assign the subject to')
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('subjects')
    .insert({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      faculty_id: assignedFacultyId,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Subject with code "${code}" already exists.`)
    }
    throw new Error(error.message)
  }

  safeRevalidate('/admin/subjects')
  safeRevalidate('/admin/subjects')
  safeRevalidate('/faculty')
  return { success: true, subject: data }
}

/**
 * ADMIN / FACULTY DELETES SUBJECT
 */
export async function deleteSubject(subjectId: string) {
  const session = await getSession()
  if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'FACULTY')) {
    throw new Error('Unauthorized: Must be logged in as Faculty or Super Admin')
  }

  const adminClient = createAdminClient()
  
  // If Faculty, ensure they own the subject
  if (session.role === 'FACULTY') {
    const { data: subject } = await adminClient.from('subjects').select('faculty_id').eq('id', subjectId).single()
    if (subject?.faculty_id !== session.userId) {
      throw new Error('Unauthorized: You can only delete your own subjects')
    }
  }

  const { error } = await adminClient.from('subjects').delete().eq('id', subjectId)
  if (error) throw new Error(error.message)
  
  safeRevalidate('/admin/subjects')
  safeRevalidate('/faculty')
  return { success: true }
}

// ─── ROLL SCHEMA ACTIONS ──────────────────────────────────────────────────────

export async function getInstitutionalRollSchema(): Promise<RollSchemaConfig> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from('roll_schemas')
    .select('config')
    .eq('is_global', true)
    .single()

  const config = data?.config as RollSchemaConfig | undefined
  if (config?.segments && config.segments.some((s) => s.mappings && Object.keys(s.mappings).length > 0)) {
    return config
  }
  return DEFAULT_INSTITUTIONAL_SCHEMA
}

export async function updateInstitutionalRollSchema(config: RollSchemaConfig) {
  const session = await getSession()
  if (session?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admin can modify institutional roll schema')
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('roll_schemas')
    .upsert({
      name: 'Institutional Roll Schema',
      is_global: true,
      config,
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(error.message)
  safeRevalidate('/admin/settings')
  return { success: true }
}

// ─── STUDENTS & ROSTER ACTIONS ────────────────────────────────────────────────

export async function getStudentsList(): Promise<StudentProfile[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('student_profiles')
    .select('*')
    .order('roll_number', { ascending: true })

  if (error) {
    console.error('Error fetching students:', error)
    return []
  }
  return data || []
}

export async function getEnrolledStudentsForSubject(subjectId: string): Promise<StudentProfile[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('enrollments')
    .select('student:student_profiles(*)')
    .eq('subject_id', subjectId)

  if (error) {
    console.error('Error fetching enrollments:', error)
    return []
  }

  return (
    data
      ?.map((d) => d.student as unknown as StudentProfile)
      .filter(Boolean)
      .sort((a, b) => a.roll_number.localeCompare(b.roll_number)) || []
  )
}

/**
 * Imports validated roster rows.
 * Creates or updates student records (with derived schema metadata) and enrolls them into the given subject if specified.
 */
export async function importStudentRoster(
  rows: { rollNumber: string; name: string; email?: string }[],
  subjectId?: string
) {
  const session = await getSession()
  if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'FACULTY')) {
    throw new Error('Unauthorized')
  }

  const adminClient = createAdminClient()
  const schemaConfig = await getInstitutionalRollSchema()

  let importedCount = 0
  let enrolledCount = 0

  for (const row of rows) {
    const cleanRoll = row.rollNumber.trim().toUpperCase()
    const cleanName = row.name.trim()

    // 1. Parse roll number using configured schema
    const parsed = parseRollNumber(cleanRoll, schemaConfig)

    // 2. Check if student profile exists
    const { data: existingStudent } = await adminClient
      .from('student_profiles')
      .select('id')
      .eq('roll_number', cleanRoll)
      .single()

    let studentId = existingStudent?.id

    if (!studentId) {
      // Use NIT Rourkela institutional email domain as default
      const studentEmail = `${cleanRoll.toLowerCase()}@nitrkl.ac.in`
      
      // Try to find existing auth user first (by both possible domains)
      const { data: existingUsers } = await adminClient.auth.admin.listUsers()
      const authUser = existingUsers.users.find(
        u => u.email === studentEmail ||
             u.email === `${cleanRoll.toLowerCase()}@student.institution.ac.in`
      )
      
      if (authUser) {
        studentId = authUser.id
        // Ensure role exists
        await adminClient.from('users_roles').upsert({ id: studentId, role: 'STUDENT' })
      } else {
        studentId = crypto.randomUUID()
        await ensureAuthUser(studentId, studentEmail, 'STUDENT')
      }

      // Create student profile — use their real email from CSV if provided, otherwise the institutional default
      const studentInsertEmail = row.email?.trim().toLowerCase() || `${cleanRoll.toLowerCase()}@nitrkl.ac.in`
      await adminClient.from('student_profiles').insert({
        id: studentId,
        roll_number: cleanRoll,
        name: cleanName,
        email: studentInsertEmail,
        derived_program: parsed.program || null,
        derived_year: parsed.year || null,
        derived_department: parsed.department || null,
        derived_serial: parsed.serial || null,
      })
      importedCount++
    } else {
      // Update metadata
      await adminClient
        .from('student_profiles')
        .update({
          name: cleanName,
          derived_program: parsed.program || null,
          derived_year: parsed.year || null,
          derived_department: parsed.department || null,
          derived_serial: parsed.serial || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)
    }

    // 3. Enroll into subject if subjectId is provided
    if (subjectId && studentId) {
      const { error: enrollError } = await adminClient.from('enrollments').upsert(
        {
          student_id: studentId,
          subject_id: subjectId,
        },
        { onConflict: 'student_id,subject_id' }
      )
      if (!enrollError) enrolledCount++
    }
  }

  safeRevalidate('/admin/students')
  safeRevalidate('/admin/subjects')
  safeRevalidate('/faculty')
  if (subjectId) {
    safeRevalidate(`/faculty/subjects/${subjectId}`)
  }

  return { success: true, importedCount, enrolledCount }
}

// ─── ATTENDANCE SESSIONS & ROTATING QR ACTIONS ─────────────────────────────────

export async function getAttendanceSessionsList(): Promise<AttendanceSession[]> {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('attendance_sessions')
    .select('*, subject:subjects(code, name), faculty:faculty_profiles(name), attendance_records(count)')
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching sessions:', error)
    return []
  }

  return (
    data?.map((s) => ({
      id: s.id,
      subject_id: s.subject_id,
      faculty_id: s.faculty_id,
      status: s.status,
      started_at: s.started_at,
      closed_at: s.closed_at,
      subject: s.subject as unknown as Subject,
      faculty: s.faculty as unknown as FacultyProfile,
      present_count: (s.attendance_records as unknown as [{ count: number }])?.[0]?.count || 0,
    })) || []
  )
}

export async function startAttendanceSession(subjectId: string) {
  const session = await getSession()
  if (!session || (session.role !== 'FACULTY' && session.role !== 'SUPER_ADMIN')) {
    throw new Error('Unauthorized: Must be Faculty to start attendance session')
  }

  const adminClient = createAdminClient()

  // Verify subject exists
  const { data: subject, error: subError } = await adminClient
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .single()

  if (subError || !subject) {
    throw new Error('Subject not found')
  }

  // Close any existing active sessions for this subject
  await adminClient
    .from('attendance_sessions')
    .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
    .eq('subject_id', subjectId)
    .eq('status', 'ACTIVE')

  // Create new active attendance session
  const facultyId = session.facultyProfile?.id || subject.faculty_id
  if (!facultyId) {
    throw new Error('Unauthorized: Missing faculty identity')
  }
  const { data: newSession, error: createError } = await adminClient
    .from('attendance_sessions')
    .insert({
      subject_id: subjectId,
      faculty_id: facultyId,
      status: 'ACTIVE',
    })
    .select()
    .single()

  if (createError) throw new Error(createError.message)

  safeRevalidate('/admin/sessions')
  safeRevalidate('/faculty')
  return { success: true, sessionId: newSession.id }
}

export async function closeAttendanceSession(sessionId: string) {
  const adminClient = createAdminClient()
  await adminClient
    .from('attendance_sessions')
    .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
    .eq('id', sessionId)

  safeRevalidate('/admin/sessions')
  safeRevalidate('/faculty')
  return { success: true }
}

export async function deleteAttendanceSession(sessionId: string) {
  const session = await getSession()
  if (session?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admin can delete sessions')
  }

  const adminClient = createAdminClient()
  // Only allow deleting closed sessions
  const { data: sess } = await adminClient
    .from('attendance_sessions')
    .select('status')
    .eq('id', sessionId)
    .single()

  if (sess?.status === 'ACTIVE') {
    throw new Error('Cannot delete an active session. Close it first.')
  }

  await adminClient.from('attendance_records').delete().eq('session_id', sessionId)
  const { error } = await adminClient.from('attendance_sessions').delete().eq('id', sessionId)
  if (error) throw new Error(error.message)

  safeRevalidate('/admin/sessions')
  safeRevalidate('/faculty')
  return { success: true }
}

/**
 * Returns all attendance records for a session, formatted for CSV export.
 */
export async function getSessionAttendanceForExport(sessionId: string) {
  const adminClient = createAdminClient()

  const { data: sess } = await adminClient
    .from('attendance_sessions')
    .select('*, subject:subjects(code, name), faculty:faculty_profiles(name)')
    .eq('id', sessionId)
    .single()

  const { data: records } = await adminClient
    .from('attendance_records')
    .select('*, student:student_profiles(roll_number, name, email, derived_program, derived_department, derived_year)')
    .eq('session_id', sessionId)
    .order('scanned_at', { ascending: true })

  return {
    sessionId,
    subjectCode: (sess?.subject as unknown as { code: string })?.code || '',
    subjectName: (sess?.subject as unknown as { name: string })?.name || '',
    facultyName: (sess?.faculty as unknown as { name: string })?.name || '',
    startedAt: sess?.started_at || '',
    closedAt: sess?.closed_at || '',
    records: records?.map((r) => {
      const student = r.student as unknown as {
        roll_number: string; name: string; email?: string;
        derived_program?: string; derived_department?: string; derived_year?: string
      }
      return {
        rollNumber: student?.roll_number || '',
        name: student?.name || '',
        email: student?.email || '',
        program: student?.derived_program || '',
        department: student?.derived_department || '',
        year: student?.derived_year || '',
        scannedAt: r.scanned_at,
      }
    }) || [],
  }
}

export async function getLiveQRToken(sessionId: string): Promise<{ token: string; expiresAt: number } | null> {
  const adminClient = createAdminClient()
  const { data: session } = await adminClient
    .from('attendance_sessions')
    .select('*, subject:subjects(id, code)')
    .eq('id', sessionId)
    .single()

  if (!session || session.status !== 'ACTIVE') {
    return null
  }

  const subjectCode = (session.subject as unknown as { code: string })?.code || 'ATT'
  const payload = generateQRPayload(session.id, session.subject_id, subjectCode, session.faculty_id)
  const token = encodeQRPayload(payload)

  return {
    token,
    expiresAt: payload.expiresAt,
  }
}

export async function getSessionAttendanceLive(sessionId: string) {
  const adminClient = createAdminClient()
  const { data: session } = await adminClient
    .from('attendance_sessions')
    .select('*, subject:subjects(code, name)')
    .eq('id', sessionId)
    .single()

  const { data: records } = await adminClient
    .from('attendance_records')
    .select('*, student:student_profiles(id, roll_number, name)')
    .eq('session_id', sessionId)
    .order('scanned_at', { ascending: false })

  const { count: totalEnrolled } = await adminClient
    .from('enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('subject_id', session?.subject_id)

  return {
    session,
    records:
      records?.map((r) => ({
        id: r.id,
        scanned_at: r.scanned_at,
        student: r.student as unknown as StudentProfile,
      })) || [],
    totalEnrolled: totalEnrolled || 0,
  }
}

export type ScanAttendanceResult =
  | { success: true; message: string; subjectCode: string; subjectName: string; rollNumber: string; studentName: string }
  | { success: false; error: 'NOT_AUTHENTICATED' | 'INVALID_QR' | 'EXPIRED_QR' | 'SESSION_CLOSED' | 'NOT_ENROLLED' | 'ALREADY_ATTENDED' | 'SERVER_ERROR'; message: string }

/**
 * Server action called by the student phone scanner.
 * Enforces all 12 validation steps securely on the server.
 */
export async function submitAttendanceScan(scannedData: string): Promise<ScanAttendanceResult> {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT') {
    return {
      success: false,
      error: 'NOT_AUTHENTICATED',
      message: 'You must be signed in as a student to record attendance.',
    }
  }

  if (!session.studentProfile) {
    return {
      success: false,
      error: 'NOT_AUTHENTICATED',
      message: 'Student profile not found. Please contact administration.',
    }
  }

  const studentId = session.studentProfile.id
  const studentName = session.studentProfile.name
  const rollNumber = session.studentProfile.roll_number

  // 1. Decode QR payload
  const payload = decodeQRPayload(scannedData)
  if (!payload) {
    return {
      success: false,
      error: 'INVALID_QR',
      message: 'Invalid QR code format. Please scan an active session QR code.',
    }
  }

  // 2. Cryptographic signature and expiration check
  const verification = verifyQRPayload(payload)
  if (!verification.valid) {
    if (verification.reason === 'EXPIRED') {
      return {
        success: false,
        error: 'EXPIRED_QR',
        message: 'This QR code has expired. Please scan the current code displayed on screen.',
      }
    }
    return {
      success: false,
      error: 'INVALID_QR',
      message: 'Cryptographic signature verification failed. Untrusted QR code.',
    }
  }

  const adminClient = createAdminClient()

  // 3. Verify session is still ACTIVE
  const { data: attSession } = await adminClient
    .from('attendance_sessions')
    .select('*, subject:subjects(id, code, name)')
    .eq('id', payload.sessionId)
    .single()

  if (!attSession || attSession.status !== 'ACTIVE') {
    return {
      success: false,
      error: 'SESSION_CLOSED',
      message: 'This attendance session has been closed by the faculty.',
    }
  }

  const subjectCode = (attSession.subject as unknown as { code: string })?.code || payload.subjectCode
  const subjectName = (attSession.subject as unknown as { name: string })?.name || 'Subject'

  // 4. Verify student is ENROLLED in this subject
  const { data: enrollment } = await adminClient
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('subject_id', attSession.subject_id)
    .single()

  if (!enrollment) {
    return {
      success: false,
      error: 'NOT_ENROLLED',
      message: `You are not enrolled in ${subjectCode} (${subjectName}).`,
    }
  }

  // 5. Check duplicate attendance
  const { data: existingRecord } = await adminClient
    .from('attendance_records')
    .select('id')
    .eq('session_id', payload.sessionId)
    .eq('student_id', studentId)
    .single()

  if (existingRecord) {
    return {
      success: false,
      error: 'ALREADY_ATTENDED',
      message: 'You have already been marked Present for this session.',
    }
  }

  // 6. Record attendance
  const { error: insertError } = await adminClient.from('attendance_records').insert({
    session_id: payload.sessionId,
    student_id: studentId,
    scanned_at: new Date().toISOString(),
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return {
        success: false,
        error: 'ALREADY_ATTENDED',
        message: 'You have already been marked Present for this session.',
      }
    }
    return {
      success: false,
      error: 'SERVER_ERROR',
      message: 'Could not record attendance. Please try again.',
    }
  }

  // Record nonce usage
  await adminClient.from('qr_nonces').insert({
    nonce: payload.nonce,
    session_id: payload.sessionId,
  })

  safeRevalidate('/admin/sessions')
  safeRevalidate('/student')
  safeRevalidate('/faculty')

  return {
    success: true,
    message: 'Attendance recorded successfully',
    subjectCode,
    subjectName,
    rollNumber,
    studentName,
  }
}

export async function getStudentDashboardData(studentId?: string) {
  const session = await getSession()
  const effectiveStudentId = studentId || session?.studentProfile?.id
  if (!effectiveStudentId) {
    if (session?.userId) {
      return { isRegistered: false, email: session.email }
    }
    return null
  }

  const adminClient = createAdminClient()

  // Get student profile
  const { data: profile } = await adminClient
    .from('student_profiles')
    .select('*')
    .eq('id', effectiveStudentId)
    .single()

  // Get enrolled subjects
  const { data: enrollments } = await adminClient
    .from('enrollments')
    .select('subject:subjects(id, code, name, faculty:faculty_profiles(name))')
    .eq('student_id', effectiveStudentId)

  // Get attendance records
  const { data: records } = await adminClient
    .from('attendance_records')
    .select('id, scanned_at, session:attendance_sessions(id, started_at, subject:subjects(code, name))')
    .eq('student_id', effectiveStudentId)
    .order('scanned_at', { ascending: false })

  return {
    isRegistered: true,
    profile: profile || session?.studentProfile,
    enrolledSubjects:
      enrollments?.map((e) => ({
        ...(e.subject as unknown as Subject),
      })) || [],
    attendanceRecords:
      records?.map((r) => ({
        id: r.id,
        scanned_at: r.scanned_at,
        subjectCode: (r.session as unknown as { subject: { code: string } })?.subject?.code || '',
        subjectName: (r.session as unknown as { subject: { name: string } })?.subject?.name || '',
      })) || [],
  }
}

// ─── STUDENT CRUD ACTIONS ────────────────────────────────────────────────────

export async function deleteStudent(studentId: string) {
  const session = await getSession()
  if (session?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admin can delete students')
  }

  const adminClient = createAdminClient()

  // Cascade: delete attendance records, enrollments, profile, role
  await adminClient.from('attendance_records').delete().eq('student_id', studentId)
  await adminClient.from('enrollments').delete().eq('student_id', studentId)
  await adminClient.from('student_profiles').delete().eq('id', studentId)
  await adminClient.from('users_roles').delete().eq('id', studentId)

  safeRevalidate('/admin/students')
  return { success: true }
}

export async function updateStudent(
  studentId: string,
  updates: { name?: string; email?: string }
) {
  const session = await getSession()
  if (session?.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Only Super Admin can edit students')
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('student_profiles')
    .update({
      ...(updates.name ? { name: updates.name.trim() } : {}),
      ...(updates.email ? { email: updates.email.trim().toLowerCase() } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId)

  if (error) throw new Error(error.message)

  safeRevalidate('/admin/students')
  return { success: true }
}

export async function unenrollStudent(studentId: string, subjectId: string) {
  const session = await getSession()
  if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'FACULTY')) {
    throw new Error('Unauthorized')
  }

  const adminClient = createAdminClient()

  // If faculty, verify they own the subject
  if (session.role === 'FACULTY') {
    const { data: subject } = await adminClient
      .from('subjects')
      .select('faculty_id')
      .eq('id', subjectId)
      .single()
    if (subject?.faculty_id !== session.userId) {
      throw new Error('Unauthorized: You can only manage your own subjects')
    }
  }

  const { error } = await adminClient
    .from('enrollments')
    .delete()
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)

  if (error) throw new Error(error.message)

  safeRevalidate(`/faculty/subjects/${subjectId}/roster`)
  safeRevalidate('/admin/students')
  return { success: true }
}
