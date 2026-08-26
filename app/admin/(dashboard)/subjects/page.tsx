import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { SubjectsManager } from '@/components/admin/SubjectsManager'
import { getSubjectsList, getFacultyList } from '@/lib/actions'

export const metadata: Metadata = { title: 'Subjects' }

export default async function SubjectsPage() {
  const [initialSubjects, allFaculty] = await Promise.all([
    getSubjectsList(),
    getFacultyList(),
  ])

  // Only pass approved faculty for the dropdown
  const approvedFaculty = allFaculty.filter((f) => f.status === 'APPROVED')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects & Course Offerings"
        description="Create institutional subjects and assign them to approved faculty members. Faculty can then upload rosters and start attendance sessions."
      />
      <SubjectsManager
        initialSubjects={initialSubjects}
        approvedFaculty={approvedFaculty}
      />
    </div>
  )
}
