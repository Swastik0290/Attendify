'use client'

import { useState } from 'react'
import { Fingerprint, Loader2, CheckCircle2 } from 'lucide-react'
import { startRegistration } from '@simplewebauthn/browser'
import { getRegistrationOptions, verifyRegistration } from '@/lib/passkey-actions'

export function PasskeyManager() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleRegister = async () => {
    setStatus('loading')
    setMessage('')
    try {
      // 1. Get options from server
      const options = await getRegistrationOptions()

      // 2. Pass to browser authenticator
      let attResp;
      try {
        attResp = await startRegistration({ optionsJSON: options as any })
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          setStatus('idle')
          return
        }
        throw err
      }

      // 3. Send response to server for verification
      const verification = await verifyRegistration(attResp)

      if (verification.success) {
        setStatus('success')
        setMessage('Passkey registered successfully!')
      } else {
        throw new Error('Verification failed')
      }
    } catch (err: any) {
      setStatus('error')
      setMessage(err.message || 'Failed to register passkey')
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Fingerprint className="h-5 w-5 text-slate-700" />
        <h2 className="text-sm font-bold text-slate-900">Passkeys & WebAuthn</h2>
      </div>
      <p className="text-xs text-slate-500">
        Register a passkey (Face ID, Touch ID, or Windows Hello) to securely scan attendance without needing to re-login frequently.
      </p>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
          {message}
        </div>
      )}

      <button
        onClick={handleRegister}
        disabled={status === 'loading' || status === 'success'}
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
      >
        {status === 'loading' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Fingerprint className="h-3.5 w-3.5" />
        )}
        Register New Passkey
      </button>
    </div>
  )
}
