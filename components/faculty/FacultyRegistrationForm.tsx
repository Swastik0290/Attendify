'use client'

import { useState } from 'react'
import { createFacultyRegistration } from '@/lib/actions'
import { Loader2, ArrowRight } from 'lucide-react'

export function FacultyRegistrationForm() {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError('')

    try {
      await createFacultyRegistration(name.trim())
    } catch (err: any) {
      setError(err.message || 'Failed to register as faculty')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegister} className="mt-6 text-left space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Dr. John Doe"
          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !name.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <ArrowRight className="h-4 w-4 text-white" />
        )}
        Submit Request
      </button>
    </form>
  )
}
