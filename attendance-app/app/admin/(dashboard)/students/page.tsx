import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { RosterUploader } from '@/components/admin/RosterUploader'
import { getStudentsList } from '@/lib/actions'
import { GraduationCap } from 'lucide-react'

export const metadata: Metadata = { title: 'Students & Roster' }

export default async function StudentsPage() {
  const students = await getStudentsList()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students &amp; Roster Management"
        description="Manage the student roster. Students are matched against this list when signing in, and roll numbers are parsed automatically via the institution's schema."
      />

      {/* Roster Uploader */}
      <RosterUploader existingStudents={students} />

      {/* Student Roster Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Institution Student Roster
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {students.length} students registered in database
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm" aria-label="Student roster">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-5 py-3">Roll Number</th>
                <th scope="col" className="px-5 py-3">Student Name</th>
                <th scope="col" className="px-4 py-3">Program (Parsed)</th>
                <th scope="col" className="px-4 py-3">Department (Parsed)</th>
                <th scope="col" className="px-4 py-3">Year</th>
                <th scope="col" className="px-4 py-3">Serial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
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
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {student.name}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {student.derived_program || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">
                      {student.derived_department || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                      {student.derived_year || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-mono">
                      {student.derived_serial || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
