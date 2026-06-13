import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env.js'

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    err.issues.forEach(issue => {
      const key = issue.path.join('.') || 'root'
      if (!errors[key]) errors[key] = []
      errors[key].push(issue.message)
    })
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors,
    })
  }

  // Known operational errors
  if (err instanceof Error) {
    console.error(`[${req.method} ${req.path}]`, err.message)
    return res.status(500).json({
      success: false,
      message:
        env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
    })
  }

  // Unknown
  console.error('Unknown error:', err)
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
  })
}
