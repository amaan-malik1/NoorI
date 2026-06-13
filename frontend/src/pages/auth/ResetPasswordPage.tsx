import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Shield, Lock, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const schema = z.object({
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    const token = params.get('token')
    if (!token) return setError('Invalid reset link')
    setError('')
    try {
      await api.post('/auth/reset-password', { token, password: data.password })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
          <Shield size={16} className="text-background" />
        </div>
        <span className="font-sora font-semibold text-foreground">Noori</span>
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
              <h2 className="font-sora font-semibold text-2xl text-foreground">Password reset!</h2>
              <p className="text-sm text-foreground-muted">Redirecting you to sign in...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <h2 className="font-sora font-semibold text-2xl text-foreground">Set new password</h2>
              <p className="text-sm text-foreground-muted">
                Choose a strong password for your account.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-md bg-danger/10 border border-danger/20 text-danger-text text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="New password"
                type="password"
                placeholder="Min. 8 characters"
                leftIcon={<Lock size={15} />}
                error={errors.password?.message}
                hint="Must include uppercase letter and number"
                {...register('password')}
              />
              <Input
                label="Confirm new password"
                type="password"
                placeholder="Repeat password"
                leftIcon={<Lock size={15} />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
                Reset password
              </Button>
            </form>

            <Link
              to="/login"
              className="block text-center text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Back to sign in
            </Link>
          </>
        )}
      </motion.div>
    </div>
  )
}
