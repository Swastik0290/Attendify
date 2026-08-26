'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Camera,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react'
import { submitAttendanceScan, ScanAttendanceResult } from '@/lib/actions'
import { getAuthenticationOptions, verifyAuthentication } from '@/lib/passkey-actions'
import { startAuthentication } from '@simplewebauthn/browser'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type CameraState = 'idle' | 'requesting' | 'granted' | 'denied' | 'error'

export function StudentScanner() {
  const [scanResult, setScanResult] = useState<ScanAttendanceResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [manualTokenInput, setManualTokenInput] = useState('')
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [cameraError, setCameraError] = useState<string>('')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef(false)

  const searchParams = useSearchParams()
  const urlToken = searchParams.get('token')

  const handleProcessScannedData = useCallback(async (data: string) => {
    if (isProcessing) return
    setIsProcessing(true)

    // Stop the camera once we've got a scan
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop()
        isScanningRef.current = false
      } catch { /* ignore */ }
    }

    let tokenToSubmit = data
    if (data.startsWith('http')) {
      try {
        const url = new URL(data)
        tokenToSubmit = url.searchParams.get('token') || data
      } catch { /* ignore */ }
    }

    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate(100)
      }

      // Passkey Verification Step (optional — only if passkeys are registered)
      try {
        const options = await getAuthenticationOptions()
        if (options.allowCredentials && options.allowCredentials.length > 0) {
          const authResp = await startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]['optionsJSON'] })
          const verification = await verifyAuthentication(authResp)
          if (!verification.success) {
            throw new Error('Biometric verification failed. Please try again.')
          }
        }
      } catch (err: unknown) {
        const e = err as Error
        if (e.name === 'NotAllowedError') {
          throw new Error('Biometric verification cancelled.')
        }
        if (e.message && e.message.includes('Biometric')) {
          throw err
        }
        // No passkey registered — proceed normally
      }

      const result = await submitAttendanceScan(tokenToSubmit)
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

  // If a token came in the URL (from camera-app redirect), process it immediately
  useEffect(() => {
    if (urlToken) {
      handleProcessScannedData(urlToken)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken])

  const startCamera = useCallback(async () => {
    if (cameraState === 'requesting' || cameraState === 'granted') return
    setCameraState('requesting')
    setCameraError('')

    try {
      // Explicitly request camera permission first so the browser shows the prompt
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      // Immediately stop the test stream — Html5Qrcode will open its own
      stream.getTracks().forEach(t => t.stop())
      
      // Add a tiny delay before granting state to ensure hardware releases the stream 
      // preventing a black screen on iOS Safari.
      setTimeout(() => setCameraState('granted'), 150)
    } catch (err: unknown) {
      const e = err as Error
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setCameraState('denied')
        setCameraError('Camera access denied. Please allow camera access in your browser settings and try again.')
      } else if (e.name === 'NotFoundError') {
        setCameraState('error')
        setCameraError('No camera found on this device.')
      } else {
        setCameraState('error')
        setCameraError(`Camera error: ${e.message || 'Unknown error'}`)
      }
    }
  }, [cameraState])

  // Once permission is granted, start the Html5Qrcode scanner
  useEffect(() => {
    if (cameraState !== 'granted' || isScanningRef.current || scanResult) return

    const containerId = 'qr-reader-container'

    // Small delay to ensure DOM element is ready
    const timer = setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        })
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 30,
            disableFlip: false, // Ensures front/back camera isn't mirrored incorrectly
          },
          (decodedText: string) => {
            handleProcessScannedData(decodedText)
          },
          () => {
            // Ignore per-frame errors while seeking
          }
        )
        isScanningRef.current = true
      } catch (err: unknown) {
        const e = err as Error
        setCameraState('error')
        setCameraError(`Could not start QR scanner: ${e.message || 'Unknown error'}`)
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [cameraState, scanResult, handleProcessScannedData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && isScanningRef.current) {
        scannerRef.current.stop().catch(() => {})
        isScanningRef.current = false
      }
    }
  }, [])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTokenInput.trim()) return
    handleProcessScannedData(manualTokenInput.trim())
  }

  const handleResetScan = () => {
    setScanResult(null)
    setManualTokenInput('')
    // Restart camera after reset
    setCameraState('idle')
    isScanningRef.current = false
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

            {/* Camera Viewport */}
            <div className="mt-4 overflow-hidden rounded-xl bg-slate-950 min-h-[300px] flex items-center justify-center relative">
              {/* Hidden until camera is active */}
              <div
                id="qr-reader-container"
                className={`w-full ${cameraState === 'granted' ? 'block' : 'hidden'}`}
              />

              {/* Idle: prompt user to tap */}
              {cameraState === 'idle' && !urlToken && (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <div className="mx-auto h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 ring-4 ring-slate-700">
                    <Camera className="h-8 w-8 text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200 mb-1">Camera Access Required</p>
                  <p className="text-xs text-slate-400 mb-5 max-w-xs">
                    Tap below to allow camera access so you can scan the QR code displayed in the classroom.
                  </p>
                  <button
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-sm font-bold text-white transition-colors shadow-lg"
                  >
                    <Camera className="h-4 w-4" />
                    Allow Camera &amp; Scan
                  </button>
                </div>
              )}

              {/* Requesting: show spinner */}
              {cameraState === 'requesting' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mb-3" />
                  <p className="text-xs text-slate-300">Requesting camera access…</p>
                  <p className="text-[11px] text-slate-500 mt-1">Check the browser permission prompt above.</p>
                </div>
              )}

              {/* Denied / Error */}
              {(cameraState === 'denied' || cameraState === 'error') && (
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <ShieldAlert className="h-10 w-10 text-red-400 mb-3" />
                  <p className="text-sm font-semibold text-red-300 mb-1">
                    {cameraState === 'denied' ? 'Camera Access Denied' : 'Camera Error'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mb-4">{cameraError}</p>
                  <button
                    onClick={() => { setCameraState('idle'); setCameraError('') }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-4 py-2 text-xs font-semibold text-white transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Try Again
                  </button>
                </div>
              )}

              {/* Processing overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mb-2" />
                  <span className="text-xs font-semibold">Verifying cryptographic signature...</span>
                </div>
              )}

              {/* Processing from URL token */}
              {urlToken && !scanResult && cameraState === 'idle' && (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin mb-3" />
                  <p className="text-xs text-slate-300">Verifying attendance token…</p>
                </div>
              )}
            </div>
          </div>

          {/* Desktop / Manual Token Fallback */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Desktop / Testing Fallback
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              If camera access is unavailable, paste the QR token below:
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
