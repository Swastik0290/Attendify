'use client'

import { useState, useTransition, useRef } from 'react'
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Check,
} from 'lucide-react'
import {
  parseFileRaw,
  detectColumnMappings,
  validateRosterRows,
  ColumnMappingDetection,
} from '@/lib/roster-parser'
import { RosterValidationResult, StudentProfile } from '@/lib/types'
import { importStudentRoster } from '@/lib/actions'
import { useRouter } from 'next/navigation'

interface RosterUploaderProps {
  subjectId?: string
  subjectCode?: string
  subjectName?: string
  existingStudents?: StudentProfile[]
}

export function RosterUploader({
  subjectId,
  subjectCode,
  subjectName,
  existingStudents = [],
}: RosterUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [columnDetection, setColumnDetection] = useState<ColumnMappingDetection | null>(null)
  const [selectedRollCol, setSelectedRollCol] = useState<string>('')
  const [selectedNameCol, setSelectedNameCol] = useState<string>('')
  const [selectedEmailCol, setSelectedEmailCol] = useState<string>('')
  const [validationResult, setValidationResult] = useState<RosterValidationResult | null>(null)
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Map existing students by roll number for conflict detection
  const existingMap = new Map<string, string>()
  existingStudents.forEach((s) => existingMap.set(s.roll_number.toUpperCase(), s.name))

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    processFile(selectedFile)
  }

  const processFile = async (uploadedFile: File) => {
    setFile(uploadedFile)
    setFileName(uploadedFile.name)
    setImportStatus(null)

    const buffer = await uploadedFile.arrayBuffer()
    const { headers, rows } = parseFileRaw(buffer, uploadedFile.name)

    setParsedHeaders(headers)
    setParsedRows(rows)

    // Detect columns
    const detection = detectColumnMappings(headers)
    setColumnDetection(detection)

    const rollCol = detection.rollColumn || headers[0] || ''
    const nameCol = detection.nameColumn || headers[1] || ''
    const emailCol = detection.emailColumn || ''

    setSelectedRollCol(rollCol)
    setSelectedNameCol(nameCol)
    setSelectedEmailCol(emailCol)

    // Run initial validation
    const result = validateRosterRows(rows, rollCol, nameCol, emailCol, existingMap)
    setValidationResult(result)
  }

  const handleRecalculateValidation = (roll: string, name: string, email: string) => {
    setSelectedRollCol(roll)
    setSelectedNameCol(name)
    setSelectedEmailCol(email)
    if (parsedRows.length > 0) {
      const result = validateRosterRows(parsedRows, roll, name, email, existingMap)
      setValidationResult(result)
    }
  }

  const handleImport = () => {
    if (!validationResult || validationResult.validRows.length === 0) return

    startTransition(async () => {
      try {
        // React Server Actions cannot serialize `undefined` values within objects,
        // so we sanitize the payload by stringifying & parsing it first.
        const payload = JSON.parse(JSON.stringify(validationResult.validRows))
        const res = await importStudentRoster(payload, subjectId)
        if (res.success) {
          const successMsg = `Successfully imported ${res.importedCount} new, updated ${res.updatedCount || 0} existing profiles, and created ${res.enrolledCount} enrollments!`
          handleReset()
          setImportStatus({
            success: true,
            message: successMsg,
          })
          router.refresh()
        }
      } catch (err: unknown) {
        setImportStatus({
          success: false,
          message: err instanceof Error ? err.message : 'Import failed',
        })
      }
    })
  }

  const handleReset = () => {
    setFile(null)
    setFileName('')
    setParsedHeaders([])
    setParsedRows([])
    setValidationResult(null)
    setImportStatus(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Upload Box */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 px-5 py-3.5 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {subjectCode ? `Upload Roster for ${subjectCode}${subjectName ? ` • ${subjectName}` : ''}` : 'Upload Student Roster'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Supports CSV or Excel (.xlsx / .xls) with automatic intelligent column recognition
            </p>
          </div>
          {file && (
            <button
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-900 underline"
            >
              Choose different file
            </button>
          )}
        </div>

        <div className="p-5">
          {!file ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 px-6 py-10 text-center hover:border-slate-400 hover:bg-slate-50/50 cursor-pointer transition-all"
            >
              <UploadCloud className="mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                Click to browse or drag and drop a roster file here
              </p>
              <p className="mt-1 text-xs text-slate-500">
                CSV or Excel (.xlsx / .xls) • up to 10,000 rows
              </p>

              {/* Sample expected format preview */}
              <div className="mt-5 max-w-md w-full rounded-md bg-slate-50 p-3 border border-slate-200 text-left">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                  Recommended Column Formats:
                </div>
                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div>• <code>Registration No</code> or <code>Roll Number</code> (e.g. 626EC6002)</div>
                  <div>• <code>Full Name</code> or <code>Student Name</code> (e.g. Swastik Sidharth Rath)</div>
                  <div>• <i>Optional:</i> <code>Institutional Email</code>, <code>Department</code></div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-5">
              {/* File Info Bar */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                  <div>
                    <div className="text-xs font-semibold text-slate-900">{fileName}</div>
                    <div className="text-[11px] text-slate-500">
                      {parsedRows.length} rows parsed • {parsedHeaders.length} columns detected
                    </div>
                  </div>
                </div>

                {columnDetection && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                      columnDetection.confidence === 'high'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {columnDetection.confidence === 'high' ? '✓ Auto-matched columns' : 'Review column mapping'}
                  </span>
                )}
              </div>

              {/* Column Mapping Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-slate-50/75 border border-slate-200">
                <div>
                  <label htmlFor="select-roll-column" className="block text-xs font-medium text-slate-700 mb-1">
                    Roll Number Column <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="select-roll-column"
                    value={selectedRollCol}
                    onChange={(e) => handleRecalculateValidation(e.target.value, selectedNameCol, selectedEmailCol)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">Select column...</option>
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="select-name-column" className="block text-xs font-medium text-slate-700 mb-1">
                    Student Name Column <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="select-name-column"
                    value={selectedNameCol}
                    onChange={(e) => handleRecalculateValidation(selectedRollCol, e.target.value, selectedEmailCol)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">Select column...</option>
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="select-email-column" className="block text-xs font-medium text-slate-700 mb-1">
                    Email Column (Optional)
                  </label>
                  <select
                    id="select-email-column"
                    value={selectedEmailCol}
                    onChange={(e) => handleRecalculateValidation(selectedRollCol, selectedNameCol, e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 focus:border-slate-900 focus:outline-none"
                  >
                    <option value="">(None)</option>
                    {parsedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Validation Summary Cards */}
              {validationResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="rounded-md border border-slate-200 bg-white p-2.5">
                      <div className="text-lg font-bold text-slate-900">{validationResult.totalRows}</div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Rows</div>
                    </div>
                    <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-2.5">
                      <div className="text-lg font-bold text-emerald-700">{validationResult.validRows.length}</div>
                      <div className="text-[10px] text-emerald-800 uppercase font-semibold">Valid Rows</div>
                    </div>
                    <div className="rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
                      <div className="text-lg font-bold text-amber-700">{validationResult.duplicateRows.length}</div>
                      <div className="text-[10px] text-amber-800 uppercase font-semibold">Duplicates</div>
                    </div>
                    <div className="rounded-md border border-red-200 bg-red-50/50 p-2.5">
                      <div className="text-lg font-bold text-red-700">
                        {validationResult.missingRollRows.length + validationResult.missingNameRows.length}
                      </div>
                      <div className="text-[10px] text-red-800 uppercase font-semibold">Missing Data</div>
                    </div>
                    <div className="rounded-md border border-purple-200 bg-purple-50/50 p-2.5">
                      <div className="text-lg font-bold text-purple-700">{validationResult.conflictRows.length}</div>
                      <div className="text-[10px] text-purple-800 uppercase font-semibold">Name Conflicts</div>
                    </div>
                  </div>

                  {/* Conflict Notice if any */}
                  {validationResult.conflictRows.length > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                      <div className="font-semibold flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        {validationResult.conflictRows.length} Name Conflict(s) Detected:
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {validationResult.conflictRows.slice(0, 3).map((c, i) => (
                          <li key={i}>
                            <strong>{c.rollNumber}</strong>: DB has &quot;{c.existingName}&quot;, file has &quot;{c.uploadedName}&quot;.
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-[10px] text-amber-700">
                        Importing will update the student&apos;s name to the newly uploaded value.
                      </p>
                    </div>
                  )}

                  {/* Preview Table */}
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 border-b border-slate-200">
                      Validation Preview (First 5 Rows)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs" aria-label="Roster preview">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-100 text-slate-600">
                            <th scope="col" className="px-4 py-2">Roll Number</th>
                            <th scope="col" className="px-4 py-2">Student Name</th>
                            <th scope="col" className="px-4 py-2">Email</th>
                            <th scope="col" className="px-4 py-2">Validation Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validationResult.validRows.slice(0, 5).map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-mono font-bold text-slate-900">{row.rollNumber}</td>
                              <td className="px-4 py-2 font-medium text-slate-800">{row.name}</td>
                              <td className="px-4 py-2 text-slate-500">{row.email || '—'}</td>
                              <td className="px-4 py-2 text-emerald-600 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Import
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Import Button */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-slate-500">
                      Automatic roll-number parsing will run for each student upon confirmation.
                    </div>

                    <button
                      onClick={handleImport}
                      disabled={isPending || validationResult.validRows.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
                    >
                      {isPending ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Importing Roster...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Confirm &amp; Import {validationResult.validRows.length} Students
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Status Notice */}
              {importStatus && (
                <div
                  className={`p-3.5 rounded-lg border text-xs flex items-center gap-2 ${
                    importStatus.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {importStatus.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
