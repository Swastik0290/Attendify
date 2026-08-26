'use client'

import { useState, useTransition } from 'react'
import { GraduationCap, Pencil, Trash2, Check, X, RefreshCw, AlertCircle } from 'lucide-react'
import { StudentProfile } from '@/lib/types'
import { deleteStudent, updateStudent } from '@/lib/actions'

interface StudentsTableProps {
  initialStudents: StudentProfile[]
}

export function StudentsTable({ initialStudents }: StudentsTableProps) {
  const [students, setStudents] = useState<StudentProfile[]>(initialStudents)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEditStart = (student: StudentProfile) => {
    setEditingId(student.id)
    setEditName(student.name)
    setEditEmail(student.email || '')
    setError(null)
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditName('')
    setEditEmail('')
    setError(null)
  }

  const handleEditSave = (studentId: string) => {
    if (!editName.trim()) {
      setError('Name cannot be empty.')
      return
    }
    startTransition(async () => {
      try {
        setError(null)
        await updateStudent(studentId, { name: editName.trim(), email: editEmail.trim() })
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? { ...s, name: editName.trim(), email: editEmail.trim() || s.email }
              : s
          )
        )
        setEditingId(null)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Update failed')
      }
    })
  }

  const handleDelete = (studentId: string, name: string) => {
    if (
      !confirm(
        `Delete student "${name}"?\n\nThis will also remove all their enrollment records and attendance history. This action CANNOT be undone.`
      )
    )
      return
    startTransition(async () => {
      try {
        setError(null)
        await deleteStudent(studentId)
        setStudents((prev) => prev.filter((s) => s.id !== studentId))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Delete failed')
      }
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Institution Student Roster</h2>
          <p className="mt-0.5 text-xs text-slate-500">{students.length} students registered in database</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2.5 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-sm" aria-label="Student roster">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-3">Roll Number</th>
              <th scope="col" className="px-5 py-3">Student Name</th>
              <th scope="col" className="px-4 py-3">Email</th>
              <th scope="col" className="px-4 py-3">Program</th>
              <th scope="col" className="px-4 py-3">Department</th>
              <th scope="col" className="px-4 py-3">Year</th>
              <th scope="col" className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <GraduationCap className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  <p className="text-sm font-medium text-slate-700">No students registered yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Upload a CSV or Excel roster file above to bulk import student records.
                  </p>
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {student.roll_number}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === student.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-medium focus:border-slate-900 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-slate-900">{student.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {editingId === student.id ? (
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="email@nitrkl.ac.in"
                        className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-900 focus:outline-none"
                      />
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">{student.email || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{student.derived_program || '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{student.derived_department || '—'}</td>
                  <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">{student.derived_year || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {editingId === student.id ? (
                        <>
                          <button
                            onClick={() => handleEditSave(student.id)}
                            disabled={isPending}
                            title="Save changes"
                            className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                          >
                            {isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Save
                          </button>
                          <button
                            onClick={handleEditCancel}
                            title="Cancel"
                            className="inline-flex items-center gap-1 rounded bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditStart(student)}
                            title="Edit student"
                            className="inline-flex items-center gap-1 rounded bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(student.id, student.name)}
                            disabled={isPending}
                            title="Delete student"
                            className="inline-flex items-center gap-1 rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
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
  )
}
