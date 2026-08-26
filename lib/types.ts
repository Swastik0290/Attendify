export type UserRole = 'SUPER_ADMIN' | 'FACULTY' | 'STUDENT'

export type FacultyStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'

export type SessionStatus = 'ACTIVE' | 'CLOSED'

export interface UserRoleRecord {
  id: string
  role: UserRole
  created_at: string
}

export interface FacultyProfile {
  id: string
  name: string
  status: FacultyStatus
  email?: string
  created_at: string
  updated_at: string
}

export interface StudentProfile {
  id: string
  roll_number: string
  name: string
  email?: string
  derived_program?: string | null
  derived_year?: string | null
  derived_department?: string | null
  derived_serial?: string | null
  created_at: string
  updated_at: string
}

export interface RollSchemaSegment {
  name: string
  key: string // e.g. 'program', 'year', 'department', 'serial'
  start?: number // 0-indexed start position
  length: number
  type: 'numeric' | 'alphanumeric' | 'alpha'
  description?: string
  mappings?: Record<string, string> // e.g. {"6": "M.Tech Research", "EC": "Electronics & Communication"}
}

export interface RollSchemaConfig {
  segments: RollSchemaSegment[]
}

export interface RollSchema {
  id: string
  name: string
  is_global: boolean
  config: RollSchemaConfig
  created_at: string
  updated_at: string
}

export interface Subject {
  id: string
  code: string
  name: string
  faculty_id: string
  faculty_name?: string
  created_at: string
  updated_at: string
  student_count?: number
}

export interface Enrollment {
  id: string
  student_id: string
  subject_id: string
  created_at: string
  student?: StudentProfile
  subject?: Subject
}

export interface AttendanceSession {
  id: string
  subject_id: string
  faculty_id: string
  status: SessionStatus
  started_at: string
  closed_at?: string | null
  subject?: Subject
  faculty?: FacultyProfile
  present_count?: number
}

export interface AttendanceRecord {
  id: string
  session_id: string
  student_id: string
  scanned_at: string
  student?: StudentProfile
  session?: AttendanceSession
}

export interface ParsedRollNumber {
  raw: string
  valid: boolean
  program?: string
  year?: string
  department?: string
  serial?: string
  segments: Record<string, string>
}

export interface RosterRow {
  rollNumber: string
  name: string
  email?: string
  additionalData?: Record<string, string>
}

export interface RosterValidationResult {
  totalRows: number
  validRows: RosterRow[]
  duplicateRows: { row: number; rollNumber: string; reason: string }[]
  missingRollRows: { row: number; reason: string }[]
  missingNameRows: { row: number; rollNumber?: string; reason: string }[]
  conflictRows: { row: number; rollNumber: string; uploadedName: string; existingName: string }[]
}

export interface QRPayload {
  sessionId: string
  subjectId: string
  subjectCode: string
  facultyId: string
  nonce: string
  issuedAt: number
  expiresAt: number
  signature: string
}
