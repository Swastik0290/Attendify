import type { Metadata } from 'next'
import { getSubjectsList, getEnrolledStudentsForSubject } from '@/lib/actions'
import { RosterUploader } from '@/components/admin/RosterUploader'
import { RosterStudentTable } from '@/components/faculty/RosterStudentTable'
import { ArrowLeft } from 'lucide-react'
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

      {/* Enrolled Students Table with Unenroll */}
      <RosterStudentTable
        subjectId={currentSubject.id}
        initialStudents={enrolledStudents}
      />
    </main>
  )
}
