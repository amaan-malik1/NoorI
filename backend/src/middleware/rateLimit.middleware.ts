import { Request, Response, NextFunction } from 'express'
import { redis } from '../config/redis.js'
import { sendError } from '../utils/response.js'

interface RateLimitOptions {
  /** Window in seconds */
  windowSec: number
  /** Max requests in the window */
  max: number
  /** Key prefix so different routes have separate buckets */
  keyPrefix?: string
}

/**
 * Redis sliding-window rate limiter.
 * Keyed by IP address.
 */
export function rateLimit(opts: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown'

    const key = `rl:${opts.keyPrefix ?? 'global'}:${ip}`

    try {
      const current = await redis.incr(key)

      if (current === 1) {
        // First request in window — set expiry
        await redis.expire(key, opts.windowSec)
      }

      if (current > opts.max) {
        const ttl = await redis.ttl(key)
        res.setHeader('Retry-After', String(ttl))
        return sendError(res, 'Too many requests. Please try again later.', {
          status: 429,
        })
      }

      next()
    } catch {
      // If Redis is down, fail open (don't block users)
      next()
    }
  }
}

// ─── Pre-built limiters ───────────────────────────────────

/** 20 attempts per 15 minutes on auth endpoints */
export const authRateLimit = rateLimit({
  windowSec: 15 * 60,
  max: 20,
  keyPrefix: 'auth',
})

/** 5 password reset requests per hour */
export const passwordResetRateLimit = rateLimit({
  windowSec: 60 * 60,
  max: 5,
  keyPrefix: 'pwd-reset',
})
