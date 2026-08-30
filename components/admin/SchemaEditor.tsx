'use client'

import { useState, useTransition } from 'react'
import { RollSchemaConfig, RollSchemaSegment } from '@/lib/types'
import { DEFAULT_INSTITUTIONAL_SCHEMA } from '@/lib/schema-parser'
import { updateInstitutionalRollSchema } from '@/lib/actions'
import {
  CheckCircle2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface SchemaEditorProps {
  initialConfig?: RollSchemaConfig
}

type SegmentType = 'numeric' | 'alphanumeric' | 'alpha'

export function SchemaEditor({ initialConfig = DEFAULT_INSTITUTIONAL_SCHEMA }: SchemaEditorProps) {
  const [config, setConfig] = useState<RollSchemaConfig>(initialConfig)
  const [testRoll, setTestRoll] = useState('124CS1001')
  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [expandedSegment, setExpandedSegment] = useState<number | null>(null)
  const [segmentToRemove, setSegmentToRemove] = useState<number | null>(null)
  const [mappingToAdd, setMappingToAdd] = useState<{segIdx: number, code: string, label: string} | null>(null)

  // ─── Segment-level helpers ─────────────────────────────────────────────────

  const updateSegment = (idx: number, patch: Partial<RollSchemaSegment>) => {
    setConfig((prev) => ({
      segments: prev.segments.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }))
  }

  const addSegment = () => {
    const newSeg: RollSchemaSegment = {
      name: 'New Segment',
      key: `segment_${Date.now()}`,
      length: 1,
      type: 'alphanumeric',
      description: '',
    }
    setConfig((prev) => ({ segments: [...prev.segments, newSeg] }))
    setExpandedSegment(config.segments.length)
  }

  const confirmRemoveSegment = () => {
    if (segmentToRemove === null) return
    setConfig((prev) => ({ segments: prev.segments.filter((_, i) => i !== segmentToRemove) }))
    setExpandedSegment(null)
    setSegmentToRemove(null)
  }

  const confirmAddMapping = (e: React.FormEvent) => {
    e.preventDefault()
    if (!mappingToAdd || !mappingToAdd.code.trim() || !mappingToAdd.label.trim()) return
    const { segIdx, code, label } = mappingToAdd
    const existing = config.segments[segIdx].mappings || {}
    updateSegment(segIdx, { mappings: { ...existing, [code.trim()]: label.trim() } })
    setMappingToAdd(null)
  }

  const removeMapping = (segIdx: number, code: string) => {
    const seg = config.segments[segIdx]
    if (!seg.mappings) return
    const updated = { ...seg.mappings }
    delete updated[code]
    updateSegment(segIdx, {
      mappings: Object.keys(updated).length > 0 ? updated : undefined,
    })
  }

  const updateMappingValue = (segIdx: number, code: string, value: string) => {
    const seg = config.segments[segIdx]
    if (!seg.mappings) return
    updateSegment(segIdx, { mappings: { ...seg.mappings, [code]: value } })
  }

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
          <input
            id="test-roll-input"
            type="text"
            value={testRoll}
            onChange={(e) => setTestRoll(e.target.value.toUpperCase())}
            placeholder="e.g. 124CS1001"
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-mono font-bold focus:border-slate-900 focus:outline-none w-full"
          />
        </div>

        {/* Live Parse Results Cards */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(() => {
            // Re-compute raw segments directly from the roll string for accurate display
            let pos = 0
            return config.segments.map((seg, idx) => {
              const raw = testRoll.toUpperCase().slice(pos, pos + seg.length)
              pos += seg.length
              const label = seg.mappings?.[raw] || raw || null
              return (
                <div key={idx} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">{seg.name}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">
                    {label || <span className="text-slate-400 font-normal">Unknown</span>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {seg.description || `Segment ${idx + 1}`}
                  </div>
                </div>
              )
            })
          })()}
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
              Edit segment names, lengths, types, and code mappings. Changes take effect after saving.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={addSegment}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Segment
            </button>
            <button
              onClick={handleSaveSchema}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Save Schema
            </button>
          </div>
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

        <div className="divide-y divide-slate-100">
          {config.segments.map((seg, idx) => (
            <div key={idx} className="p-4">
              {/* Segment Header Row */}
              <div className="flex items-center gap-3">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Segment Name
                    </label>
                    <input
                      type="text"
                      value={seg.name}
                      onChange={(e) => updateSegment(idx, { name: e.target.value })}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  {/* Description */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={seg.description || ''}
                      onChange={(e) => updateSegment(idx, { description: e.target.value })}
                      placeholder="Optional hint"
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  {/* Length */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Length (chars)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={seg.length}
                      onChange={(e) => updateSegment(idx, { length: parseInt(e.target.value) || 1 })}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-mono font-bold focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  {/* Type */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                      Type
                    </label>
                    <select
                      value={seg.type}
                      onChange={(e) => updateSegment(idx, { type: e.target.value as SegmentType })}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs bg-white focus:border-slate-900 focus:outline-none"
                    >
                      <option value="numeric">numeric</option>
                      <option value="alpha">alpha</option>
                      <option value="alphanumeric">alphanumeric</option>
                    </select>
                  </div>
                </div>

                {/* Expand / Delete */}
                <div className="flex items-center gap-1.5 mt-3 sm:mt-0 shrink-0 self-end">
                  <button
                    onClick={() => setExpandedSegment(expandedSegment === idx ? null : idx)}
                    title={expandedSegment === idx ? 'Collapse mappings' : 'Edit code mappings'}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {expandedSegment === idx ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                    {seg.mappings ? `${Object.keys(seg.mappings).length} mappings` : 'No mappings'}
                  </button>
                  <button
                    onClick={() => setSegmentToRemove(idx)}
                    title="Remove this segment"
                    className="inline-flex items-center rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded Mappings Editor */}
              {expandedSegment === idx && (
                <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-slate-700">
                      Code → Label Mappings
                    </h4>
                    <button
                      onClick={() => setMappingToAdd({segIdx: idx, code: '', label: ''})}
                      className="inline-flex items-center gap-1 rounded bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Mapping
                    </button>
                  </div>
                  {!seg.mappings || Object.keys(seg.mappings).length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      No mappings — segment value will be used directly as-is.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(seg.mappings).map(([code, label]) => (
                        <div key={code} className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded text-xs min-w-[60px] text-center">
                            {code}
                          </span>
                          <span className="text-slate-400 text-xs">→</span>
                          <input
                            type="text"
                            value={label}
                            onChange={(e) => updateMappingValue(idx, code, e.target.value)}
                            className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-slate-900 focus:outline-none"
                          />
                          <button
                            onClick={() => removeMapping(idx, code)}
                            title="Remove this mapping"
                            className="inline-flex items-center rounded p-1 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {config.segments.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400">
              No segments defined. Click &quot;Add Segment&quot; to start building your schema.
            </div>
          )}
        </div>
      </div>

      {/* Remove Segment Modal */}
      {segmentToRemove !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <h3 className="text-sm font-bold text-red-900">Remove Segment</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700">
                Are you sure you want to remove this segment from the schema?
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setSegmentToRemove(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveSegment}
                  className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Mapping Modal */}
      {mappingToAdd !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-sky-400" /> Add Code Mapping
              </h3>
            </div>
            <form onSubmit={confirmAddMapping} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Code / Key
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EC"
                  value={mappingToAdd.code}
                  onChange={(e) => setMappingToAdd({ ...mappingToAdd, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Label / Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electronics & Comm."
                  value={mappingToAdd.label}
                  onChange={(e) => setMappingToAdd({ ...mappingToAdd, label: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMappingToAdd(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!mappingToAdd.code.trim() || !mappingToAdd.label.trim()}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  Add Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
