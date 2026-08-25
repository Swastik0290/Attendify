/**
 * Shared TypeScript types and interfaces.
 *
 * Types are grouped by domain. As the system grows, domain-specific
 * types may be split into separate files (e.g. types/attendance.ts).
 * Keep this file as the single re-export point.
 */

// ─── Authorization Roles ────────────────────────────────────────────────────

/**
 * The three internal authorization roles in the system.
 * 'super_admin' is never exposed as a public registration option.
 */
export type UserRole = 'student' | 'faculty' | 'super_admin'

// ─── Registration Status ─────────────────────────────────────────────────────

/**
 * Faculty registration goes through an approval workflow.
 * Students are matched against an imported roster.
 */
export type RegistrationStatus = 'pending' | 'approved' | 'rejected' | 'disabled'

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  role: UserRole
  status: RegistrationStatus
  createdAt: string
  updatedAt: string
}

export interface StudentProfile extends UserProfile {
  role: 'student'
  rollNumber: string
  name: string
}

export interface FacultyProfile extends UserProfile {
  role: 'faculty'
  name: string
  employeeId: string
}

// ─── API Response Helpers ─────────────────────────────────────────────────────

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
