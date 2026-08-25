import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { RosterRow, RosterValidationResult } from './types'

// Normalized keyword lists for intelligent column matching
const ROLL_NUMBER_PATTERNS = [
  'roll number',
  'roll no',
  'rollno',
  'roll_no',
  'roll',
  'registration number',
  'registration no',
  'registrationno',
  'reg number',
  'reg no',
  'regno',
  'reg_no',
  'student id',
  'studentid',
  'student_id',
  'student roll',
  'student roll no',
  'university roll',
  'univ roll',
  'id',
]

const NAME_PATTERNS = [
  'full name',
  'fullname',
  'student name',
  'student fullname',
  'student_name',
  'candidate name',
  'name of student',
  'name of candidate',
  'name',
]

const EMAIL_PATTERNS = [
  'institutional email',
  'institute email',
  'college email',
  'university email',
  'student email',
  'email id',
  'email address',
  'email',
  'mail',
]

/**
 * Normalizes a column header for fuzzy comparison.
 */
export function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[._\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface ColumnMappingDetection {
  rollColumn: string | null
  nameColumn: string | null
  emailColumn: string | null
  confidence: 'high' | 'medium' | 'low'
  allColumns: string[]
}

/**
 * Automatically inspects headers and detects the most probable column mappings.
 */
export function detectColumnMappings(headers: string[]): ColumnMappingDetection {
  let rollCol: string | null = null
  let nameCol: string | null = null
  let emailCol: string | null = null

  const normalizedMap = new Map<string, string>()
  headers.forEach((h) => normalizedMap.set(normalizeHeader(h), h))

  // Find roll column
  for (const pattern of ROLL_NUMBER_PATTERNS) {
    for (const [norm, orig] of normalizedMap.entries()) {
      if (norm === pattern || norm.includes(pattern)) {
        rollCol = orig
        break
      }
    }
    if (rollCol) break
  }

  // Find name column
  for (const pattern of NAME_PATTERNS) {
    for (const [norm, orig] of normalizedMap.entries()) {
      if (norm === pattern || (norm.includes(pattern) && !norm.includes('father') && !norm.includes('mother'))) {
        nameCol = orig
        break
      }
    }
    if (nameCol) break
  }

  // Find email column
  for (const pattern of EMAIL_PATTERNS) {
    for (const [norm, orig] of normalizedMap.entries()) {
      if (norm === pattern || norm.includes(pattern)) {
        emailCol = orig
        break
      }
    }
    if (emailCol) break
  }

  const confidence = rollCol && nameCol ? 'high' : rollCol || nameCol ? 'medium' : 'low'

  return {
    rollColumn: rollCol,
    nameColumn: nameCol,
    emailColumn: emailCol,
    confidence,
    allColumns: headers,
  }
}

/**
 * Parses raw file content (CSV or XLSX ArrayBuffer) into row objects and headers.
 */
export function parseFileRaw(
  buffer: ArrayBuffer,
  fileName: string
): { headers: string[]; rows: Record<string, string>[] } {
  const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')

  if (isXlsx) {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })

    if (!jsonData || jsonData.length === 0) {
      return { headers: [], rows: [] }
    }

    const rawHeaders = (jsonData[0] || []).map((h) => String(h || '').trim()).filter(Boolean)
    const rows: Record<string, string>[] = []

    for (let i = 1; i < jsonData.length; i++) {
      const rowValues = jsonData[i] || []
      if (!rowValues || rowValues.length === 0) continue
      const rowObj: Record<string, string> = {}
      let hasData = false
      rawHeaders.forEach((header, idx) => {
        const val = rowValues[idx] !== undefined && rowValues[idx] !== null ? String(rowValues[idx]).trim() : ''
        rowObj[header] = val
        if (val) hasData = true
      })
      if (hasData) {
        rows.push(rowObj)
      }
    }

    return { headers: rawHeaders, rows }
  } else {
    // CSV
    const decoder = new TextDecoder('utf-8')
    const text = decoder.decode(buffer)
    const result = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
    })

    const headers = result.meta.fields || []
    return { headers, rows: result.data }
  }
}

/**
 * Validates extracted rows using the confirmed column mapping.
 * Checks for missing values, duplicates within the file, and prepares rows for database import.
 */
export function validateRosterRows(
  rows: Record<string, string>[],
  rollColumn: string,
  nameColumn: string,
  emailColumn?: string | null,
  existingStudentsMap?: Map<string, string> // Map of roll_number -> existingName in DB
): RosterValidationResult {
  const seenRollNumbers = new Set<string>()
  const validRows: RosterRow[] = []
  const duplicateRows: { row: number; rollNumber: string; reason: string }[] = []
  const missingRollRows: { row: number; reason: string }[] = []
  const missingNameRows: { row: number; rollNumber?: string; reason: string }[] = []
  const conflictRows: { row: number; rollNumber: string; uploadedName: string; existingName: string }[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 2 // 1-indexed including header
    const rawRoll = (row[rollColumn] || '').trim().toUpperCase()
    const rawName = (row[nameColumn] || '').trim()
    const rawEmail = emailColumn ? (row[emailColumn] || '').trim() : undefined

    if (!rawRoll) {
      missingRollRows.push({ row: rowNumber, reason: 'Roll number is missing or empty' })
      return
    }

    if (!rawName) {
      missingNameRows.push({ row: rowNumber, rollNumber: rawRoll, reason: 'Student name is missing' })
      return
    }

    // Check duplicate in upload batch
    if (seenRollNumbers.has(rawRoll)) {
      duplicateRows.push({ row: rowNumber, rollNumber: rawRoll, reason: 'Duplicate roll number in uploaded file' })
      return
    }

    // Check conflict against existing student name in database
    if (existingStudentsMap && existingStudentsMap.has(rawRoll)) {
      const existingName = existingStudentsMap.get(rawRoll)!
      if (existingName.toLowerCase() !== rawName.toLowerCase()) {
        conflictRows.push({
          row: rowNumber,
          rollNumber: rawRoll,
          uploadedName: rawName,
          existingName,
        })
      }
    }

    seenRollNumbers.add(rawRoll)
    validRows.push({
      rollNumber: rawRoll,
      name: rawName,
      email: rawEmail,
      additionalData: row,
    })
  })

  return {
    totalRows: rows.length,
    validRows,
    duplicateRows,
    missingRollRows,
    missingNameRows,
    conflictRows,
  }
}
