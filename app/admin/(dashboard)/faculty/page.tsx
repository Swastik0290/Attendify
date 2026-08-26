import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { FacultyTable } from '@/components/admin/FacultyTable'
import { getFacultyList } from '@/lib/actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Faculty' }

export default async function FacultyPage() {
  const initialFaculty = await getFacultyList()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faculty Management"
        description="Review pending registration requests and manage faculty access status. Faculty must be individually approved before they can access system features."
      />
      <FacultyTable initialFaculty={initialFaculty} />
    </div>
  )
}
