import type { Metadata } from 'next'
import { getSession } from '@/lib/auth'
import { getSubjectsList, getAttendanceSessionsList, signOut } from '@/lib/actions'

export const dynamic = 'force-dynamic'

import { SubjectsManager } from '@/components/admin/SubjectsManager'
import { AuthLoginForm } from '@/components/AuthLoginForm'
import { FacultyRegistrationForm } from '@/components/faculty/FacultyRegistrationForm'
import { DownloadAttendanceButton } from '@/components/DownloadAttendanceButton'
import { UserCheck, Clock, CalendarCheck, Shield, LogOut } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Faculty Portal' }

export default async function FacultyDashboardPage() {
  const session = await getSession()
  const facultyProfile = session?.facultyProfile

  if (!session) {
    return <AuthLoginForm role="FACULTY" />
  }

  if (session.role !== 'FACULTY' && session.role !== 'SUPER_ADMIN') {
    return (
      <main className="max-w-lg mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 mb-4">
          <Shield className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Faculty Access Required</h2>
        <p className="text-sm text-slate-600 mb-6">
          You are currently signed in as a Student. If you are a faculty member, you must register your profile and wait for Super Admin approval.
        </p>
        <FacultyRegistrationForm />
      </main>
    )
  }

  // If faculty is in PENDING state
  if (facultyProfile && facultyProfile.status === 'PENDING') {
    return (
      <main className="max-w-lg mx-auto my-12 p-8 bg-white rounded-2xl border border-amber-200 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 mb-4">
          <Clock className="h-8 w-8 text-amber-700" />
        </div>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-2">
          Registration Status: Pending
        </span>
        <h1 className="text-xl font-bold text-slate-900 mt-1">
          Account Awaiting Super Admin Approval
        </h1>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Hello <strong>{facultyProfile.name}</strong>, your faculty account has been registered and is currently waiting for verification by the Super Admin. You will be able to create subjects and start attendance sessions once approved.
        </p>
      </main>
    )
  }

  const subjects = await getSubjectsList(facultyProfile?.id)
  const sessions = await getAttendanceSessionsList()
  const facultySessions = sessions.filter(
    (s) => s.faculty_id === facultyProfile?.id || session.role === 'SUPER_ADMIN'
  )

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 mb-2">
            <UserCheck className="h-3.5 w-3.5" /> Approved Faculty
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {facultyProfile?.name || 'Faculty Member'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your subjects, upload course rosters, and launch live rotating QR attendance sessions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors"
          >
            <Shield className="h-3.5 w-3.5" /> Admin Portal
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </form>
        </div>
      </div>

      {/* Subjects Section */}
      <section aria-label="Subjects Section" className="space-y-4">
        <SubjectsManager initialSubjects={subjects} isFacultyView />
      </section>

      {/* Recent Sessions */}
      <section aria-label="Recent Attendance Sessions" className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center bg-slate-50/75">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-slate-700" /> Recent Attendance Sessions
          </h2>
          <span className="text-xs text-slate-500">{facultySessions.length} sessions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Recent sessions">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase">
                <th scope="col" className="px-5 py-2.5">Subject</th>
                <th scope="col" className="px-4 py-2.5">Date &amp; Time</th>
                <th scope="col" className="px-4 py-2.5">Status</th>
                <th scope="col" className="px-4 py-2.5">Attendance</th>
                <th scope="col" className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facultySessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    No attendance sessions recorded yet. Click &quot;Start Attendance&quot; on any subject above.
                  </td>
                </tr>
              ) : (
                facultySessions.slice(0, 5).map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {sess.subject?.code} • {sess.subject?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(sess.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          sess.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sess.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {sess.present_count || 0} Present
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sess.status === 'ACTIVE' && (
                          <Link
                            href={`/faculty/subjects/${sess.subject_id}/session`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                          >
                            View Live QR →
                          </Link>
                        )}
                        {sess.status === 'CLOSED' && (
                          <DownloadAttendanceButton
                            sessionId={sess.id}
                            subjectCode={sess.subject?.code}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
