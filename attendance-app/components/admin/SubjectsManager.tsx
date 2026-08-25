'use client'

import { useState, useTransition } from 'react'
import { Plus, BookOpen, Users, AlertCircle, CalendarCheck, UploadCloud, Trash2 } from 'lucide-react'
import { Subject, FacultyProfile } from '@/lib/types'
import { createSubject, deleteSubject } from '@/lib/actions'
import Link from 'next/link'

interface SubjectsManagerProps {
  initialSubjects?: Subject[]
  isFacultyView?: boolean
  /** Approved faculty list for Super Admin subject assignment */
  approvedFaculty?: FacultyProfile[]
}

export function SubjectsManager({
  initialSubjects = [],
  isFacultyView = false,
  approvedFaculty = [],
}: SubjectsManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects)
  const [showModal, setShowModal] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isAdminView = !isFacultyView && approvedFaculty.length > 0

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || !name.trim()) return
    // Admin must select a faculty; faculty creates for themselves
    if (isAdminView && !selectedFacultyId) return

    startTransition(async () => {
      try {
        setErrorMsg(null)
        const facultyIdToAssign = isAdminView ? selectedFacultyId : undefined
        const res = await createSubject(code.trim(), name.trim(), facultyIdToAssign)
        if (res.success && res.subject) {
          const assignedFaculty = approvedFaculty.find(f => f.id === selectedFacultyId)
          setSubjects((prev) => [
            {
              ...res.subject,
              student_count: 0,
              faculty_name: assignedFaculty?.name || 'You (Assigned)',
            },
            ...prev,
          ])
          setCode('')
          setName('')
          setSelectedFacultyId('')
          setShowModal(false)
        }
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to create subject')
      }
    })
  }

  const handleDelete = (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject? All associated enrollments and sessions will be lost. This cannot be undone.')) return
    
    startTransition(async () => {
      try {
        setErrorMsg(null)
        await deleteSubject(subjectId)
        setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to delete subject')
      }
    })
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-red-400 hover:text-red-700">✕</button>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {isFacultyView ? 'My Teaching Subjects' : 'Institution Subjects'}
          </h2>
          <p className="text-xs text-slate-500">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} configured
          </p>
        </div>

        <button
          onClick={() => { setShowModal(true); setErrorMsg(null) }}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Subject
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-left text-sm" aria-label="Subject list">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-5 py-3">Subject Code</th>
                <th scope="col" className="px-5 py-3">Subject Name</th>
                <th scope="col" className="px-4 py-3">Assigned Faculty</th>
                <th scope="col" className="px-4 py-3">Enrolled</th>
                <th scope="col" className="px-5 py-3 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-700">No subjects created yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click &quot;New Subject&quot; to create your first subject.
                    </p>
                  </td>
                </tr>
              ) : (
                subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                        {sub.code}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {sub.name}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {sub.faculty_name || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {sub.student_count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/faculty/subjects/${sub.id}/roster`}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                        >
                          <UploadCloud className="h-3 w-3" />
                          Roster
                        </Link>
                        <Link
                          href={`/faculty/subjects/${sub.id}/session`}
                          className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        >
                          <CalendarCheck className="h-3 w-3" />
                          Start Attendance
                        </Link>
                        {isAdminView && (
                          <button
                            onClick={() => handleDelete(sub.id)}
                            disabled={isPending}
                            title="Delete Subject"
                            className="inline-flex items-center gap-1 rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 hover:text-red-700 border border-red-200 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Subject Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4">
              <h3 className="text-sm font-bold text-white">Create New Subject</h3>
              <p className="mt-1 text-xs text-slate-400">
                {isFacultyView
                  ? 'Create a subject and assign it to your faculty profile.'
                  : 'Create a subject and assign it to an approved faculty member.'}
              </p>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label htmlFor="modal-subject-code" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject Code *
                </label>
                <input
                  id="modal-subject-code"
                  type="text"
                  required
                  placeholder="e.g. EC601"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label htmlFor="modal-subject-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Subject Name *
                </label>
                <input
                  id="modal-subject-name"
                  type="text"
                  required
                  placeholder="e.g. Advanced Communication Systems"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* Faculty selector — only shown in Admin view */}
              {isAdminView && (
                <div>
                  <label htmlFor="modal-subject-faculty" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Assign to Faculty *
                  </label>
                  {approvedFaculty.length === 0 ? (
                    <div className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                      No approved faculty yet. Approve a faculty member first in the Faculty tab.
                    </div>
                  ) : (
                    <select
                      id="modal-subject-faculty"
                      required
                      value={selectedFacultyId}
                      onChange={(e) => setSelectedFacultyId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                    >
                      <option value="">— Select Faculty —</option>
                      {approvedFaculty.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} {f.email ? `(${f.email})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setCode(''); setName(''); setSelectedFacultyId('') }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isPending ||
                    !code.trim() ||
                    !name.trim() ||
                    (isAdminView && !selectedFacultyId) ||
                    (isAdminView && approvedFaculty.length === 0)
                  }
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isPending ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
