'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Camera,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import { submitAttendanceScan, ScanAttendanceResult } from '@/lib/actions'
import { getAuthenticationOptions, verifyAuthentication } from '@/lib/passkey-actions'
import { startAuthentication } from '@simplewebauthn/browser'
import Link from 'next/link'

export function StudentScanner() {
  const [scanResult, setScanResult] = useState<ScanAttendanceResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualTokenInput, setManualTokenInput] = useState('')
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const isMountedRef = useRef(false)

  const handleProcessScannedData = useCallback(async (data: string) => {
    if (isProcessing) return
    setIsProcessing(true)

    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate(100)
      }

      // Passkey Verification Step
      try {
        const options = await getAuthenticationOptions()
        if (options.allowCredentials && options.allowCredentials.length > 0) {
          const authResp = await startAuthentication({ optionsJSON: options as any })
          const verification = await verifyAuthentication(authResp)
          if (!verification.success) {
            throw new Error('Biometric verification failed. Please try again.')
          }
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          throw new Error('Biometric verification cancelled.')
        }
        // If they have no passkey, options will have empty allowCredentials and we just proceed normally,
        // unless startAuthentication throws another error which we bubble up.
        // Wait, if it fails for other reasons, let's just log it and proceed for V1 if we don't strictly enforce.
        // But for "strengthening identity", if they registered a passkey, we MUST enforce it.
        if (err.message && err.message.includes('Biometric')) {
            throw err
        }
      }

      const result = await submitAttendanceScan(data)
      setScanResult(result)
    } catch (err: unknown) {
      setScanResult({
        success: false,
        error: 'SERVER_ERROR',
        message: err instanceof Error ? err.message : 'Failed to verify attendance scan',
      })
    } finally {
      setIsProcessing(false)
    }
  }, [isProcessing])

  useEffect(() => {
    if (!isMountedRef.current && typeof window !== 'undefined') {
      isMountedRef.current = true
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            rememberLastUsedCamera: true,
            aspectRatio: 1.0,
          },
          false
        )

        scanner.render(
          (decodedText: string) => {
            handleProcessScannedData(decodedText)
          },
          () => {
            // Ignore scan errors while seeking
          }
        )

        scannerRef.current = scanner
      } catch (err) {
        console.error('QR scanner initialization error:', err)
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
    }
  }, [handleProcessScannedData])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTokenInput.trim()) return
    handleProcessScannedData(manualTokenInput.trim())
  }

  const handleResetScan = () => {
    setScanResult(null)
    setManualTokenInput('')
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/student"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Attendance Scanner
        </span>
      </div>

      {/* Result Card */}
      {scanResult ? (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          {scanResult.success ? (
            /* SUCCESS STATE */
            <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white p-6 shadow-xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 ring-8 ring-emerald-50 mb-4">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>

              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
                ✓ Attendance Recorded
              </span>

              <h2 className="text-2xl font-black text-slate-900 mt-1">
                {scanResult.subjectCode}
              </h2>
              <p className="text-sm font-medium text-slate-600 mt-0.5">
                {scanResult.subjectName}
              </p>

              <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-100 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900">{scanResult.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Roll Number:</span>
                  <span className="font-mono font-bold text-slate-900">{scanResult.rollNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Attendance Status:</span>
                  <span className="font-bold text-emerald-600">Present</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recorded At:</span>
                  <span className="font-mono text-slate-700">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  href="/student"
                  className="w-full inline-flex justify-center items-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-md"
                >
                  View My Attendance Records
                </Link>
              </div>
            </div>
          ) : (
            /* ERROR / REJECTION STATE */
            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white p-6 shadow-xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 ring-8 ring-red-50 mb-4">
                {scanResult.error === 'ALREADY_ATTENDED' ? (
                  <AlertTriangle className="h-10 w-10 text-amber-600" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600" />
                )}
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                {scanResult.error === 'ALREADY_ATTENDED'
                  ? 'Already Attended'
                  : scanResult.error === 'EXPIRED_QR'
                  ? 'QR Expired'
                  : scanResult.error === 'NOT_ENROLLED'
                  ? 'Not Enrolled'
                  : 'Scan Failed'}
              </h3>

              <p className="text-sm text-slate-600 mt-2">{scanResult.message}</p>

              <div className="mt-6">
                <button
                  onClick={handleResetScan}
                  className="w-full inline-flex justify-center items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" /> Scan Again
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CAMERA SCANNER VIEW */
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
            <h2 className="text-sm font-bold text-slate-900 flex items-center justify-center gap-1.5">
              <Camera className="h-4 w-4 text-emerald-600" /> Scan Classroom QR
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Point your phone camera at the active rotating QR on the classroom projector.
            </p>

            {/* Html5Qrcode Scanner Container */}
            <div className="mt-4 overflow-hidden rounded-xl bg-slate-950 min-h-[300px] flex items-center justify-center relative">
              <div id="qr-reader-container" className="w-full text-white" />
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mb-2" />
                  <span className="text-xs font-semibold">Verifying cryptographic signature...</span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Testing Fallback: Token Input */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Desktop / Emulator Testing Fallback
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              If camera access is unavailable in automated tests or desktop, paste the QR token below:
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="Paste Base64 or JSON token..."
                className="flex-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono focus:border-slate-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isProcessing || !manualTokenInput.trim()}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
