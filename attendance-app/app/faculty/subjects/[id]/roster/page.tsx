import type { Metadata } from 'next'
import { getSubjectsList, getEnrolledStudentsForSubject } from '@/lib/actions'
import { RosterUploader } from '@/components/admin/RosterUploader'
import { ArrowLeft, Users, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Subject Roster' }

export default async function SubjectRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const subjects = await getSubjectsList()
  const currentSubject = subjects.find((s) => s.id === id)

  if (!currentSubject) {
    notFound()
  }

  const enrolledStudents = await getEnrolledStudentsForSubject(id)

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Navigation & Header */}
      <div className="space-y-2">
        <Link
          href="/faculty"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Faculty Portal
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {currentSubject.code} • {currentSubject.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload student course roster (CSV or XLSX) to enroll students in this subject.
            </p>
          </div>

          <Link
            href={`/faculty/subjects/${currentSubject.id}/session`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            Start Attendance Session →
          </Link>
        </div>
      </div>

      {/* Roster Upload Component */}
      <RosterUploader
        subjectId={currentSubject.id}
        subjectCode={currentSubject.code}
        subjectName={currentSubject.name}
        existingStudents={enrolledStudents}
      />

      {/* Enrolled Students Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center bg-slate-50/75">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-700" /> Enrolled Students ({enrolledStudents.length})
          </h2>
          <span className="text-xs text-slate-500">Subject: {currentSubject.code}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Enrolled students">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase">
                <th scope="col" className="px-5 py-2.5">Roll Number</th>
                <th scope="col" className="px-5 py-2.5">Student Name</th>
                <th scope="col" className="px-4 py-2.5">Program</th>
                <th scope="col" className="px-4 py-2.5">Department</th>
                <th scope="col" className="px-4 py-2.5">Year</th>
                <th scope="col" className="px-4 py-2.5">Serial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrolledStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    <GraduationCap className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    No students currently enrolled in this subject. Upload a roster above.
                  </td>
                </tr>
              ) : (
                enrolledStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-bold text-slate-900">
                      {student.roll_number}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">{student.name}</td>
                    <td className="px-4 py-3 text-slate-600">{student.derived_program || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{student.derived_department || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{student.derived_year || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{student.derived_serial || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
