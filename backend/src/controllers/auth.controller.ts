import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../config/database.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { generateSecureToken, daysFromNow, minutesFromNow } from '../utils/tokens.js'
import { sendError, sendSuccess } from '../utils/response.js'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../services/email.service.js'
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, schema } from '../types/validationSchema.js'



//COOKIE setup
const REFRESH_COOKIE = 'Noori_refresh'

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 day in ms
    path: '/',
  })
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/' })
}


export async function register(req: Request, res: Response) {
  const body = registerSchema.parse(req.body)

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    select: { id: true },
  })

  if (existing) {

    return sendSuccess(res, null, {
      message: 'User already exist! Use a differnt email',
      status: 201,
    })
  }

  const passwordHash = await bcrypt.hash(body.password, 12)
  const emailVerifyToken = generateSecureToken()
  const emailVerifyExpiry = minutesFromNow(24 * 60) // 24 hours

  // Create user + account + subscription in one transaction
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        emailVerifyToken,
        emailVerifyExpiry,
      },
    })

    const account = await tx.account.create({
      data: { userId: newUser.id },
    })

    await tx.subscription.create({
      data: { accountId: account.id, plan: 'free' },
    })

    return newUser
  })

  await sendVerificationEmail(user.email, emailVerifyToken)

  return sendSuccess(res, null, {
    message: 'Account created. Please check your email to verify your account.',
    status: 201,
  })
}

export async function verifyEmail(req: Request, res: Response) {
  const token = req.query.token as string

  if (!token) {
    return sendError(res, 'Verification token is required', { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { emailVerifyToken: token },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      emailVerifyExpiry: true,
    },
  })

  if (!user) {
    return sendError(res, 'Invalid or expired verification token', { status: 400 })
  }

  if (user.emailVerified) {
    return sendSuccess(res, null, { message: 'Email already verified' })
  }

  if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
    return sendError(res, 'Verification token has expired. Please request a new one.', {
      status: 400,
    })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpiry: null,
    },
  })

  await sendWelcomeEmail(user.email)

  return sendSuccess(res, null, { message: 'Email verified successfully' })
}

export async function login(req: Request, res: Response) {
  const body = loginSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase() },
    include: { account: true },
  })

  const isValid = user
    ? await bcrypt.compare(body.password, user.passwordHash)
    : false

  if (!user || !isValid) {
    return sendError(res, 'Invalid email or password', { status: 401 })
  }

  if (!user.emailVerified) {
    return sendError(res, 'Please verify your email before logging in', {
      status: 403,
    })
  }

  if (!user.account) {
    return sendError(res, 'Account not found', { status: 500 })
  }

  // Create session
  const refreshTokenValue = generateSecureToken()
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: refreshTokenValue,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        null,
      expiresAt: daysFromNow(30),
    },
  })

  const accessToken = signAccessToken({
    userId: user.id,
    accountId: user.account.id,
    email: user.email,
  })

  const refreshToken = signRefreshToken({
    userId: user.id,
    sessionId: session.id,
  })

  // Store the JWT refresh token in cookie (not the raw DB token)
  setRefreshCookie(res, refreshToken)

  return sendSuccess(res, {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      accountId: user.account.id,
    },
  })
}

export async function logout(req: Request, res: Response) {
  const cookieToken = req.cookies?.[REFRESH_COOKIE]

  if (cookieToken) {
    try {
      const payload = verifyRefreshToken(cookieToken)
      // Delete the session from DB
      await prisma.session.deleteMany({
        where: { id: payload.sessionId },
      })
    } catch {
      // Token already invalid — still clear cookie
    }
  }

  clearRefreshCookie(res)
  return sendSuccess(res, null, { message: 'Logged out successfully' })
}

export async function refresh(req: Request, res: Response) {
  const cookieToken = req.cookies?.[REFRESH_COOKIE]

  if (!cookieToken) {
    return sendError(res, 'No refresh token', { status: 401 })
  }

  let payload
  try {
    payload = verifyRefreshToken(cookieToken)
  } catch {
    clearRefreshCookie(res)
    return sendError(res, 'Invalid refresh token', { status: 401 })
  }

  // Find session in DB
  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: { include: { account: true } } },
  })

  if (!session || session.expiresAt < new Date()) {
    clearRefreshCookie(res)
    return sendError(res, 'Session expired. Please login again.', { status: 401 })
  }

  const user = session.user

  if (!user.account) {
    return sendError(res, 'Account not found', { status: 500 })
  }

  // Rotate refresh token (generate new one)
  const newRefreshTokenValue = generateSecureToken()
  const newSession = await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: newRefreshTokenValue,
      expiresAt: daysFromNow(30),
    },
  })

  const newAccessToken = signAccessToken({
    userId: user.id,
    accountId: user.account.id,
    email: user.email,
  })

  const newRefreshToken = signRefreshToken({
    userId: user.id,
    sessionId: newSession.id,
  })

  setRefreshCookie(res, newRefreshToken)

  return sendSuccess(res, { accessToken: newAccessToken })
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      account: {
        select: {
          id: true,
          isLocked: true,
          lockoutEnabled: true,
          cfConnected: true,
          subscription: {
            select: { plan: true },
          },
        },
      },
    },
  })

  if (!user) {
    return sendError(res, 'User not found', { status: 404 })
  }

  return sendSuccess(res, user)
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = forgotPasswordSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true },
  })

  // Always return success — prevents email enumeration
  if (user) {
    const token = generateSecureToken()
    const expiry = minutesFromNow(60) // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      },
    })

    await sendPasswordResetEmail(user.email, token)
  }

  return sendSuccess(res, null, {
    message: 'If that email is registered, you will receive a password reset link.',
  })
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = resetPasswordSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { passwordResetToken: token },
    select: {
      id: true,
      passwordResetExpiry: true,
    },
  })

  if (!user) {
    return sendError(res, 'Invalid or expired reset token', { status: 400 })
  }

  if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
    return sendError(res, 'Reset token has expired. Please request a new one.', {
      status: 400,
    })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    })

    // Invalidate all sessions on password reset
    await tx.session.deleteMany({ where: { userId: user.id } })
  })

  return sendSuccess(res, null, {
    message: 'Password reset successfully. Please login with your new password.',
  })
}

export async function updateProfile(req: Request, res: Response) {
  const body = schema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, passwordHash: true },
  })

  if (!user) return sendError(res, 'User not found', { status: 404 })

  const updates: Record<string, unknown> = {}

  if (body.newPassword) {
    if (!body.currentPassword) {
      return sendError(res, 'Current password is required to set a new password', {
        status: 400,
      })
    }
    const valid = await bcrypt.compare(body.currentPassword, user.passwordHash)
    if (!valid) {
      return sendError(res, 'Current password is incorrect', { status: 400 })
    }
    updates.passwordHash = await bcrypt.hash(body.newPassword, 12)
  }

  if (body.email && body.email.toLowerCase() !== user.email) {
    const taken = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      select: { id: true },
    })
    if (taken) return sendError(res, 'Email already in use', { status: 409 })

    const token = generateSecureToken()
    updates.email = body.email.toLowerCase()
    updates.emailVerified = false
    updates.emailVerifyToken = token
    updates.emailVerifyExpiry = minutesFromNow(24 * 60)

    await sendVerificationEmail(body.email.toLowerCase(), token)
  }

  if (Object.keys(updates).length === 0) {
    return sendError(res, 'No changes provided', { status: 400 })
  }

  await prisma.user.update({ where: { id: user.id }, data: updates })

  return sendSuccess(res, null, { message: 'Profile updated successfully' })
}
