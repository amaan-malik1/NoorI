import { Response } from 'express'

interface SuccessResponse<T> {
  success: true
  data: T
  message?: string
}

interface ErrorResponse {
  success: false
  message: string
  errors?: Record<string, string[]>
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: { message?: string; status?: number }
) {
  const payload: SuccessResponse<T> = {
    success: true,
    data,
    ...(options?.message && { message: options.message }),
  }
  return res.status(options?.status ?? 200).json(payload)
}

export function sendError(
  res: Response,
  message: string,
  options?: { status?: number; errors?: Record<string, string[]> }
) {
  const payload: ErrorResponse = {
    success: false,
    message,
    ...(options?.errors && { errors: options.errors }),
  }
  return res.status(options?.status ?? 400).json(payload)
}
