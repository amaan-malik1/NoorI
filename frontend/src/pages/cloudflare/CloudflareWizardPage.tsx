import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cloud, Key, CheckCircle2, ArrowRight,
  ArrowLeft, ExternalLink, AlertCircle, Shield,
  MousePointerClick, RefreshCw
} from 'lucide-react'
import { useVerifyCFCredentials, useConnectCF } from '@/hooks/useCloudflare'
import { getErrorMessage } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────

interface CFAccount { id: string; name: string }

// Steps: 0=API Key, 1=Account, 2=ZeroTrustActivation, 3=Connect(success)
const STEPS = [
  { label: 'API Key' },
  { label: 'Account' },
  { label: 'Activate' },
  { label: 'Connect' },
]

const slide = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
}

// ── Step indicator (inline — no external dependency) ──────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all ${i < current
            ? 'bg-success text-background'
            : i === current
              ? 'bg-amber-500 text-background'
              : 'bg-background-elevated border border-border text-foreground-subtle'
            }`}>
            {i < current ? <CheckCircle2 size={13} /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-8 sm:w-12 transition-all ${i < current ? 'bg-success' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main wizard ───────────────────────────────────────────

export default function CloudflareWizardPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [email, setEmail] = useState('')
  const [globalKey, setGlobalKey] = useState('')
  const [accounts, setAccounts] = useState<CFAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<CFAccount | null>(null)
  const [error, setError] = useState('')
  const [ztConfirmed, setZtConfirmed] = useState(false)

  const verify = useVerifyCFCredentials()
  const connect = useConnectCF()

  function goTo(next: number) {
    setDir(next > step ? 1 : -1)
    setStep(next)
    setError('')
  }

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

  async function handleConnect() {
    if (!selectedAccount) return
    setError('')
    try {
      await connect.mutateAsync({ email, globalKey, cfAccountId: selectedAccount.id })
      goTo(3)
    } catch (err) {
      const msg = getErrorMessage(err)
      // If they somehow skipped the ZT step and it still fails, send them back there
      if (msg.toLowerCase().includes('zero trust') || msg.toLowerCase().includes('initialized')) {
        setZtConfirmed(false)
        goTo(2)
        setError(msg)
      } else {
        setError(msg)
      }
    }
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
      <StepIndicator current={step} />

      {/* Step panels */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>

          {/* ── Step 0: API Key ── */}
          {step === 0 && (
            <motion.div
              key="step0"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-background-surface border border-border rounded-xl p-6 space-y-6"
            >
              <div className="flex gap-3 p-4 bg-info/5 border border-info/15 rounded-md">
                <AlertCircle size={16} className="text-info flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground-muted space-y-1">
                  <p className="font-medium text-foreground">Why do we need this?</p>
                  <p>Your Cloudflare API key lets NoorI create filtering rules in your account. We use it <strong className="text-foreground">once</strong> to generate a limited-permission token, then discard it immediately.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Step 1 of 4 — Get your Global API Key</p>
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors"
                >
                  Open Cloudflare API Tokens page <ExternalLink size={13} />
                </a>
                <p className="text-xs text-foreground-subtle">
                  Go to My Profile → API Tokens → View (under Global API Key)
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-muted">Cloudflare account email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-background-elevated border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-amber-500/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground-muted">Global API Key</label>
                  <input
                    type="password"
                    placeholder="Your Cloudflare Global API Key"
                    value={globalKey}
                    onChange={e => setGlobalKey(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerify()}
                    className="w-full bg-background-elevated border border-border rounded-md px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-amber-500/40"
                  />
                  <p className="text-xs text-foreground-subtle">Used once to create a secure scoped token, then immediately discarded</p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-danger-text bg-danger/10 border border-danger/20 rounded-md px-3 py-2.5">{error}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={verify.isPending || !email || !globalKey}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-background text-sm font-semibold transition-all disabled:opacity-50"
              >
                {verify.isPending
                  ? <><RefreshCw size={14} className="animate-spin" /> Verifying...</>
                  : <> Verify &amp; continue <ArrowRight size={15} /></>
                }
              </button>
            </motion.div>
          )}

          {/* ── Step 1: Choose account ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-background-surface border border-border rounded-xl p-6 space-y-5"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Step 2 of 4 — Choose your Cloudflare account</p>
                <p className="text-xs text-foreground-muted">Select the account where you want filtering to be set up</p>
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
                    {selectedAccount?.id === account.id && <CheckCircle2 size={16} className="text-amber-500 ml-auto" />}
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-sm text-danger-text bg-danger/10 border border-danger/20 rounded-md px-3 py-2.5">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => goTo(0)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={() => { if (selectedAccount) goTo(2) }}
                  disabled={!selectedAccount}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-background text-sm font-semibold transition-all disabled:opacity-40"
                >
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Zero Trust activation ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-background-surface border border-border rounded-xl p-6 space-y-6"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Step 3 of 4 — Activate Zero Trust</p>
                <p className="text-xs text-foreground-muted">
                  This is a one-time step required by Cloudflare before NoorI can set up filtering on your account.
                </p>
              </div>

              {/* Why card */}
              <div className="flex gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-md">
                <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-foreground-muted">
                  <p className="font-medium text-foreground mb-1">Why is this needed?</p>
                  <p>Cloudflare's Gateway (DNS filtering) API is only available after you've activated the Zero Trust dashboard at least once. It takes about 30 seconds and you only need to do it once per account.</p>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {[
                  {
                    n: '1',
                    title: 'Open the Zero Trust dashboard',
                    desc: 'Click the link below — it opens in a new tab',
                    action: (
                      <a
                        href="https://one.dash.cloudflare.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-medium mt-1"
                      >
                        one.dash.cloudflare.com <ExternalLink size={11} />
                      </a>
                    ),
                  },
                  {
                    n: '2',
                    title: 'Log in with your Cloudflare account',
                    desc: `Use the same account — ${email || 'the email you entered in Step 1'}`,
                  },
                  {
                    n: '3',
                    title: 'Complete the onboarding',
                    desc: 'Accept the terms, choose a team name, click through. Takes ~30 seconds.',
                  },
                  {
                    n: '4',
                    title: 'Come back here and click Continue',
                    desc: 'NoorI will finish setting up filtering on your account automatically.',
                  },
                ].map(s => (
                  <div key={s.n} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-background-elevated border border-border flex items-center justify-center text-xs font-semibold text-foreground-muted flex-shrink-0 mt-0.5">
                      {s.n}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{s.title}</div>
                      <div className="text-xs text-foreground-muted mt-0.5">{s.desc}</div>
                      {s.action}
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmation checkbox */}
              <label className="flex items-start gap-3 cursor-pointer p-3 bg-background-elevated border border-border rounded-md">
                <input
                  type="checkbox"
                  checked={ztConfirmed}
                  onChange={e => setZtConfirmed(e.target.checked)}
                  className="accent-amber-500 w-4 h-4 mt-0.5 flex-shrink-0"
                />
                <span className="text-sm text-foreground-muted">
                  I've opened <strong className="text-foreground">one.dash.cloudflare.com</strong> and completed the Zero Trust onboarding for this account.
                </span>
              </label>

              {error && (
                <p className="text-sm text-danger-text bg-danger/10 border border-danger/20 rounded-md px-3 py-2.5">{error}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => goTo(1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-border text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleConnect}
                  disabled={!ztConfirmed || connect.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-background text-sm font-semibold transition-all disabled:opacity-40"
                >
                  {connect.isPending
                    ? <><RefreshCw size={14} className="animate-spin" /> Connecting...</>
                    : <><MousePointerClick size={14} /> Finish connecting</>
                  }
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={dir}
              variants={slide}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-background-surface border border-border rounded-xl p-8 text-center space-y-6"
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
                <h2 className="font-sora font-semibold text-xl text-foreground">Cloudflare connected!</h2>
                <p className="text-sm text-foreground-muted leading-relaxed">
                  <strong className="text-foreground">{selectedAccount?.name}</strong> is now linked.
                  NoorI is managing DNS filtering on your account.
                </p>
              </div>

              <div className="text-left p-4 bg-background-elevated border border-border rounded-md space-y-2">
                <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wide">Next steps</p>
                {[
                  'Set up a content filtering policy below',
                  'Add your devices and install Cloudflare One',
                  'Visit cloudflare.com/cdn-cgi/trace on a device to confirm gateway=on',
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-foreground-muted">
                    <CheckCircle2 size={14} className="text-success flex-shrink-0 mt-0.5" />
                    {s}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/dashboard/content-policy')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-background text-sm font-semibold transition-all"
                >
                  Set up content filtering <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full py-2.5 rounded-lg text-sm text-foreground-muted hover:text-foreground transition-colors"
                >
                  Go to dashboard
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}