'use client'

import { useState, useTransition } from 'react'
import { RollSchemaConfig, ParsedRollNumber } from '@/lib/types'
import { parseRollNumber, DEFAULT_INSTITUTIONAL_SCHEMA } from '@/lib/schema-parser'
import { updateInstitutionalRollSchema } from '@/lib/actions'
import { CheckCircle2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react'

interface SchemaEditorProps {
  initialConfig?: RollSchemaConfig
}

export function SchemaEditor({ initialConfig = DEFAULT_INSTITUTIONAL_SCHEMA }: SchemaEditorProps) {
  const [config] = useState<RollSchemaConfig>(initialConfig)
  const [testRoll, setTestRoll] = useState('626EC6002')
  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const parsedTestResult: ParsedRollNumber = parseRollNumber(testRoll, config)

  const handleSaveSchema = () => {
    startTransition(async () => {
      try {
        setErrorMsg(null)
        setSuccessMsg(null)
        await updateInstitutionalRollSchema(config)
        setSuccessMsg('Institutional roll-number schema successfully updated in database.')
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to save schema')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Live Interactive Parser Sandbox */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-slate-900">
            Interactive Roll-Number Schema Tester
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Test any roll number to see how the active institutional schema parses its segments.
        </p>

        <div className="max-w-md">
          <label htmlFor="test-roll-input" className="block text-xs font-medium text-slate-700 mb-1">
            Enter Sample Roll Number:
          </label>
          <div className="flex gap-2">
            <input
              id="test-roll-input"
              type="text"
              value={testRoll}
              onChange={(e) => setTestRoll(e.target.value.toUpperCase())}
              placeholder="e.g. 626EC6002"
              className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono font-bold focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Parse Results Cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Degree / Program</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {parsedTestResult.program || <span className="text-slate-400 font-normal">Unknown</span>}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Segment 1 (Pos 1)</div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Admission Year</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {parsedTestResult.year || <span className="text-slate-400 font-normal">Unknown</span>}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Segment 2 (Pos 2-3)</div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Department</div>
            <div className="mt-1 text-sm font-bold text-slate-900">
              {parsedTestResult.department || <span className="text-slate-400 font-normal">Unknown</span>}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Segment 3 (Pos 4-5)</div>
          </div>

          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Student Serial</div>
            <div className="mt-1 text-sm font-mono font-bold text-slate-900">
              {parsedTestResult.serial || <span className="text-slate-400 font-normal">Unknown</span>}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Segment 4 (Remaining)</div>
          </div>
        </div>
      </div>

      {/* Active Schema Segments Configuration */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Active Institutional Schema Configuration
            </h3>
            <p className="text-xs text-slate-500">
              Defines segment positions, character lengths, and human-readable code translations
            </p>
          </div>

          <button
            onClick={handleSaveSchema}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Save Schema
          </button>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border-b border-red-200 p-3 text-xs text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Schema segments">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase">
                  <th scope="col" className="px-4 py-2.5">Segment Name</th>
                  <th scope="col" className="px-4 py-2.5">Length (Chars)</th>
                  <th scope="col" className="px-4 py-2.5">Type</th>
                  <th scope="col" className="px-4 py-2.5">Mapped Codes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {config.segments.map((seg, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{seg.name}</div>
                      <div className="text-[11px] text-slate-500">{seg.description}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {seg.length}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        {seg.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {seg.mappings ? (
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {Object.entries(seg.mappings).slice(0, 6).map(([code, label]) => (
                            <span key={code} className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-700">
                              <strong className="mr-1">{code}:</strong> {label}
                            </span>
                          ))}
                          {Object.keys(seg.mappings).length > 6 && (
                            <span className="text-[10px] text-slate-400">
                              +{Object.keys(seg.mappings).length - 6} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Direct Value</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
