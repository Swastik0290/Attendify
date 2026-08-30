import type { Metadata } from 'next'
import { getStudentDashboardData, signOut } from '@/lib/actions'
import { AuthLoginForm } from '@/components/AuthLoginForm'
import { PasskeyManager } from '@/components/student/PasskeyManager'
import { GraduationCap, QrCode, CheckCircle2, BookOpen, LogOut, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Student Portal' }

export default async function StudentDashboardPage() {
  const data = await getStudentDashboardData()

  if (!data) {
    return <AuthLoginForm role="STUDENT" />
  }

  if (data.isRegistered === false || !('enrolledSubjects' in data) || !('attendanceRecords' in data)) {
    return (
      <main className="max-w-md mx-auto p-4 sm:p-6 mt-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Student Profile Not Found</h1>
          <p className="text-sm text-slate-500">
            You are logged in as <span className="font-semibold text-slate-900">{data.email}</span>, but your Roll Number has not been registered yet.
          </p>
          <p className="text-sm text-slate-500">
            Please wait for your faculty to upload the class roster containing your email address.
          </p>
          <form action={signOut} className="pt-4">
            <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors">
              Sign Out
            </button>
          </form>
        </div>
      </main>
    )
  }

  const profile = data.profile
  const enrolledSubjects = (data as any).enrolledSubjects || []
  const attendanceRecords = (data as any).attendanceRecords || []

  if (!profile) {
    return <AuthLoginForm role="STUDENT" />
  }

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner / Identity Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs overflow-hidden relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              <GraduationCap className="h-3.5 w-3.5" /> Verified Student Identity
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {profile.name}
            </h1>
            <p className="text-sm font-mono font-bold text-slate-700 mt-0.5">
              Roll Number: {profile.roll_number}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/student/scan"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-md active:scale-98"
            >
              <QrCode className="h-4 w-4 text-emerald-400" />
              Scan QR →
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-3 text-sm text-slate-500 hover:text-red-600 transition-all"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Derived Institutional Metadata (from Roll Schema) */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Program</div>
            <div className="font-bold text-slate-800 mt-0.5">
              {profile.derived_program || 'Degree Program'}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Department</div>
            <div className="font-bold text-slate-800 mt-0.5">
              {profile.derived_department || 'Department'}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Admission Year</div>
            <div className="font-mono font-bold text-slate-800 mt-0.5">
              {profile.derived_year || '—'}
            </div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Student Serial</div>
            <div className="font-mono font-bold text-slate-800 mt-0.5">
              {profile.derived_serial || '—'}
            </div>
          </div>
        </div>
      </div>

      <PasskeyManager />

      {/* Enrolled Subjects */}
      <section aria-label="Enrolled Subjects" className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center bg-slate-50/75">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-slate-700" /> My Enrolled Subjects
          </h2>
          <span className="text-xs text-slate-500">{enrolledSubjects.length} subjects</span>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {enrolledSubjects.length === 0 ? (
            <div className="col-span-2 py-6 text-center text-xs text-slate-400">
              You are not currently enrolled in any course rosters.
            </div>
          ) : (
            enrolledSubjects.map((sub: any) => (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                    {sub.code}
                  </span>
                  <div className="font-semibold text-sm text-slate-900 mt-2">{sub.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Faculty: {sub.faculty_name}</div>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200/60 flex justify-between items-center text-[11px] text-emerald-700 font-semibold">
                  <span>Status: Active Enrollment</span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Attendance History */}
      <section aria-label="Recent Attendance Records" className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center bg-slate-50/75">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Recent Attendance History
          </h2>
          <span className="text-xs text-slate-500">{attendanceRecords.length} records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Attendance history">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase">
                <th scope="col" className="px-5 py-2.5">Subject</th>
                <th scope="col" className="px-4 py-2.5">Date &amp; Time</th>
                <th scope="col" className="px-5 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-400">
                    No attendance records found yet. Click &quot;Scan Classroom QR&quot; to record attendance.
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((rec: any) => (
                  <tr key={rec.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {rec.subjectCode} • {rec.subjectName}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(rec.scanned_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> Present
                      </span>
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
