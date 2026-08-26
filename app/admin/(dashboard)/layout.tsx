import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/AdminShell'

export const metadata: Metadata = {
  title: {
    default: 'Administration',
    template: '%s | Administration — AttendanceIQ',
  },
  description: 'Super Admin administration panel for AttendanceIQ.',
  // Prevent search engines from indexing admin pages
  robots: { index: false, follow: false },
}

import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/admin/login')
  }

  if (session.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-xl p-8 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600 mb-2">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your account does not have Super Administrator privileges. This area is strictly restricted.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <AdminShell>{children}</AdminShell>
}
