import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// ── Schema ────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[0-9]/, 'Include a number'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

// ── Password strength ─────────────────────────────────────
function getStrength(password: string) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong']
const strengthColors = ['', 'bg-danger', 'bg-warning', 'bg-amber-400', 'bg-success', 'bg-success']

// ── Benefits ──────────────────────────────────────────────
const benefits = [
  'Block adult content in 2 minutes',
  'Works on all devices — iOS, Android, Mac, Windows',
  'No technical knowledge required',
  'Powered by Cloudflare Zero Trust',
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const strength = getStrength(password)

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await api.post('/auth/register', {
        email: data.email,
        password: data.password,
      })
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // ── Success state ─────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center space-y-6"
        >
          <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="font-sora font-semibold text-2xl text-foreground">
              Check your email
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              We've sent a verification link to your email. Click it to activate your account.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Back to sign in
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left branding panel ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute inset-0 bg-gradient-radial from-amber-500/8 via-transparent to-transparent" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-background" />
            </div>
            <span className="font-sora font-semibold text-lg text-foreground">Noori</span>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <h1 className="font-sora font-semibold text-4xl text-foreground leading-tight">
                Start protecting<br />
                <span className="text-gradient-amber">what matters.</span>
              </h1>
              <p className="text-foreground-muted text-base leading-relaxed max-w-sm">
                Join thousands of families and individuals who use Noori to stay focused and protected online.
              </p>
            </div>

            {/* Benefits */}
            <ul className="space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={11} className="text-amber-500" />
                  </div>
                  <span className="text-sm text-foreground-muted">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Free plan callout */}
          <div className="card p-5 border-amber-500/20">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Shield size={14} className="text-amber-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Free to start</div>
                <div className="text-xs text-foreground-muted mt-0.5 leading-relaxed">
                  No credit card required. Upgrade to Pro for advanced features like iOS config generator and 90-day activity history.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm space-y-7"
        >
          {/* Mobile logo */}
          <motion.div variants={item} className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-background" />
            </div>
            <span className="font-sora font-semibold text-foreground">Noori</span>
          </motion.div>

          <motion.div variants={item} className="space-y-1.5">
            <h2 className="font-sora font-semibold text-2xl text-foreground">
              Create your account
            </h2>
            <p className="text-sm text-foreground-muted">
              Free forever. No credit card needed.
            </p>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3.5 rounded-md bg-danger/10 border border-danger/20 text-danger-text text-sm"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <motion.form
            variants={item}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              leftIcon={<Mail size={15} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="space-y-1.5">
              <Input
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                leftIcon={<Lock size={15} />}
                error={errors.password?.message}
                {...register('password', {
                  onChange: (e) => setPassword(e.target.value),
                })}
              />

              {/* Strength meter */}
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1.5"
                >
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= strength ? strengthColors[strength] : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-foreground-subtle">
                    {strengthLabels[strength]}
                  </p>
                </motion.div>
              )}
            </div>

            <Input
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
              leftIcon={<Lock size={15} />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              rightIcon={<ArrowRight size={16} />}
              className="w-full mt-2"
            >
              Create account
            </Button>
          </motion.form>

          {/* Terms */}
          <motion.p variants={item} className="text-xs text-foreground-subtle text-center leading-relaxed">
            By creating an account you agree to our{' '}
            <a href="#" className="text-foreground-muted hover:text-foreground transition-colors underline underline-offset-2">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-foreground-muted hover:text-foreground transition-colors underline underline-offset-2">
              Privacy Policy
            </a>
          </motion.p>

          <motion.p variants={item} className="text-center text-sm text-foreground-muted">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-amber-500 hover:text-amber-400 font-medium transition-colors"
            >
              Sign in
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
