import { Request } from 'express'

export interface AuthUser {
  userId: string
  accountId: string
  email: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export {}
