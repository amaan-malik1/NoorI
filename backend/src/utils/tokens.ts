import crypto from 'crypto'

/**
 * Generates a cryptographically secure hex token.
 * Default: 32 bytes = 64 hex chars
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}

/**
 * Returns a Date object N minutes from now.
 */
export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}

/**
 * Returns a Date object N days from now.
 */
export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}
