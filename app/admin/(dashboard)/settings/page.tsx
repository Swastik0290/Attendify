import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/PageHeader'
import { SchemaEditor } from '@/components/admin/SchemaEditor'
import { getInstitutionalRollSchema } from '@/lib/actions'
import { Shield, Sliders } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Settings & Schema' }

export default async function SettingsPage() {
  const schemaConfig = await getInstitutionalRollSchema()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Schema &amp; Settings"
        description="Configure institution-level roll-number parsing schemas, security parameters, and authentication rules."
      />

      {/* Schema Editor Section */}
      <SchemaEditor initialConfig={schemaConfig} />

      {/* System Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Sliders className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">Attendance QR Parameters</h3>
          </div>
          <div className="text-xs text-slate-500 space-y-1.5 mt-3">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>QR Rotation Interval:</span>
              <span className="font-mono font-semibold text-slate-800">8 seconds</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Attempt Grace Lifetime:</span>
              <span className="font-mono font-semibold text-slate-800">60 seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Cryptographic Signature:</span>
              <span className="font-mono font-semibold text-emerald-700">HMAC-SHA256</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">Access &amp; Security Roles</h3>
          </div>
          <div className="text-xs text-slate-500 space-y-1.5 mt-3">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Super Admin Registration:</span>
              <span className="font-semibold text-red-600">Hidden / Internal Only</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span>Faculty Approval Default:</span>
              <span className="font-semibold text-amber-700">Requires Admin Approval (PENDING)</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Row Level Security (RLS):</span>
              <span className="font-semibold text-emerald-700">Enforced Server-Side</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
