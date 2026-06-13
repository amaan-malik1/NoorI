import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  ENCRYPTION_KEY: z.string().length(32, 'ENCRYPTION_KEY must be exactly 32 chars'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@Noori.app'),

  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PRO_PLAN_ID: z.string().optional(),

  // Pricing (INR for Razorpay, USD for Stripe)
  PRO_PRICE_USD: z.coerce.number().default(9),
  PRO_PRICE_INR: z.coerce.number().default(499),
})

function loadEnv() {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    console.error('❌  Invalid environment variables:')
    result.error.issues.forEach(issue => {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`)
    })
    process.exit(1)
  }

  return result.data
}

export const env = loadEnv()
