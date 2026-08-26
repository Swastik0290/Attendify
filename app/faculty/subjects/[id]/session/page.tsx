import type { Metadata } from 'next'
import { getSubjectsList, getAttendanceSessionsList } from '@/lib/actions'
import { StartSessionView } from '@/components/faculty/StartSessionView'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Attendance Session' }

export default async function FacultyLiveSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const subjects = await getSubjectsList()
  const currentSubject = subjects.find((s) => s.id === id)

  if (!currentSubject) {
    notFound()
  }

  // Check if an active session already exists for this subject (don't auto-start one)
  const sessions = await getAttendanceSessionsList()
  const existingActiveSession = sessions.find((s) => s.subject_id === id && s.status === 'ACTIVE') ?? null

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Link
        href="/faculty"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Faculty Dashboard
      </Link>

      <StartSessionView
        subjectId={currentSubject.id}
        subjectCode={currentSubject.code}
        subjectName={currentSubject.name}
        existingActiveSession={existingActiveSession}
      />
    </main>
  )
}
