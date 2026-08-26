'use client'

import { useState, useTransition } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import { getSessionAttendanceForExport } from '@/lib/actions'

interface DownloadAttendanceButtonProps {
  sessionId: string
  subjectCode?: string
  label?: string
  className?: string
}

function toCSV(rows: object[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String((row as Record<string, unknown>)[h] ?? '')
          // Quote fields containing commas or newlines
          return val.includes(',') || val.includes('\n') || val.includes('"')
            ? `"${val.replace(/"/g, '""')}"`
            : val
        })
        .join(',')
    ),
  ]
  return lines.join('\r\n')
}

export function DownloadAttendanceButton({
  sessionId,
  subjectCode,
  label = 'Download CSV',
  className,
}: DownloadAttendanceButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDownload = () => {
    setError(null)
    startTransition(async () => {
      try {
        const data = await getSessionAttendanceForExport(sessionId)

        if (data.records.length === 0) {
          setError('No attendance records found for this session.')
          return
        }

        const sessionDate = data.startedAt
          ? new Date(data.startedAt).toLocaleDateString('en-IN', {
              day: '2-digit', month: 'short', year: 'numeric',
            }).replace(/ /g, '-')
          : 'session'

        const rows = data.records.map((r, i) => ({
          'S.No': i + 1,
          'Roll Number': r.rollNumber,
          'Student Name': r.name,
          Email: r.email,
          Program: r.program,
          Department: r.department,
          Year: r.year,
          'Scan Time': r.scannedAt
            ? new Date(r.scannedAt).toLocaleTimeString('en-IN', { hour12: true })
            : '',
          'Subject Code': data.subjectCode,
          'Subject Name': data.subjectName,
          Faculty: data.facultyName,
          'Session Date': sessionDate,
        }))

        const csv = toCSV(rows)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `attendance_${data.subjectCode || subjectCode || 'session'}_${sessionDate}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Export failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={handleDownload}
        disabled={isPending}
        title="Download attendance as CSV"
        className={
          className ||
          'inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition-colors disabled:opacity-50'
        }
      >
        {isPending ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {label}
      </button>
      {error && (
        <span className="text-[10px] text-red-500 max-w-[160px] text-right">{error}</span>
      )}
    </span>
  )
}
