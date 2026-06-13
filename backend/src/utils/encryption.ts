import crypto from 'crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12  // 96-bit IV — recommended for GCM
const TAG_LENGTH = 16 // 128-bit auth tag

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:ciphertext (all hex encoded)
 */
export function encrypt(plaintext: string): string {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'utf-8')
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * Decrypts a value produced by encrypt().
 * Throws if the ciphertext has been tampered with.
 */
export function decrypt(ciphertext: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':')

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid ciphertext format')
  }

  const key = Buffer.from(env.ENCRYPTION_KEY, 'utf-8')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf-8')
}
