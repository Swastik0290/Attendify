import crypto from 'crypto'
import { QRPayload } from './types'

// QR rotation window (seconds)
export const QR_ROTATION_INTERVAL_SECONDS = 8

// Total attendance attempt validity window (seconds) from issuedAt
export const ATTENDANCE_ATTEMPT_LIFETIME_SECONDS = 60

/**
 * Gets the server-side HMAC signing secret.
 */
function getSigningSecret(): string {
  return (
    process.env.QR_SIGNING_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'attendance-iq-fallback-cryptographic-secret-2026'
  )
}

/**
 * Generates a signed QR payload for an active attendance session.
 */
export function generateQRPayload(
  sessionId: string,
  subjectId: string,
  subjectCode: string,
  facultyId: string
): QRPayload {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + QR_ROTATION_INTERVAL_SECONDS
  const nonce = crypto.randomBytes(16).toString('hex')

  const dataToSign = `${sessionId}|${subjectId}|${subjectCode}|${facultyId}|${nonce}|${issuedAt}|${expiresAt}`
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(dataToSign)
    .digest('hex')

  return {
    sessionId,
    subjectId,
    subjectCode,
    facultyId,
    nonce,
    issuedAt,
    expiresAt,
    signature,
  }
}

/**
 * Encodes the QRPayload into a compact Base64URL string for QR rendering.
 */
export function encodeQRPayload(payload: QRPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

/**
 * Decodes and parses a scanned QR string.
 */
export function decodeQRPayload(qrString: string): QRPayload | null {
  try {
    let jsonStr = qrString
    // If base64url encoded
    if (!qrString.startsWith('{')) {
      jsonStr = Buffer.from(qrString, 'base64url').toString('utf-8')
    }
    const parsed = JSON.parse(jsonStr) as QRPayload
    if (
      !parsed.sessionId ||
      !parsed.subjectId ||
      !parsed.facultyId ||
      !parsed.nonce ||
      !parsed.issuedAt ||
      !parsed.signature
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export type QRVerificationResult =
  | { valid: true; payload: QRPayload }
  | { valid: false; reason: 'INVALID_SIGNATURE' | 'EXPIRED' | 'MALFORMED' }

/**
 * Cryptographically verifies the QR payload.
 */
export function verifyQRPayload(payload: QRPayload): QRVerificationResult {
  const now = Math.floor(Date.now() / 1000)

  // 1. Check maximum attempt lifetime window
  if (now > payload.issuedAt + ATTENDANCE_ATTEMPT_LIFETIME_SECONDS) {
    return { valid: false, reason: 'EXPIRED' }
  }

  // 2. Re-compute HMAC and compare in constant time
  const dataToSign = `${payload.sessionId}|${payload.subjectId}|${payload.subjectCode}|${payload.facultyId}|${payload.nonce}|${payload.issuedAt}|${payload.expiresAt}`
  const expectedSignature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(dataToSign)
    .digest('hex')

  const sigBuffer = Buffer.from(payload.signature, 'hex')
  const expectedBuffer = Buffer.from(expectedSignature, 'hex')

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: 'INVALID_SIGNATURE' }
  }

  return { valid: true, payload }
}
