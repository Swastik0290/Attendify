'use client'

import { useState, useTransition } from 'react'
import { CalendarCheck, Trash2, RefreshCw } from 'lucide-react'
import { AttendanceSession } from '@/lib/types'
import { deleteAttendanceSession } from '@/lib/actions'
import { DownloadAttendanceButton } from '@/components/DownloadAttendanceButton'
import Link from 'next/link'

interface SessionsTabsProps {
  initialSessions?: AttendanceSession[]
  isAdmin?: boolean
}

export function SessionsTabs({ initialSessions = [], isAdmin = false }: SessionsTabsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')
  const [sessions, setSessions] = useState<AttendanceSession[]>(initialSessions)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeSessions = sessions.filter((s) => s.status === 'ACTIVE')
  const pastSessions = sessions.filter((s) => s.status === 'CLOSED')
  const displayedSessions = activeTab === 'active' ? activeSessions : pastSessions

  const handleDeleteSession = (sessionId: string) => {
    if (!confirm('Delete this session and all its attendance records? This cannot be undone.')) return
    setDeleteError(null)
    startTransition(async () => {
      try {
        await deleteAttendanceSession(sessionId)
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } catch (err: unknown) {
        setDeleteError(err instanceof Error ? err.message : 'Delete failed')
      }
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/75 px-5">
        <button
          onClick={() => setActiveTab('active')}
          className={`border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'active'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Live / Active Sessions ({activeSessions.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'past'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Past Sessions ({pastSessions.length})
        </button>
      </div>

      {deleteError && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2 text-xs text-red-700">
          {deleteError}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm" aria-label="Sessions list">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-3">Subject</th>
              <th scope="col" className="px-4 py-3">Faculty</th>
              <th scope="col" className="px-4 py-3">Started At</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Attendance</th>
              <th scope="col" className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedSessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-xs text-slate-400">
                  <CalendarCheck className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                  {activeTab === 'active'
                    ? 'No live attendance sessions active right now.'
                    : 'No past attendance sessions recorded.'}
                </td>
              </tr>
            ) : (
              displayedSessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {session.subject?.code} • {session.subject?.name}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">
                    {session.faculty?.name || 'Assigned Faculty'}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                    {new Date(session.started_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        session.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {session.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-slate-900">
                    {session.present_count || 0} Present
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {session.status === 'ACTIVE' ? (
                        <Link
                          href={`/faculty/subjects/${session.subject_id}/session`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                        >
                          View Live QR →
                        </Link>
                      ) : (
                        <>
                          <DownloadAttendanceButton
                            sessionId={session.id}
                            subjectCode={session.subject?.code}
                          />
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              disabled={isPending}
                              title="Delete this session"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded transition-colors disabled:opacity-50"
                            >
                              {isPending ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          )}
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
