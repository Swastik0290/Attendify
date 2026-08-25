'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { LogIn, Loader2, GraduationCap, UserCheck, KeyRound, Globe } from 'lucide-react'

interface AuthLoginFormProps {
  role: 'STUDENT' | 'FACULTY'
}

export function AuthLoginForm({ role }: AuthLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [tab, setTab] = useState<'password' | 'google'>('password')

  const isStudent = role === 'STUDENT'
  const Icon = isStudent ? GraduationCap : UserCheck
  const accentColor = isStudent ? 'emerald' : 'sky'
  const title = isStudent ? 'Student Portal' : 'Faculty Portal'
  const destination = isStudent ? '/student' : '/faculty'

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr) {
      setError(authErr.message)
      setIsLoading(false)
    } else {
      // Redirect to correct portal
      window.location.href = destination
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${destination}`,
      },
    })

    if (authErr) {
      setError(authErr.message)
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[85vh] items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className={`p-8 pb-6 text-center bg-gradient-to-b from-slate-900 to-slate-800`}>
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-${accentColor}-500/20 border border-${accentColor}-400/30 mb-4`}>
            <Icon className={`h-8 w-8 text-${accentColor}-400`} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {title}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isStudent ? 'Sign in to view your attendance records.' : 'Sign in to manage your subjects & attendance.'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Tab switcher */}
          <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => { setTab('password'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                tab === 'password'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Email & Password
            </button>
            <button
              type="button"
              onClick={() => { setTab('google'); setError('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-all ${
                tab === 'google'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              Google Sign-In
            </button>
          </div>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg leading-relaxed">
              <strong>Error:</strong> {error}
              {error.includes('not enabled') && (
                <div className="mt-1 text-red-500">Google OAuth is not configured. Please use Email & Password login instead.</div>
              )}
            </div>
          )}

          {tab === 'password' ? (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              {!isStudent && (
                <div className="p-3 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg">
                  <strong>Faculty:</strong> Use the email & password your Super Admin set up for you, or switch to Google Sign-In if you have been invited via your Google email.
                </div>
              )}
              {isStudent && (
                <div className="p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <strong>Students:</strong> If you don't have a password, please use Google Sign-In with your institutional email.
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isStudent ? 'your@email.com' : 'faculty@institution.ac.in'}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-16 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-md disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign In
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-center text-slate-500">
                Sign in using your Google account associated with this institution.
              </p>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
