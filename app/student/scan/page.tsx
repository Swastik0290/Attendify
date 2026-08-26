import type { Metadata } from 'next'
import { StudentScanner } from '@/components/student/StudentScanner'

export const metadata: Metadata = { title: 'QR Scanner' }

import { Suspense } from 'react'

export default function StudentScanPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 flex flex-col justify-center">
      <Suspense fallback={<div className="text-center p-12 text-slate-500">Loading scanner...</div>}>
        <StudentScanner />
      </Suspense>
    </main>
  )
}
