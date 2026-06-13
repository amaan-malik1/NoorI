import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export interface AccessTokenPayload {
  userId: string
  accountId: string
  email: string
}

export interface RefreshTokenPayload {
  userId: string
  sessionId: string
}

// ─── Sign ────────────────────────────────────────────────

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

// ─── Verify ──────────────────────────────────────────────

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload
}

// ─── Decode without verify (for debugging only) ──────────

export function decodeToken(token: string) {
  return jwt.decode(token)
}
