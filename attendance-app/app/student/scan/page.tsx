import type { Metadata } from 'next'
import { StudentScanner } from '@/components/student/StudentScanner'

export const metadata: Metadata = { title: 'QR Scanner' }

export default function StudentScanPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6 flex flex-col justify-center">
      <StudentScanner />
    </main>
  )
}
