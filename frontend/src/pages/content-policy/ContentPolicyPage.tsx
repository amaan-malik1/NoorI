import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Globe, Eye, Dices, Users, Zap,
  Plus, X, CheckCircle2, ChevronDown, ChevronUp,
  Lock, AlertTriangle, Search
} from 'lucide-react'
import {
  usePolicies, useSavePolicy, useApplyPreset,
  useDeletePolicy, useCFStatus, type ContentPolicy, type PolicySchedule
} from '@/hooks/useCloudflare'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Toggle from '@/components/ui/Toggle'
import Badge from '@/components/ui/Badge'
import PolicyScheduleEditor from '@/components/content-policy/PolicyScheduleEditor'

// ── Category map ──────────────────────────────────────────
const CATEGORIES: Record<number, { label: string; icon: React.ReactNode; description: string }> = {
  1: { label: 'Adult Content', icon: <Eye size={16} />, description: 'Pornography and explicit material' },
  7: { label: 'Gambling', icon: <Dices size={16} />, description: 'Gambling websites and apps' },
  117: { label: 'Malware', icon: <Shield size={16} />, description: 'Sites hosting malware' },
  108: { label: 'Phishing', icon: <Shield size={16} />, description: 'Phishing and scam sites' },
  122: { label: 'Social Media', icon: <Users size={16} />, description: 'Facebook, Instagram, TikTok, etc.' },
  135: { label: 'Video Streaming', icon: <Globe size={16} />, description: 'YouTube, Netflix, Twitch' },
  6: { label: 'Gaming', icon: <Globe size={16} />, description: 'Online gaming sites' },
  4: { label: 'Drugs & Alcohol', icon: <Globe size={16} />, description: 'Drug and alcohol related content' },
  14: { label: 'Violence', icon: <AlertTriangle size={16} />, description: 'Graphic violence' },
  9: { label: 'Hate Speech', icon: <AlertTriangle size={16} />, description: 'Hateful and extremist content' },
  100: { label: 'VPNs & Proxies', icon: <Lock size={16} />, description: 'VPN services that bypass filtering' },
  118: { label: 'Cryptocurrency', icon: <Globe size={16} />, description: 'Crypto exchanges and trading' },
  133: { label: 'Torrents', icon: <Globe size={16} />, description: 'P2P and torrent sites' },
}

// ── Preset cards ──────────────────────────────────────────
const PRESETS = [
  {
    id: 'basic' as const,
    label: 'Basic',
    description: 'Adult content, VPNs, malware & phishing',
    color: 'text-info',
    bg: 'bg-info/8 border-info/20',
    selectedBg: 'bg-info/15 border-info/40',
    categories: [1, 100, 117, 108],
  },
  {
    id: 'balanced' as const,
    label: 'Balanced',
    description: 'Basic + social media & gambling',
    color: 'text-amber-500',
    bg: 'bg-amber-500/8 border-amber-500/20',
    selectedBg: 'bg-amber-500/15 border-amber-500/40',
    categories: [1, 100, 117, 108, 7, 122],
  },
  {
    id: 'maximum' as const,
    label: 'Maximum',
    description: 'Everything blocked — strictest mode',
    color: 'text-danger-text',
    bg: 'bg-danger/8 border-danger/20',
    selectedBg: 'bg-danger/15 border-danger/40',
    categories: [1, 100, 117, 108, 7, 122, 135, 14, 9, 4, 133, 118],
  },
]

