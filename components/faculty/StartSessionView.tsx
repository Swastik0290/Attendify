'use client'

import { useState, useTransition } from 'react'
import { PlayCircle, RefreshCw, AlertTriangle, StopCircle } from 'lucide-react'
import { startAttendanceSession, closeAttendanceSession } from '@/lib/actions'
import { LiveQRSession } from './LiveQRSession'
import { AttendanceSession } from '@/lib/types'

interface StartSessionViewProps {
  subjectId: string
  subjectCode: string
  subjectName: string
  existingActiveSession: AttendanceSession | null
  activeSessionNumber: number
  nextSessionNumber: number
}

export function StartSessionView({
  subjectId,
  subjectCode,
  existingActiveSession,
  activeSessionNumber,
  nextSessionNumber,
}: StartSessionViewProps) {
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(existingActiveSession)
  const [currentSessionNumber, setCurrentSessionNumber] = useState<number>(
    existingActiveSession ? activeSessionNumber : nextSessionNumber
  )
  const [sessionStarted, setSessionStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isClosingExisting, startCloseTransition] = useTransition()

  // If there's a pre-existing active session, show resume/end options
  // Once sessionStarted is true, always show the live QR view
  const showQR = sessionStarted || (!!activeSession && sessionStarted)

  const handleStartSession = () => {
    startTransition(async () => {
      try {
        setError(null)
        const res = await startAttendanceSession(subjectId)
        setActiveSession({
          id: res.sessionId,
          subject_id: subjectId,
          faculty_id: '',
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
        })
        setCurrentSessionNumber(nextSessionNumber)
        setSessionStarted(true)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to start session')
      }
    })
  }

  const handleResumeExisting = () => {
    setCurrentSessionNumber(activeSessionNumber)
    setSessionStarted(true)
  }

  const handleEndExistingAndStartNew = () => {
    if (!existingActiveSession) return
    startCloseTransition(async () => {
      try {
        setError(null)
        await closeAttendanceSession(existingActiveSession.id)
        const res = await startAttendanceSession(subjectId)
        setActiveSession({
          id: res.sessionId,
          subject_id: subjectId,
          faculty_id: '',
          status: 'ACTIVE',
          started_at: new Date().toISOString(),
        })
        setCurrentSessionNumber(nextSessionNumber)
        setSessionStarted(true)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to start session')
      }
    })
  }

  // Show the live QR once a session is active and started
  if (sessionStarted && activeSession) {
    return (
      <LiveQRSession
        sessionId={activeSession.id}
        subjectCode={subjectCode}
        subjectName={subjectName}
        sessionNumber={currentSessionNumber}
      />
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      {/* Subject Info */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 mb-3">
          <span className="font-mono">{subjectCode}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{subjectName}</h1>
        <p className="text-sm text-slate-500 mt-1">Attendance Session Control</p>
      </div>

      {error && (
        <div className="w-full max-w-sm p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Existing Active Session Banner */}
      {existingActiveSession && !sessionStarted && (
        <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs font-semibold">
              An active session already exists for this subject.
            </p>
          </div>
          <p className="text-xs text-amber-700">
            Started at:{' '}
            <span className="font-mono font-semibold">
              {new Date(existingActiveSession.started_at).toLocaleString()}
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleResumeExisting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-sm"
            >
              <PlayCircle className="h-4 w-4" />
              Resume Existing Session
            </button>
            <button
              onClick={handleEndExistingAndStartNew}
              disabled={isClosingExisting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-sm disabled:opacity-50"
            >
              {isClosingExisting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <StopCircle className="h-4 w-4" />
              )}
              {isClosingExisting ? 'Starting New…' : 'End That & Start Fresh'}
            </button>
          </div>
        </div>
      )}

      {/* Start New Session Card */}
      {!existingActiveSession && (
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-lg text-center space-y-5">
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center">
            <PlayCircle className="h-10 w-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Ready to Start Attendance?</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Once you start, a rotating HMAC-signed QR code will be displayed. Students scan it with
              their phone camera to mark attendance. End the session when class is over.
            </p>
          </div>
          <button
            onClick={handleStartSession}
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-4 text-sm font-bold text-white transition-colors shadow-lg disabled:opacity-60"
          >
            {isPending ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <PlayCircle className="h-5 w-5" />
            )}
            {isPending ? 'Starting Session…' : 'Start Attendance Session'}
          </button>
        </div>
      )}
    </div>
  )
}
