import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, User, Heart, ArrowRight,
  ArrowLeft, CheckCircle2, Zap, Lock,
  Smartphone, Globe, Eye
} from 'lucide-react'
import { useRunOnboarding, type OnboardingGoal, type ProtectionLevel } from '@/hooks/useOnboarding'
import { getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import StepIndicator from '@/components/ui/StepIndicator'

// ── Animation config ──────────────────────────────────────

const slide = {
  enter: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? 40 : -40,
  }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({
    opacity: 0,
    x: dir > 0 ? -40 : 40,
  }),
}

const transition = { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as number[] }

// ── Steps ─────────────────────────────────────────────────

const STEPS = [
  { label: 'Your goal' },
  { label: 'Protection' },
  { label: 'Done' },
]

// ── Goal options ──────────────────────────────────────────

const GOALS: {
  id: OnboardingGoal
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bg: string
  selectedBg: string
}[] = [
    {
      id: 'self',
      label: 'Self-control',
      description: "I want to filter my own devices — reduce distractions and block content I don't want to see.",
      icon: <User size={24} />,
      color: 'text-info',
      bg: 'bg-info/6 border-info/20',
      selectedBg: 'bg-info/15 border-info/50',
    },
    {
      id: 'parental',
      label: 'Parental controls',
      description: "I want to protect my children's devices from inappropriate content.",
      icon: <Users size={24} />,
      color: 'text-amber-500',
      bg: 'bg-amber-500/6 border-amber-500/20',
      selectedBg: 'bg-amber-500/15 border-amber-500/50',
    },
    {
      id: 'both',
      label: 'Both',
      description: 'I want to protect both my own devices and my family.',
      icon: <Heart size={24} />,
      color: 'text-success',
      bg: 'bg-success/6 border-success/20',
      selectedBg: 'bg-success/15 border-success/50',
    },
  ]

// ── Protection levels ─────────────────────────────────────

const LEVELS: {
  id: ProtectionLevel
  label: string
  tagline: string
  description: string
  blocks: string[]
  icon: React.ReactNode
  color: string
  bg: string
  selectedBg: string
}[] = [
    {
      id: 'basic',
      label: 'Basic',
      tagline: 'Essential protection',
      description: 'The most important blocks with minimal impact on daily browsing.',
      blocks: ['Adult content', 'VPNs & bypass tools', 'Malware & phishing'],
      icon: <Shield size={20} />,
      color: 'text-info',
      bg: 'bg-info/6 border-info/20',
      selectedBg: 'bg-info/15 border-info/50',
    },
    {
      id: 'balanced',
      label: 'Balanced',
      tagline: 'Recommended',
      description: 'Blocks distracting and harmful content while keeping productivity tools available.',
      blocks: ['Everything in Basic', 'Social media', 'Gambling sites'],
      icon: <Globe size={20} />,
      color: 'text-amber-500',
      bg: 'bg-amber-500/6 border-amber-500/20',
      selectedBg: 'bg-amber-500/15 border-amber-500/50',
    },
    {
      id: 'maximum',
      label: 'Maximum',
      tagline: 'Strictest mode',
      description: 'Blocks everything non-essential. Best for children or strict self-accountability.',
      blocks: ['Everything in Balanced', 'Video streaming', 'Gaming & entertainment'],
      icon: <Lock size={20} />,
      color: 'text-danger-text',
      bg: 'bg-danger/6 border-danger/20',
      selectedBg: 'bg-danger/15 border-danger/50',
    },
  ]

// ── Step 1 — Goal ─────────────────────────────────────────