// ── Domain input ──────────────────────────────────────────
function DomainInput({
  domains,
  onAdd,
  onRemove,
  placeholder,
}: {
  domains: string[]
  onAdd: (d: string) => void
  onRemove: (d: string) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const clean = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (clean && !domains.includes(clean)) {
      onAdd(clean)
      setInput('')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="input-base flex-1 text-xs"
        />
        <Button variant="secondary" size="sm" onClick={add} leftIcon={<Plus size={12} />}>
          Add
        </Button>
      </div>
      {domains.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {domains.map(d => (
            <span
              key={d}
              className="inline-flex items-center gap-1.5 text-xs bg-background-overlay border border-border rounded-md px-2 py-1 font-mono text-foreground-muted"
            >
              {d}
              <button onClick={() => onRemove(d)} className="text-foreground-subtle hover:text-danger-text transition-colors">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
export default function ContentPolicyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const plan = user?.account?.subscription?.plan ?? 'free'
  const isPro = plan === 'pro' || plan === 'family'
  const canSchedule = plan === 'pro' || plan === 'family' // scheduling gated same as Pro+ today

  const { data: policies = [], isLoading } = usePolicies()
  const { data: cfStatus } = useCFStatus()
  const savePolicy = useSavePolicy()
  const applyPreset = useApplyPreset()
  const deletePolicy = useDeletePolicy()

  const policy: ContentPolicy | undefined = policies[0]

  // Local state mirrors the policy for editing
  const [blocked, setBlocked] = useState<number[]>([])
  const [blockedDomains, setBlockedDomains] = useState<string[]>([])
  const [allowedDomains, setAllowedDomains] = useState<string[]>([])
  const [safeSearch, setSafeSearch] = useState(false)
  const [schedule, setSchedule] = useState<PolicySchedule | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Sync from API once policy loads — useEffect is correct here, not useState
  // initialized flag prevents overwriting user edits after a save triggers re-fetch
  useEffect(() => {
    if (policy && !initialized) {
      setBlocked(policy.blockedCategories)
      setBlockedDomains(policy.blockedDomains)
      setAllowedDomains(policy.allowedDomains)
      setSafeSearch(policy.safeSearchEnabled)
      setSchedule(policy.schedule ?? null)
      setInitialized(true)
    }
  }, [policy, initialized])

  function toggleCategory(id: number) {
    setBlocked(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
    setSaved(false)
  }

  async function handleApplyPreset(presetId: 'basic' | 'balanced' | 'maximum') {
    const preset = PRESETS.find(p => p.id === presetId)!
    setBlocked(preset.categories)
    setSafeSearch(true)
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await savePolicy.mutateAsync({
        id: policy?.id,
        blockedCategories: blocked,
        blockedDomains,
        allowedDomains,
        safeSearchEnabled: safeSearch,
        isActive: true,
        schedule,
      })
      setSaved(true)
      // Allow re-sync from server on next fetch so preset detection stays accurate
      setInitialized(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // Active preset = all preset categories are currently blocked
  // Use subset check (not exact match) so extra user-added categories
  // don't break the "Basic Active" / "Balanced Active" detection
  const activePreset = PRESETS.slice().reverse().find(p =>
    p.categories.every(c => blocked.includes(c))
  )

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-6 h-24 animate-pulse bg-background-elevated" />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-sora font-semibold text-2xl text-foreground">Content Policy</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Choose what to block — no technical setup required
          </p>
        </div>
        <div className="flex items-center gap-2">
          {schedule && (
            <Badge variant="amber" size="sm">Scheduled</Badge>
          )}
          {cfStatus?.cfConnected ? (
            <Badge variant="success" dot>Synced to Cloudflare</Badge>
          ) : (
            <Badge variant="warning" dot>Cloudflare not connected</Badge>
          )}
        </div>
      </div>

      {/* CF not connected warning */}
      {!cfStatus?.cfConnected && (
        <div className="flex items-start gap-3 p-4 bg-warning/8 border border-warning/20 rounded-lg">
          <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-foreground">Connect Cloudflare first.</span>
            <span className="text-foreground-muted ml-1">
              Your policy will be saved locally but won't filter traffic until Cloudflare is connected.
            </span>
          </div>
        </div>
      )}

      {/* ── Preset cards ─────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Quick presets</h2>
          <p className="text-xs text-foreground-muted">
            Start with a preset and customize from there
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map(preset => {
            const isSelected = activePreset?.id === preset.id
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset.id)}
                className={`p-4 rounded-lg border text-left transition-all space-y-1.5 ${isSelected ? preset.selectedBg : preset.bg + ' hover:opacity-80'
                  }`}
              >
                <div className={`text-sm font-semibold ${preset.color}`}>{preset.label}</div>
                <div className="text-xs text-foreground-muted leading-relaxed">{preset.description}</div>
                {isSelected && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${preset.color}`}>
                    <CheckCircle2 size={11} /> Active
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Category toggles ──────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground">What to block</h2>
            <p className="text-xs text-foreground-muted">Toggle categories on or off</p>
          </div>
          <Badge variant="amber">{blocked.length} active</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(CATEGORIES).map(([idStr, cat]) => {
            const id = Number(idStr)
            const isBlocked = blocked.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleCategory(id)}
                className={`flex items-center gap-3 p-3 rounded-md border text-left transition-all ${isBlocked
                  ? 'bg-danger/8 border-danger/20 text-foreground'
                  : 'bg-background-elevated border-border hover:border-border-subtle text-foreground-muted'
                  }`}
              >
                <span className={isBlocked ? 'text-danger-text' : 'text-foreground-subtle'}>
                  {cat.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{cat.label}</div>
                  <div className="text-[10px] text-foreground-subtle truncate">{cat.description}</div>
                </div>
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isBlocked ? 'bg-danger' : 'bg-border'}`} />
              </button>
            )
          })}
        </div>

        {/* SafeSearch toggle */}
        <div className="pt-3 border-t border-border">
          <Toggle
            checked={safeSearch}
            onChange={v => { setSafeSearch(v); setSaved(false) }}
            label="Force Safe Search"
            description="Enforces Google, Bing, and YouTube safe search mode"
          />
        </div>

        {/* Time-based scheduling */}
        <div className="pt-3 border-t border-border">
          <PolicyScheduleEditor
            value={schedule}
            onChange={v => { setSchedule(v); setSaved(false) }}
            enabled={canSchedule}
            onUpgradeClick={() => navigate('/dashboard/settings?tab=billing')}
          />
        </div>
      </div>

      {/* ── Advanced (domain lists) ───────────────────────── */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-5 text-left hover:bg-background-elevated/50 transition-colors"
        >
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold text-foreground">Advanced — Custom domains</h2>
            <p className="text-xs text-foreground-muted">
              Block or allow specific websites by address
            </p>
          </div>
          {showAdvanced ? <ChevronUp size={16} className="text-foreground-muted" /> : <ChevronDown size={16} className="text-foreground-muted" />}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-5 border-t border-border pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-danger" />
                    <label className="text-xs font-medium text-foreground">Always block these sites</label>
                  </div>
                  <DomainInput
                    domains={blockedDomains}
                    onAdd={d => { setBlockedDomains(p => [...p, d]); setSaved(false) }}
                    onRemove={d => { setBlockedDomains(p => p.filter(x => x !== d)); setSaved(false) }}
                    placeholder="e.g. reddit.com"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <label className="text-xs font-medium text-foreground">Always allow these sites</label>
                  </div>
                  <DomainInput
                    domains={allowedDomains}
                    onAdd={d => { setAllowedDomains(p => [...p, d]); setSaved(false) }}
                    onRemove={d => { setAllowedDomains(p => p.filter(x => x !== d)); setSaved(false) }}
                    placeholder="e.g. khanacademy.org"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Save bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {error && <p className="text-sm text-danger-text">{error}</p>}
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 size={14} /> Saved and synced
          </span>
        )}
        {!error && !saved && <span />}

        <Button
          onClick={handleSave}
          loading={saving}
          leftIcon={<Zap size={14} />}
          size="lg"
        >
          Save policy
        </Button>
      </div>
    </motion.div>
  )
}