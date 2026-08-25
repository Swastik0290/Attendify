'use client'

import { useState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { AttendanceSession } from '@/lib/types'
import Link from 'next/link'

interface SessionsTabsProps {
  initialSessions?: AttendanceSession[]
}

export function SessionsTabs({ initialSessions = [] }: SessionsTabsProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')

  const activeSessions = initialSessions.filter((s) => s.status === 'ACTIVE')
  const pastSessions = initialSessions.filter((s) => s.status === 'CLOSED')

  const displayedSessions = activeTab === 'active' ? activeSessions : pastSessions

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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] text-left text-sm" aria-label="Sessions list">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-5 py-3">Subject</th>
              <th scope="col" className="px-4 py-3">Faculty</th>
              <th scope="col" className="px-4 py-3">Started At</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Attendance</th>
              <th scope="col" className="px-5 py-3 text-right">Action</th>
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
                    {session.status === 'ACTIVE' ? (
                      <Link
                        href={`/faculty/subjects/${session.subject_id}/session`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                      >
                        View Live QR →
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-400">Archived</span>
                    )}
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
