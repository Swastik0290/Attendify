import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { SessionsTabs } from '@/components/admin/SessionsTabs'
import { getAttendanceSessionsList } from '@/lib/actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Attendance Sessions' }

export default async function SessionsPage() {
  const sessions = await getAttendanceSessionsList()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Sessions"
        description="Monitor active classroom sessions in real time and review historical attendance records across all institutional subjects."
      />
      <SessionsTabs initialSessions={sessions} isAdmin />
    </div>
  )
}
