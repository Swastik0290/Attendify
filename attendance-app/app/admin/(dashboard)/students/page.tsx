import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { RosterUploader } from '@/components/admin/RosterUploader'
import { StudentsTable } from '@/components/admin/StudentsTable'
import { getStudentsList } from '@/lib/actions'

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

      {/* Student Roster Table with Edit/Delete */}
      <StudentsTable initialStudents={students} />
    </div>
  )
}
