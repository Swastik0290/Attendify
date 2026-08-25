import type { Metadata } from 'next'
import Link from 'next/link'
import {
  GraduationCap,
  UserCheck,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Institutional Attendance Management',
}

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto my-auto w-full space-y-10">
      {/* Header & Logo */}
      <div className="text-center space-y-3 max-w-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-xs">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Institutional Classroom Attendance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          AttendanceIQ
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          Cryptographic rotating QR attendance verification and automated student roster matching.
        </p>
      </div>

      {/* Public Entry Portals: Student and Faculty ONLY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Student Portal Card */}
        <Link
          href="/student"
          className="group relative flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-500 hover:shadow-xl transition-all"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Student Portal
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Scan rotating classroom QR codes from your mobile phone and view your verified course attendance records.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Open Student Scanner</span>
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Faculty Portal Card */}
        <Link
          href="/faculty"
          className="group relative flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm hover:border-sky-500 hover:shadow-xl transition-all"
        >
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                Faculty Portal
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Manage course offerings, upload student rosters (CSV/Excel), and broadcast live cryptographic QR sessions.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-700">
            <span>Open Faculty Dashboard</span>
            <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Feature Highlights Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-center text-xs text-slate-500 pt-4 border-t border-slate-200/60">
        <div>
          <strong className="text-slate-800 block mb-0.5">6s Rotating QR</strong>
          <span>HMAC replay-proof protection</span>
        </div>
        <div>
          <strong className="text-slate-800 block mb-0.5">Roster Matching</strong>
          <span>Fuzzy column CSV/XLSX import</span>
        </div>
        <div>
          <strong className="text-slate-800 block mb-0.5">Structured Schemas</strong>
          <span>Automated roll-number parsing</span>
        </div>
      </div>
    </main>
  )
}
