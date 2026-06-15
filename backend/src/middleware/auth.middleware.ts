import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'
import { sendError } from '../utils/response.js'
import { prisma } from '../config/database.js'

//@ts-ignore
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'No token provided', { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyAccessToken(token)

    // Attach user to request
    req.user = {
      userId: payload.userId,
      accountId: payload.accountId,
      email: payload.email,
    }

    next()
  } catch {
    return sendError(res, 'Invalid or expired token', { status: 401 })
  }
}

//Checks Account.isLocked before allowing any mutation.
//@ts-ignore
export async function requireUnlocked(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return sendError(res, 'Unauthorized', { status: 401 })
  }

  const account = await prisma.account.findUnique({
    where: { id: req.user.accountId },
    select: { isLocked: true },
  })

  if (account?.isLocked) {
    return sendError(res, 'Profile is locked. Unlock to make changes.', {
      status: 423,
    })
  }

  next()
}
