import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Loader2, Shield } from 'lucide-react'
import { api } from '@/lib/api'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'

type State = 'loading' | 'success' | 'error'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState<State>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setState('error')
      setMessage('Invalid verification link')
      return
    }

    api.get(`/auth/verify-email?token=${token}`)
      .then(res => {
        setState('success')
        setMessage(res.data.message)
      })
      .catch(err => {
        setState('error')
        setMessage(err.response?.data?.message ?? 'Verification failed')
      })
  }, [params])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <Logo />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center space-y-6"
      >
        {state === 'loading' && (
          <>
            <Loader2 size={40} className="animate-spin text-amber-500 mx-auto" />
            <div className="space-y-2">
              <h2 className="font-sora font-semibold text-xl text-foreground">Verifying your email</h2>
              <p className="text-sm text-foreground-muted">Please wait a moment...</p>
            </div>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-success" />
            </div>
            <div className="space-y-2">
              <h2 className="font-sora font-semibold text-2xl text-foreground">Email verified!</h2>
              <p className="text-sm text-foreground-muted">{message || 'Your account is ready.'}</p>
            </div>
            <Link to="/login">
              <Button variant="primary" className="w-full">Continue to sign in</Button>
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mx-auto">
              <XCircle size={32} className="text-danger" />
            </div>
            <div className="space-y-2">
              <h2 className="font-sora font-semibold text-2xl text-foreground">Verification failed</h2>
              <p className="text-sm text-foreground-muted">{message}</p>
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/login">
                <Button variant="primary" className="w-full">Go to sign in</Button>
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
