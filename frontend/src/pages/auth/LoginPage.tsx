import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { getErrorMessage } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'

// ── Schema ────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

// ── Animation variants ────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      const res = await api.post('/auth/login', data)
      const { accessToken, user } = res.data.data

      // Fetch full user profile
      const meRes = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      login(accessToken, meRes.data.data)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Left panel — branding ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Grid bg */}
        <div className="absolute inset-0 bg-grid opacity-60" />

        {/* Radial glow */}
        <div className="absolute inset-0 bg-gradient-radial from-amber-500/8 via-transparent to-transparent" />

        {/* Amber orb */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Logo />
          </div>

          {/* Center content */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="font-sora font-semibold text-4xl text-foreground leading-tight">
                Smart protection,<br />
                <span className="text-gradient-amber">without the complexity.</span>
              </h1>
              <p className="text-foreground-muted text-base leading-relaxed max-w-sm">
                Set up Cloudflare-powered content filtering in minutes — no technical knowledge required.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-8">
              {[
                // { value: '50+', label: 'API endpoints' },
                { value: '5 min', label: 'setup time' },
                { value: '100%', label: 'Cloudflare powered' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-sora font-semibold text-2xl text-amber-500">{stat.value}</div>
                  <div className="text-xs text-foreground-subtle mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom testimonial */}
          <div className="card p-5 max-w-sm">
            <p className="text-sm text-foreground-muted leading-relaxed">
              "Finally a parental control app that doesn't require a computer science degree."
            </p>
            <div className="flex items-center gap-2.5 mt-3">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-medium text-amber-500">
                A
              </div>
              <div>
                <div className="text-xs font-medium text-foreground">Arjun Mehta</div>
                <div className="text-xs text-foreground-subtle">Parent, Mumbai</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-full max-w-sm space-y-8"
        >
          {/* Mobile logo */}
          <motion.div variants={item} className="flex items-center gap-3 lg:hidden">
            <Logo />
          </motion.div>

          {/* Header */}
          <motion.div variants={item} className="space-y-1.5">
            <h2 className="font-sora font-semibold text-2xl text-foreground">
              Welcome back
            </h2>
            <p className="text-sm text-foreground-muted">
              Sign in to your account to continue
            </p>
          </motion.div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-md bg-danger/10 border border-danger/20 text-danger-text text-sm"
            >
              {error}
            </motion.div>
          )}

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

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock size={15} />}
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-foreground-muted hover:text-amber-500 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              rightIcon={<ArrowRight size={16} />}
              className="w-full"
            >
              Sign in
            </Button>
          </motion.form>

          {/* Footer */}
          <motion.p variants={item} className="text-center text-sm text-foreground-muted">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-amber-500 hover:text-amber-400 font-medium transition-colors"
            >
              Create one free
            </Link>
          </motion.p>
        </motion.div>
      </div>
    </div>
  )
}
