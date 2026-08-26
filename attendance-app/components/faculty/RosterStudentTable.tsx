'use client'

import { useState, useTransition } from 'react'
import { Users, GraduationCap, UserMinus, RefreshCw, AlertCircle } from 'lucide-react'
import { StudentProfile } from '@/lib/types'
import { unenrollStudent } from '@/lib/actions'

interface RosterStudentTableProps {
  subjectId: string
  initialStudents: StudentProfile[]
}

export function RosterStudentTable({ subjectId, initialStudents }: RosterStudentTableProps) {
  const [students, setStudents] = useState<StudentProfile[]>(initialStudents)
  const [error, setError] = useState<string | null>(null)
  const [unenrollingId, setUnenrollingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleUnenroll = (studentId: string, name: string) => {
    if (!confirm(`Remove "${name}" from this subject? Their attendance records for this subject will remain, but they will no longer be enrolled.`)) return

    setUnenrollingId(studentId)
    startTransition(async () => {
      try {
        setError(null)
        await unenrollStudent(studentId, subjectId)
        setStudents((prev) => prev.filter((s) => s.id !== studentId))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to unenroll student')
      } finally {
        setUnenrollingId(null)
      }
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center bg-slate-50/75">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-700" /> Enrolled Students ({students.length})
        </h2>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2.5 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" aria-label="Enrolled students">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase">
              <th scope="col" className="px-5 py-2.5">Roll Number</th>
              <th scope="col" className="px-5 py-2.5">Student Name</th>
              <th scope="col" className="px-4 py-2.5">Program</th>
              <th scope="col" className="px-4 py-2.5">Department</th>
              <th scope="col" className="px-4 py-2.5">Year</th>
              <th scope="col" className="px-5 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                  <GraduationCap className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No students currently enrolled in this subject. Upload a roster above.
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 font-mono font-bold text-slate-900">
                    {student.roll_number}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">{student.name}</td>
                  <td className="px-4 py-3 text-slate-600">{student.derived_program || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{student.derived_department || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{student.derived_year || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleUnenroll(student.id, student.name)}
                      disabled={isPending && unenrollingId === student.id}
                      title="Remove from this subject"
                      className="inline-flex items-center gap-1 rounded bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                    >
                      {isPending && unenrollingId === student.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserMinus className="h-3 w-3" />
                      )}
                      Unenroll
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
