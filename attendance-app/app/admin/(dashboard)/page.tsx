import type { Metadata } from 'next'
import { Users, GraduationCap, BookOpen, CalendarCheck, Activity } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'
import { EmptyState } from '@/components/admin/EmptyState'
import {
  getFacultyList,
  getStudentsList,
  getSubjectsList,
  getAttendanceSessionsList,
} from '@/lib/actions'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Overview' }

export default async function AdminOverviewPage() {
  const [faculty, students, subjects, sessions] = await Promise.all([
    getFacultyList(),
    getStudentsList(),
    getSubjectsList(),
    getAttendanceSessionsList(),
  ])

  const liveSessionsCount = sessions.filter((s) => s.status === 'ACTIVE').length

  const STATS = [
    {
      label: 'Faculty Members',
      value: String(faculty.length),
      sub: `${faculty.filter((f) => f.status === 'APPROVED').length} approved`,
      icon: Users,
      href: '/admin/faculty',
    },
    {
      label: 'Enrolled Students',
      value: String(students.length),
      sub: 'In institutional roster',
      icon: GraduationCap,
      href: '/admin/students',
    },
    {
      label: 'Active Subjects',
      value: String(subjects.length),
      sub: 'Course offerings',
      icon: BookOpen,
      href: '/admin/subjects',
    },
    {
      label: 'Live Sessions',
      value: String(liveSessionsCount),
      sub: liveSessionsCount > 0 ? 'Active in classrooms' : 'No active sessions',
      icon: CalendarCheck,
      href: '/admin/sessions',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Institutional Overview"
        description="Real-time system-wide attendance statistics, faculty approvals, and roster management."
      />

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 transition-all hover:border-slate-300 hover:shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-50 ring-1 ring-slate-100 group-hover:bg-slate-100">
                  <stat.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {stat.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{stat.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Sessions Activity */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Attendance Sessions
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Real-time attendance records across all courses
            </p>
          </div>
          <Link href="/admin/sessions" className="text-xs font-semibold text-slate-700 hover:text-slate-900">
            View All →
          </Link>
        </div>

        {sessions.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No sessions yet"
            description="Faculty attendance sessions and live records will appear here as they are started."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Recent sessions">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-slate-600 font-semibold uppercase">
                  <th scope="col" className="px-5 py-2.5">Subject</th>
                  <th scope="col" className="px-4 py-2.5">Faculty</th>
                  <th scope="col" className="px-4 py-2.5">Started</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-5 py-2.5 text-right">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.slice(0, 5).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {s.subject?.code} • {s.subject?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.faculty?.name}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {new Date(s.started_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          s.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
                      {s.present_count || 0} Present
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
