import { StudentScanner } from '@/components/student/StudentScanner'

export default function TestScannerPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-8 text-center">Scanner Test Page</h1>
        <StudentScanner />
      </div>
    </div>
  )
}
