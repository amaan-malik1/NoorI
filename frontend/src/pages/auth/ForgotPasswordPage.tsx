import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Shield, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ email: string }>()

  const onSubmit = async (data: { email: string }) => {
    setError('')
    try {
      await api.post('/auth/forgot-password', data)
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3 mb-12">
        <Logo />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-7"
      >
        {success ? (
          <div className="text-center space-y-6">
            <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} className="text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="font-sora font-semibold text-2xl text-foreground">Check your email</h2>
              <p className="text-sm text-foreground-muted leading-relaxed">
                If that email is registered, you'll receive a password reset link shortly.
              </p>
            </div>
            <Link to="/login">
              <Button variant="secondary" className="w-full">Back to sign in</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <h2 className="font-sora font-semibold text-2xl text-foreground">Forgot password?</h2>
              <p className="text-sm text-foreground-muted">Enter your email and we'll send a reset link.</p>
            </div>

            {error && (
              <div className="p-3.5 rounded-md bg-danger/10 border border-danger/20 text-danger-text text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                leftIcon={<Mail size={15} />}
                {...register('email', { required: true })}
              />
              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                Send reset link
              </Button>
            </form>

            <Link
              to="/login"
              className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
