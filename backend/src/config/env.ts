import { z } from 'zod'
import dotenv from 'dotenv';

dotenv.config();

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
  EMAIL_FROM: z.string().email().default('noreply@noori.app'),

  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),

  // Stripe — one price ID per plan + interval combo (USD only, set in Stripe dashboard)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_FAMILY_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_FAMILY_YEARLY_PRICE_ID: z.string().optional(),

  // Razorpay — one plan ID per plan + interval combo
  // Note: Razorpay plans are created in INR or USD depending on your
  // account region, but the displayed price to the user is always USD
  // (per product decision — single global price, no separate INR tier)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PRO_MONTHLY_PLAN_ID: z.string().optional(),
  RAZORPAY_PRO_YEARLY_PLAN_ID: z.string().optional(),
  RAZORPAY_FAMILY_MONTHLY_PLAN_ID: z.string().optional(),
  RAZORPAY_FAMILY_YEARLY_PLAN_ID: z.string().optional(),
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