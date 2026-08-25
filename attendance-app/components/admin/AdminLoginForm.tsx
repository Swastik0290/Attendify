'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { ShieldCheck, LogIn, Loader2, Key } from 'lucide-react'

export function AdminLoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError('')
    
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    }
  }

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      window.location.href = '/admin'
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white mb-4">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            AttendanceIQ Admin
          </h1>
          <p className="text-sm text-slate-500">
            Secure backend portal for Super Administrators.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          type="button"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-md active:scale-98 disabled:opacity-70"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4 text-emerald-400" />
          )}
          Sign in with Google
        </button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">OR (Dev Testing)</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleDevLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="superadmin@attendanceiq.test"
            className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-slate-900 px-5 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-all shadow-sm active:scale-98 disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Key className="h-4 w-4 text-slate-900" />
            )}
            Sign in with Credentials
          </button>
        </form>

        <p className="text-xs text-center text-slate-400 mt-4">
          Access restricted to authorized personnel only.
        </p>
      </div>
    </div>
  )
}
