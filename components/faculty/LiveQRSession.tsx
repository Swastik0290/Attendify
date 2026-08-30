'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  CheckCircle2,
  Clock,
  Users,
  ShieldCheck,
  PowerOff,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import {
  getLiveQRToken,
  getSessionAttendanceLive,
  closeAttendanceSession,
} from '@/lib/actions'
import { DownloadAttendanceButton } from '@/components/DownloadAttendanceButton'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LiveQRSessionProps {
  sessionId: string
  subjectCode: string
  subjectName: string
  sessionNumber: number
}

export function LiveQRSession({ sessionId, subjectCode, subjectName, sessionNumber }: LiveQRSessionProps) {
  const [token, setToken] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number>(6)
  const [isSessionActive, setIsSessionActive] = useState(true)
  const [presentStudents, setPresentStudents] = useState<
    { id: string; scanned_at: string; student: { roll_number: string; name: string } }[]
  >([])
  const [totalEnrolled, setTotalEnrolled] = useState<number>(0)
  const [isClosing, startCloseTransition] = useTransition()
  const router = useRouter()

  const [origin, setOrigin] = useState('')
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const qrValue = token
    ? (origin ? `${origin}/student/scan?token=${encodeURIComponent(token)}` : token)
    : ''

  // Fetch rotating QR token
  const fetchNewToken = useCallback(async () => {
    if (!isSessionActive) return
    const res = await getLiveQRToken(sessionId)
    if (res?.token) {
      setToken(res.token)
      setCountdown(6)
    } else {
      setIsSessionActive(false)
    }
  }, [sessionId, isSessionActive])

  // Poll attendance records
  const fetchLiveAttendance = useCallback(async () => {
    if (!isSessionActive) return
    const data = await getSessionAttendanceLive(sessionId)
    if (data.session?.status === 'CLOSED') {
      setIsSessionActive(false)
    }
    setPresentStudents(data.records as unknown as typeof presentStudents)
    setTotalEnrolled(data.totalEnrolled)
  }, [sessionId, isSessionActive])

  // Countdown timer and token refresh
  useEffect(() => {
    if (!isSessionActive) return

    // Trigger initial fetch asynchronously
    const initialTimer = setTimeout(() => {
      fetchNewToken()
      fetchLiveAttendance()
    }, 0)

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchNewToken()
          return 6
        }
        return prev - 1
      })
    }, 1000)

    const pollInterval = setInterval(() => {
      fetchLiveAttendance()
    }, 2500)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
      clearInterval(pollInterval)
    }
  }, [isSessionActive, fetchNewToken, fetchLiveAttendance])

  const handleCloseSession = () => {
    startCloseTransition(async () => {
      await closeAttendanceSession(sessionId)
      setIsSessionActive(false)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Session Header Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            {isSessionActive ? 'LIVE ATTENDANCE SESSION' : 'SESSION CLOSED'}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {subjectCode} • {subjectName}
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono font-semibold">
            Class #{sessionNumber}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSessionActive ? (
            <button
              onClick={handleCloseSession}
              disabled={isClosing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
            >
              <PowerOff className="h-4 w-4" />
              {isClosing ? 'Closing Session...' : 'End Attendance Session'}
            </button>
          ) : (
            <Link
              href="/faculty"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              Back to Faculty Portal
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid: Rotating QR Display (Left) + Live Roster Counter (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rotating Cryptographic QR */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
          {isSessionActive ? (
            <>
              <div className="relative p-5 bg-white rounded-2xl shadow-xl border-4 border-slate-900 inline-block">
                {token ? (
                  <QRCodeSVG
                    value={qrValue || token}
                    size={420}
                    level="L"
                    includeMargin
                    className="mx-auto"
                  />
                ) : (
                  <div className="w-[420px] h-[420px] flex items-center justify-center bg-slate-100 rounded-lg">
                    <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
                  </div>
                )}

                {/* Secure Tag */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md uppercase tracking-wider">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  HMAC Signed
                </div>
              </div>

              {/* Progress Countdown Bar */}
              <div className="w-full max-w-xs mt-8 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Dynamic Rotation
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    Rotates in {countdown}s
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-slate-900 h-2 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${(countdown / 6) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Students must scan with their mobile camera from the student portal.
                </p>
              </div>
            </>
          ) : (
            <div className="py-12">
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-900">Attendance Session Finished</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Attendance records have been finalized and stored in the database.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Live Present Student List */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50/75 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="h-4 w-4 text-slate-700" /> Live Attendance Feed
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically updates in real time
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <div className="text-right">
                <div className="text-lg font-extrabold text-emerald-600">
                  {presentStudents.length} {totalEnrolled > 0 ? `/ ${totalEnrolled}` : ''}
                </div>
                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">
                  Present
                </div>
              </div>
              {presentStudents.length > 0 && (
                <DownloadAttendanceButton
                  sessionId={sessionId}
                  subjectCode={subjectCode}
                  label="Export"
                />
              )}
            </div>
          </div>

          {/* Student Present List */}
          <div className="flex-1 overflow-y-auto p-4 max-h-[420px] divide-y divide-slate-100">
            {presentStudents.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <Clock className="mx-auto h-8 w-8 text-slate-300 mb-2 animate-pulse" />
                Waiting for students to scan the QR code...
              </div>
            ) : (
              presentStudents.map((record) => (
                <div key={record.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {record.student.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {record.student.roll_number}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono">
                    {new Date(record.scanned_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
