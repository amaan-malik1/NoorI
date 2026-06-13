import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud, Key, CheckCircle2, ArrowRight,
  ArrowLeft, ExternalLink, AlertCircle, Shield
} from 'lucide-react'
import { useVerifyCFCredentials, useConnectCF, useCFStatus } from '@/hooks/useCloudflare'
import { getErrorMessage } from '@/lib/utils'
import StepIndicator from '@/components/ui/StepIndicator'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// ── Types ─────────────────────────────────────────────────
interface CFAccount { id: string; name: string }

const STEPS = [
  { label: 'API Key' },
  { label: 'Account' },
  { label: 'Connect' },
]

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

export default function CloudflareWizardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [email, setEmail] = useState('')
  const [globalKey, setGlobalKey] = useState('')
  const [accounts, setAccounts] = useState<CFAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<CFAccount | null>(null)
  const [error, setError] = useState('')
  const { data: cfStatus, isLoading: statusLoading } = useCFStatus()


  const verify = useVerifyCFCredentials()
  const connect = useConnectCF()

  function goTo(next: number) {
    setDir(next > step ? 1 : -1)
    setStep(next)
    setError('')
  }

  // ── Step 1: verify credentials ────────────────────────
  async function handleVerify() {
    if (!email || !globalKey) return setError('Both fields are required')
    setError('')
    try {
      const data = await verify.mutateAsync({ email, globalKey })
      setAccounts(data.accounts ?? [])
      goTo(1)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  // ── Step 3: connect ───────────────────────────────────
  async function handleConnect() {
    if (!selectedAccount) return
    setError('')
    try {
      await connect.mutateAsync({ email, globalKey, cfAccountId: selectedAccount.id })
      goTo(2)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  useEffect(() => {
    if (!statusLoading && cfStatus?.cfConnected) {
      navigate('/dashboard/settings?tab=cloudflare', { replace: true })
    }
  }, [statusLoading, cfStatus, navigate])

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    )
  }


  return (
    <div className="max-w-xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft size={14} /> Back to Settings
        </button>
        <h1 className="font-sora font-semibold text-2xl text-foreground">
          Connect Cloudflare
        </h1>
        <p className="text-sm text-foreground-muted">
          Link your Cloudflare account to enable DNS-level content filtering
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={step} />

      {/* Step panels */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          {step === 0 && (
            <motion.div
              key="step0"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="card p-6 space-y-6"
            >
              {/* What is this */}
              <div className="flex gap-3 p-4 bg-info/5 border border-info/15 rounded-md">
                <AlertCircle size={16} className="text-info flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground-muted space-y-1">
                  <p className="font-medium text-foreground">Why do we need this?</p>
                  <p>Your Cloudflare API key lets Noori create filtering rules in your Cloudflare account. We use it <strong className="text-foreground">once</strong> to generate a limited-permission token, then discard it immediately.</p>
                </div>
              </div>

              {/* Guide link */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">
                  Step 1 of 3 — Get your Global API Key
                </p>
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Open Cloudflare API Tokens page
                  <ExternalLink size={13} />
                </a>
                <p className="text-xs text-foreground-subtle">
                  Go to My Profile → API Tokens → View (under Global API Key)
                </p>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <Input
                  label="Cloudflare account email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  leftIcon={<Cloud size={15} />}
                />
                <Input
                  label="Global API Key"
                  type="password"
                  placeholder="Your Cloudflare Global API Key"
                  value={globalKey}
                  onChange={e => setGlobalKey(e.target.value)}
                  leftIcon={<Key size={15} />}
                  hint="Used once to create a secure scoped token, then immediately discarded"
                />
              </div>

              {error && (
                <p className="text-sm text-danger-text bg-danger/10 border border-danger/20 rounded-md px-3 py-2.5">
                  {error}
                </p>
              )}

              <Button
                onClick={handleVerify}
                loading={verify.isPending}
                rightIcon={<ArrowRight size={15} />}
                className="w-full"
                size="lg"
              >
                Verify & continue
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="card p-6 space-y-5"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Step 2 of 3 — Choose your Cloudflare account
                </p>
                <p className="text-xs text-foreground-muted">
                  Select the account where you want filtering to be set up
                </p>
              </div>

              <div className="space-y-2">
                {accounts.map(account => (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccount(account)}
                    className={`w-full flex items-center gap-3 p-4 rounded-md border text-left transition-all ${selectedAccount?.id === account.id
                      ? 'border-amber-500/40 bg-amber-500/8 text-foreground'
                      : 'border-border hover:border-border-subtle bg-background-elevated text-foreground-muted hover:text-foreground'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-semibold flex-shrink-0 ${selectedAccount?.id === account.id ? 'bg-amber-500/20 text-amber-500' : 'bg-background-overlay text-foreground-subtle'
                      }`}>
                      {account.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{account.name}</div>
                      <div className="text-xs text-foreground-subtle font-mono mt-0.5">{account.id}</div>
                    </div>
                    {selectedAccount?.id === account.id && (
                      <CheckCircle2 size={16} className="text-amber-500 ml-auto" />
                    )}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-danger-text bg-danger/10 border border-danger/20 rounded-md px-3 py-2.5">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => goTo(0)} leftIcon={<ArrowLeft size={14} />}>
                  Back
                </Button>
                <Button
                  onClick={handleConnect}
                  loading={connect.isPending}
                  disabled={!selectedAccount}
                  rightIcon={<ArrowRight size={15} />}
                  className="flex-1"
                  size="lg"
                >
                  Connect account
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="card p-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 bg-success/10 rounded-2xl flex items-center justify-center mx-auto"
              >
                <Shield size={36} className="text-success" />
              </motion.div>

              <div className="space-y-2">
                <h2 className="font-sora font-semibold text-xl text-foreground">
                  Cloudflare connected!
                </h2>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  Your account <strong className="text-foreground">{selectedAccount?.name}</strong> is now linked.
                  Noori will use Cloudflare to filter DNS queries on your devices.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => navigate('/dashboard/content-policy')}
                  rightIcon={<ArrowRight size={15} />}
                  className="w-full"
                  size="lg"
                >
                  Set up content filtering
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Go to dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
