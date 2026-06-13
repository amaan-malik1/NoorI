import { v4 as uuidv4 } from 'uuid'

/**
 * Generates a UUID v4 in uppercase — required by Apple MDM spec
 */
export function generateMDMUUID(): string {
  return uuidv4().toUpperCase()
}