function GoalStep({
  selected,
  onSelect,
}: {
  selected: OnboardingGoal | null
  onSelect: (g: OnboardingGoal) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-sora font-semibold text-2xl text-foreground">
          What's your main goal?
        </h2>
        <p className="text-sm text-foreground-muted max-w-sm mx-auto">
          This helps us set up the right protection level for your situation.
        </p>
      </div>

      <div className="space-y-3">
        {GOALS.map(goal => (
          <button
            key={goal.id}
            onClick={() => onSelect(goal.id)}
            className={`w-full flex items-start gap-4 p-5 rounded-xl border text-left transition-all duration-200 ${selected === goal.id ? goal.selectedBg : goal.bg + ' hover:opacity-90'
              }`}
          >
            <div className={`flex-shrink-0 mt-0.5 ${goal.color}`}>
              {goal.icon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{goal.label}</span>
                {selected === goal.id && (
                  <CheckCircle2 size={14} className={goal.color} />
                )}
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">
                {goal.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 2 — Protection level ─────────────────────────────

function ProtectionStep({
  selected,
  onSelect,
}: {
  selected: ProtectionLevel | null
  onSelect: (l: ProtectionLevel) => void
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="font-sora font-semibold text-2xl text-foreground">
          How strict do you want to be?
        </h2>
        <p className="text-sm text-foreground-muted max-w-sm mx-auto">
          You can always change this later from Content Policy.
        </p>
      </div>

      <div className="space-y-3">
        {LEVELS.map(level => (
          <button
            key={level.id}
            onClick={() => onSelect(level.id)}
            className={`w-full flex items-start gap-4 p-5 rounded-xl border text-left transition-all duration-200 ${selected === level.id ? level.selectedBg : level.bg + ' hover:opacity-90'
              }`}
          >
            <div className={`flex-shrink-0 mt-0.5 ${level.color}`}>
              {level.icon}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-foreground">{level.label}</span>
                <span className={`text-xs font-medium ${level.color}`}>{level.tagline}</span>
                {selected === level.id && (
                  <CheckCircle2 size={14} className={`${level.color} ml-auto`} />
                )}
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">
                {level.description}
              </p>
              <ul className="space-y-1">
                {level.blocks.map(block => (
                  <li key={block} className="flex items-center gap-2 text-xs text-foreground-muted">
                    <span className={`w-1 h-1 rounded-full flex-shrink-0 ${level.id === 'basic' ? 'bg-info' :
                        level.id === 'balanced' ? 'bg-amber-500' : 'bg-danger'
                      }`} />
                    {block}
                  </li>
                ))}
              </ul>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Step 3 — Done ─────────────────────────────────────────

function DoneStep({
  goal,
  level,
}: {
  goal: OnboardingGoal
  level: ProtectionLevel
}) {
  const navigate = useNavigate()
  const levelData = LEVELS.find(l => l.id === level)!

  return (
    <div className="space-y-8 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-24 h-24 bg-success/10 rounded-3xl flex items-center justify-center mx-auto border border-success/20"
      >
        <Shield size={44} className="text-success" />
      </motion.div>

      <div className="space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-sora font-semibold text-2xl text-foreground"
        >
          You're protected 🎉
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-foreground-muted leading-relaxed max-w-sm mx-auto"
        >
          <strong className="text-foreground">{levelData.label} protection</strong> has been applied to your account.
          Now connect Cloudflare and add your devices to start filtering.
        </motion.p>
      </div>

      {/* Next steps */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-2 text-left"
      >
        {[
          {
            icon: <Zap size={14} className="text-amber-500" />,
            label: 'Connect Cloudflare',
            description: 'Link your account to enable DNS filtering',
            action: () => navigate('/dashboard/cloudflare/connect'),
            primary: true,
          },
          {
            icon: <Smartphone size={14} className="text-foreground-muted" />,
            label: 'Set up a device',
            description: 'Install the filter on your iPhone, Mac, Android, or Windows PC',
            action: () => navigate('/dashboard/devices'),
            primary: false,
          },
          {
            icon: <Eye size={14} className="text-foreground-muted" />,
            label: 'Review content policy',
            description: 'Fine-tune exactly what gets blocked',
            action: () => navigate('/dashboard/content-policy'),
            primary: false,
          },
        ].map(step => (
          <button
            key={step.label}
            onClick={step.action}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border text-left transition-all group ${step.primary
                ? 'bg-amber-500/8 border-amber-500/30 hover:bg-amber-500/12'
                : 'bg-background-elevated border-border hover:border-border-subtle'
              }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${step.primary ? 'bg-amber-500/15' : 'bg-background-overlay'
              }`}>
              {step.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${step.primary ? 'text-amber-500' : 'text-foreground'}`}>
                {step.label}
              </div>
              <div className="text-xs text-foreground-muted">{step.description}</div>
            </div>
            <ArrowRight size={14} className="text-foreground-subtle group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </button>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="text-foreground-subtle"
        >
          Go to dashboard
        </Button>
      </motion.div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [goal, setGoal] = useState<OnboardingGoal | null>(null)
  const [level, setLevel] = useState<ProtectionLevel | null>(null)
  const [error, setError] = useState('')

  const runOnboarding = useRunOnboarding()

  function goTo(next: number) {
    setDir(next > step ? 1 : -1)
    setStep(next)
    setError('')
  }

  async function handleFinish() {
    if (!goal || !level) return
    setError('')
    try {
      await runOnboarding.mutateAsync({ goal, level })
      goTo(2)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
            <Shield size={14} className="text-background" />
          </div>
          <span className="font-sora font-semibold text-sm text-foreground">Noori</span>
        </div>

        {step < 2 && (
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-foreground-subtle hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-8">
          {/* Step indicator */}
          {step < 2 && (
            <StepIndicator steps={STEPS} currentStep={step} />
          )}

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
                  transition={transition}
                >
                  <GoalStep selected={goal} onSelect={g => { setGoal(g) }} />
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
                  transition={transition}
                >
                  <ProtectionStep selected={level} onSelect={l => setLevel(l)} />
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
                  transition={transition}
                >
                  <DoneStep goal={goal!} level={level!} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          {step < 2 && (
            <div className="space-y-3">
              {error && (
                <p className="text-sm text-danger-text bg-danger/10 border border-danger/20 rounded-md px-3 py-2 text-center">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                {step > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => goTo(step - 1)}
                    leftIcon={<ArrowLeft size={14} />}
                  >
                    Back
                  </Button>
                )}

                {step === 0 && (
                  <Button
                    onClick={() => goal && goTo(1)}
                    disabled={!goal}
                    rightIcon={<ArrowRight size={14} />}
                    className="flex-1"
                    size="lg"
                  >
                    Continue
                  </Button>
                )}

                {step === 1 && (
                  <Button
                    onClick={handleFinish}
                    disabled={!level}
                    loading={runOnboarding.isPending}
                    rightIcon={<Shield size={14} />}
                    className="flex-1"
                    size="lg"
                  >
                    Apply protection
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
