import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Shield, CheckCircle2, AlertCircle, ArrowRight, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// ── Fetch hooks ───────────────────────────────────────────
function useProtectionScore() {
  return useQuery({
    queryKey: ['protection-score'],
    queryFn: () => api.get('/onboarding/score').then(r => r.data.data),
  })
}

function useAccount() {
  return useQuery({
    queryKey: ['account'],
    queryFn: () => api.get('/account').then(r => r.data.data),
  })
}

// ── Score ring ────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ

  const color =
    score >= 80 ? '#22C55E' :
      score >= 50 ? '#F5A623' :
        '#EF4444'

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1E2028" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s' }}
        />
      </svg>
      <div className="text-center">
        <div className="font-sora font-bold text-3xl text-foreground">{score}</div>
        <div className="text-xs text-foreground-muted">/ 100</div>
      </div>
    </div>
  )
}

// ── Score label ───────────────────────────────────────────
function scoreLabel(score: number) {
  if (score >= 80) return { label: 'Well protected', color: 'text-success' }
  if (score >= 50) return { label: 'Partially protected', color: 'text-amber-500' }
  return { label: 'Needs setup', color: 'text-danger-text' }
}

// ── Stagger animation ─────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { data: scoreData, isLoading: scoreLoading } = useProtectionScore()
  const { data: account } = useAccount()

  const score = scoreData?.score ?? 0
  const items = scoreData?.items ?? []
  const { label, color } = scoreLabel(score)

  const incompleteItems = items.filter((i: { completed: boolean }) => !i.completed)
  const completedItems = items.filter((i: { completed: boolean }) => i.completed)

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div variants={item}>
        <h1 className="font-sora font-semibold text-2xl text-foreground">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}
          {user?.email && `, ${user.email.split('@')[0]}`}
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          Here's your protection overview
        </p>
      </motion.div>

      {/* ── Top row ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Protection score card */}
        <motion.div variants={item} className="card p-6 lg:col-span-1">
          <div className="text-sm font-medium text-foreground-muted mb-4">Protection Score</div>
          <div className="flex flex-col items-center gap-3">
            {scoreLoading ? (
              <div className="w-36 h-36 rounded-full bg-background-elevated animate-pulse" />
            ) : (
              <ScoreRing score={score} />
            )}
            <div className={cn('text-sm font-medium', color)}>{label}</div>
          </div>
        </motion.div>

        {/* Quick stats */}
        <motion.div variants={item} className="card p-6 lg:col-span-2 space-y-4">
          <div className="text-sm font-medium text-foreground-muted">Status</div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: 'Cloudflare',
                value: account?.cfConnected ? 'Connected' : 'Not connected',
                ok: !!account?.cfConnected,
              },
              {
                label: 'Content Policy',
                value: account?._count?.policies > 0 ? `${account._count.policies} active` : 'None set',
                ok: account?._count?.policies > 0,
              },
              {
                label: 'Devices',
                value: account?._count?.devices > 0 ? `${account._count.devices} registered` : 'None added',
                ok: account?._count?.devices > 0,
              },
              {
                label: 'Plan',
                value: account?.subscription?.plan === 'family'
                  ? 'Family'
                  : account?.subscription?.plan === 'pro'
                    ? 'Pro'
                    : 'Free',
                ok: true,
              },
            ].map(({ label, value, ok }) => (
              <div key={label} className="bg-background-elevated rounded-md p-3 space-y-1">
                <div className="text-xs text-foreground-muted">{label}</div>
                <div className={cn(
                  'text-sm font-medium flex items-center gap-1.5',
                  ok ? 'text-foreground' : 'text-foreground-muted'
                )}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', ok ? 'bg-success' : 'bg-border-strong')} />
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Quick action if CF not connected */}
          {!account?.cfConnected && (
            <Link
              to="/dashboard/settings?tab=cloudflare"
              className="flex items-center justify-between p-3 rounded-md bg-amber-500/8 border border-amber-500/20 group hover:bg-amber-500/12 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Zap size={14} className="text-amber-500" />
                <span className="text-sm text-amber-500 font-medium">Connect Cloudflare to start protecting</span>
              </div>
              <ArrowRight size={14} className="text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </motion.div>
      </div>

      {/* ── Setup checklist ─────────────────────────────────── */}
      {incompleteItems.length > 0 && (
        <motion.div variants={item} className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-foreground-muted">Setup checklist</div>
            <div className="text-xs text-foreground-subtle">
              {completedItems.length} / {items.length} complete
            </div>
          </div>

          <div className="space-y-2">
            {incompleteItems.slice(0, 4).map((step: { id: string; label: string; action: string; completed: boolean }) => (
              <Link
                key={step.id}
                to={step.action}
                className="flex items-center gap-3 p-3 rounded-md hover:bg-background-elevated transition-all group"
              >
                <AlertCircle size={16} className="text-foreground-subtle flex-shrink-0" />
                <span className="text-sm text-foreground-muted flex-1">{step.label}</span>
                <ArrowRight size={14} className="text-foreground-subtle group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>

          {/* Completed items (collapsed) */}
          {completedItems.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border">
              {completedItems.map((step: { id: string; label: string }) => (
                <div key={step.id} className="flex items-center gap-3 px-3 py-1.5">
                  <CheckCircle2 size={14} className="text-success flex-shrink-0" />
                  <span className="text-xs text-foreground-subtle line-through">{step.label}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── All done state ─────────────────────────────────── */}
      {incompleteItems.length === 0 && score === 100 && (
        <motion.div variants={item} className="card p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={22} className="text-success" />
          </div>
          <div>
            <div className="font-medium text-foreground text-sm">Fully protected</div>
            <div className="text-xs text-foreground-muted mt-0.5">
              All setup steps complete. Your devices are filtering content through Cloudflare.
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}