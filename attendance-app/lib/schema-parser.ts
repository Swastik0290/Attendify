import { RollSchemaConfig, ParsedRollNumber } from './types'

export const DEFAULT_INSTITUTIONAL_SCHEMA: RollSchemaConfig = {
  segments: [
    {
      name: 'Degree / Program',
      key: 'program',
      length: 1,
      type: 'numeric',
      description: 'Program code (1=B.Tech, 2=Dual Degree, 6=M.Tech Research, 7=PhD, 8=Integrated MSc)',
      mappings: {
        '1': 'B.Tech',
        '2': 'Dual Degree',
        '3': 'M.Tech',
        '4': 'M.Sc',
        '5': 'MBA',
        '6': 'M.Tech Research',
        '7': 'Ph.D.',
        '8': 'Integrated M.Sc',
      },
    },
    {
      name: 'Admission Year',
      key: 'year',
      length: 2,
      type: 'numeric',
      description: '2-digit admission year (e.g. 26 -> 2026)',
      mappings: {
        '20': '2020',
        '21': '2021',
        '22': '2022',
        '23': '2023',
        '24': '2024',
        '25': '2025',
        '26': '2026',
        '27': '2027',
        '28': '2028',
      },
    },
    {
      name: 'Department',
      key: 'department',
      length: 2,
      type: 'alpha',
      description: 'Department abbreviation (e.g. EC, CS, EE, ME, CE, BM, CH, CR, CY, ER, FP, HS, ID, LS, MA, MM, MN, PH, SM)',
      mappings: {
        'CS': 'Computer Science & Engineering',
        'EC': 'Electronics & Communication Engineering',
        'EE': 'Electrical Engineering',
        'ME': 'Mechanical Engineering',
        'CE': 'Civil Engineering',
        'CH': 'Chemical Engineering',
        'MM': 'Metallurgical & Materials Engineering',
        'MN': 'Mining Engineering',
        'BM': 'Biomedical Engineering',
        'CR': 'Ceramic Engineering',
        'CY': 'Chemistry',
        'ER': 'Earth & Atmospheric Sciences',
        'FP': 'Food Process Engineering',
        'HS': 'Humanities & Social Sciences',
        'ID': 'Industrial Design',
        'LS': 'Life Science',
        'MA': 'Mathematics',
        'PH': 'Physics',
        'SM': 'School of Management',
      },
    },
    {
      name: 'Student Serial / Category',
      key: 'serial',
      length: 4,
      type: 'numeric',
      description: '4-digit unique student serial within program & branch',
    },
  ],
}

/**
 * Parses a student roll number against a given schema configuration.
 * Returns structured metadata without hardcoding logic.
 */
export function parseRollNumber(
  rawRoll: string,
  schemaConfig: RollSchemaConfig = DEFAULT_INSTITUTIONAL_SCHEMA
): ParsedRollNumber {
  const cleanRoll = rawRoll.trim().toUpperCase()
  const result: ParsedRollNumber = {
    raw: cleanRoll,
    valid: true,
    segments: {},
  }

  let currentIndex = 0

  for (const segment of schemaConfig.segments) {
    const key = segment.key || segment.name.toLowerCase().replace(/[^a-z]/g, '')
    const rawSegment = cleanRoll.slice(currentIndex, currentIndex + segment.length)
    if (rawSegment.length < segment.length) {
      result.valid = false
      result.segments[key] = rawSegment
      break
    }

    // Type validation
    if (segment.type === 'numeric' && !/^\d+$/.test(rawSegment)) {
      result.valid = false
    } else if (segment.type === 'alpha' && !/^[A-Z]+$/.test(rawSegment)) {
      result.valid = false
    }

    // Map if human-readable label exists
    const mappedValue = segment.mappings?.[rawSegment] || rawSegment
    result.segments[key] = mappedValue

    if (key.includes('program') || key.includes('degree')) {
      result.program = mappedValue
    } else if (key.includes('year')) {
      result.year = mappedValue.length === 2 ? `20${mappedValue}` : mappedValue
    } else if (key.includes('dept') || key.includes('department')) {
      result.department = mappedValue
    } else if (key.includes('serial')) {
      result.serial = mappedValue
    }

    currentIndex += segment.length
  }

  // Any remaining unparsed characters
  if (currentIndex < cleanRoll.length) {
    const remainder = cleanRoll.slice(currentIndex)
    result.segments['remaining'] = remainder
    if (!result.serial) {
      result.serial = remainder
    }
  }

  return result
}
