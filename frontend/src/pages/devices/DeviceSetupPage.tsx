import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone, Monitor, Wifi, Plus, Trash2,
  CheckCircle2, Circle, ExternalLink, Download,
  QrCode, Shield, ChevronRight, ArrowLeft,
  AlertCircle, Info, Apple, Chrome
} from 'lucide-react'
import {
  useDevices, useCreateDevice, useDeleteDevice,
  type DeviceType, type Device
} from '@/hooks/useDevices'
import { getErrorMessage, timeAgo } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useCFStatus } from '@/hooks/useCloudflare'

// ── Platform config ───────────────────────────────────────

const PLATFORMS: {
  type: DeviceType
  label: string
  shortLabel: string
  icon: React.ReactNode
  description: string
}[] =
  [
    { type: 'ios', label: 'iPhone / iPad', shortLabel: 'iPhone', icon: <Smartphone size={20} />, description: 'Deep filtering with supervised mode' },
    { type: 'macos', label: 'Mac', shortLabel: 'Mac', icon: <Monitor size={20} />, description: 'Config profile + DNS filtering' },
    { type: 'android', label: 'Android', shortLabel: 'Android', icon: <Smartphone size={20} />, description: 'Cloudflare One VPN app' },
    { type: 'windows', label: 'Windows', shortLabel: 'Windows', icon: <Monitor size={20} />, description: 'Cloudflare One client' },
  ]

// ── iOS Setup Wizard ──────────────────────────────────────

function IOSSetupSteps({
  gatewayId,
  teamName,
}: { gatewayId?: string | null; teamName?: string | null }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const toggle = (key: string) =>
    setChecked(p => ({ ...p, [key]: !p[key] }))

  const steps = [
    {
      key: 'vpn',
      title: 'Install Cloudflare One on your iPhone',
      description: 'This app connects your iPhone to your content filtering policy.',
      action: (
        <a
          href="https://apps.apple.com/app/cloudflare-one-agent/id6443593337"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          <Apple size={12} /> Open App Store <ExternalLink size={11} />
        </a>
      ),
    },
    {
      key: 'login',
      title: 'Log in with your Cloudflare account',
      description: teamName
        ? `Open the app, tap "Get Started". When asked for "Organization Name", select that option and enter: ${teamName} — then tap Next and sign in with your Cloudflare email.`
        : 'Open the app, tap "Get Started". When asked for "Organization Name", you\'ll need your Zero Trust team name — reconnect Cloudflare from Settings to auto-fill this.',
      action: teamName ? (
        <div className="mt-1.5 p-2 bg-background-overlay rounded-md border border-border flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-foreground-subtle mb-0.5">Your Organization Name</div>
            <code className="text-xs text-amber-500 font-mono">{teamName}</code>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(teamName)}
            className="text-xs text-foreground-muted hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-border-subtle"
          >
            Copy
          </button>
        </div>
      ) : undefined,
    },
    {
      key: 'vpn_on',
      title: 'Turn on the VPN',
      description: 'Tap the toggle in the app to enable the filter. A VPN icon will appear in your status bar.',
    },
    {
      key: 'cert',
      title: 'Install the Cloudflare certificate (recommended)',
      description: 'Lets Noori show a helpful block page instead of a generic error when a site is blocked.',
      action: (
        <a
          href="https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/user-side-certificates/install-cloudflare-cert/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          Certificate guide <ExternalLink size={11} />
        </a>
      ),
      optional: true,
    },
    {
      key: 'config',
      title: 'Download the iOS Config Profile (Pro)',
      description: 'Adds deep restrictions — blocks bypass attempts, enforces safe search, locks settings.',
      action: (
        <a
          href="/dashboard/config-generator"
          className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          Open Config Generator <ChevronRight size={11} />
        </a>
      ),
      badge: 'Pro',
    },
  ]

  const doneCount = steps.filter(s => checked[s.key]).length

  return (
    <div className="space-y-4">
      {/* Supervised mode info */}
      <div className="flex gap-3 p-3.5 bg-info/6 border border-info/15 rounded-lg">
        <Info size={15} className="text-info flex-shrink-0 mt-0.5" />
        <div className="text-xs text-foreground-muted space-y-1">
          <p className="font-medium text-foreground">Not sure if your iPhone is supervised?</p>
          <p>Go to <strong className="text-foreground">Settings</strong> — if you see "This iPhone is supervised..." at the top, it's supervised and you get stronger filtering. If not, the setup below still works.</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span>Setup steps</span>
        <span>{doneCount}/{steps.length} complete</span>
      </div>

      <div className="space-y-2">
        {steps.map(step => (
          <button
            key={step.key}
            onClick={() => toggle(step.key)}
            className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${checked[step.key]
              ? 'border-success/25 bg-success/5'
              : 'border-border hover:border-border-subtle bg-background-elevated'
              }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {checked[step.key]
                ? <CheckCircle2 size={16} className="text-success" />
                : <Circle size={16} className="text-foreground-subtle" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-sm font-medium ${checked[step.key] ? 'line-through text-foreground-subtle' : 'text-foreground'}`}>
                  {step.title}
                </span>
                {step.optional && <Badge variant="muted" size="sm">Optional</Badge>}
                {step.badge && <Badge variant="amber" size="sm">{step.badge}</Badge>}
              </div>
              <p className="text-xs text-foreground-muted leading-relaxed">{step.description}</p>
              {step.action && <div className="pt-1">{step.action}</div>}
            </div>
          </button>
        ))}
      </div>

      {doneCount === steps.length && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-success/8 border border-success/20 rounded-lg"
        >
          <Shield size={16} className="text-success" />
          <div className="text-sm">
            <span className="font-medium text-foreground">iPhone fully protected!</span>
            <span className="text-foreground-muted ml-1">All steps complete.</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ── macOS Setup Wizard ────────────────────────────────────

function MacOSSetupSteps() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }))

  const steps = [
    {
      key: 'app',
      title: 'Install Cloudflare One on your Mac',
      description: 'Download and install the macOS client to connect to your content policy.',
      action: (
        <a
          href="https://1111-releases.cloudflareclient.com/mac/latest"
          className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          <Download size={11} /> Download for Mac <ExternalLink size={11} />
        </a>
      ),
    },
    {
      key: 'login',
      title: 'Open the app and sign in',
      description: 'Click the Cloudflare icon in your menu bar and log in with your Cloudflare email.',
    },
    {
      key: 'cert',
      title: 'Install the Cloudflare certificate',
      description: 'Required for HTTPS filtering. Follow the guide to trust the Cloudflare root certificate.',
      action: (
        <a
          href="https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/user-side-certificates/install-cloudflare-cert/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          Certificate guide <ExternalLink size={11} />
        </a>
      ),
    },
    {
      key: 'config',
      title: 'Download the macOS Config Profile',
      description: 'Adds Safari restrictions, enforces safe search, and prevents settings changes.',
      action: (
        <a
          href="/dashboard/config-generator"
          className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          Open Config Generator <ChevronRight size={11} />
        </a>
      ),
    },
  ]

  return (
    <div className="space-y-2">
      {steps.map(step => (
        <button
          key={step.key}
          onClick={() => toggle(step.key)}
          className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${checked[step.key]
            ? 'border-success/25 bg-success/5'
            : 'border-border hover:border-border-subtle bg-background-elevated'
            }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {checked[step.key]
              ? <CheckCircle2 size={16} className="text-success" />
              : <Circle size={16} className="text-foreground-subtle" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className={`text-sm font-medium ${checked[step.key] ? 'line-through text-foreground-subtle' : 'text-foreground'}`}>
              {step.title}
            </span>
            <p className="text-xs text-foreground-muted leading-relaxed">{step.description}</p>
            {step.action && <div className="pt-1">{step.action}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Android Setup Wizard ──────────────────────────────────

function AndroidSetupSteps({
  teamName,
}: { teamName?: string | null }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }))
  const [showManaged, setShowManaged] = useState(false)

  const steps = [
    {
      key: 'app',
      title: 'Install Cloudflare One on your Android',
      description: 'Scan the QR code or search "Cloudflare One" on the Play Store.',
      action: (
        <div className="flex items-start gap-4 mt-2">
          {/* QR placeholder — in production generate real QR */}
          <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center flex-shrink-0 border border-border">
            <QrCode size={48} className="text-background" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-foreground-muted">Point your camera at the QR code to open the Play Store</p>
            <a
              href="https://play.google.com/store/apps/details?id=com.cloudflare.cloudflareoneagent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              Open Play Store <ExternalLink size={11} />
            </a>
          </div>
        </div>
      ),
    },
    {
      key: 'login',
      title: 'Sign in with your Cloudflare account',
      description: teamName
        ? `Open the app, tap "Get Started". For "Organization Name", enter: ${teamName} — then tap Next and sign in with your Cloudflare email.`
        : 'Open the app, tap "Get Started". You\'ll need your Zero Trust team name for "Organization Name" — reconnect Cloudflare from Settings to auto-fill this.',
      action: teamName ? (
        <div className="mt-1.5 p-2 bg-background-overlay rounded-md border border-border flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-foreground-subtle mb-0.5">Your Organization Name</div>
            <code className="text-xs text-amber-500 font-mono">{teamName}</code>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(teamName)}
            className="text-xs text-foreground-muted hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-border-subtle"
          >
            Copy
          </button>
        </div>
      ) : undefined,
    },
    {
      key: 'vpn_on',
      title: 'Enable the VPN',
      description: 'Tap the toggle to connect. Android will ask permission to create a VPN — allow it.',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Managed mode callout */}
      <div className="p-3.5 bg-background-elevated border border-border rounded-lg space-y-2">
        <button
          onClick={() => setShowManaged(!showManaged)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-amber-500" />
            <span className="text-xs font-medium text-foreground">Want stronger bypass prevention?</span>
          </div>
          <ChevronRight size={13} className={`text-foreground-subtle transition-transform ${showManaged ? 'rotate-90' : ''}`} />
        </button>
        <AnimatePresence>
          {showManaged && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* <div className="pt-2 space-y-2 text-xs text-foreground-muted">
                <p>Managed mode (using Andoff or ManageEngine) prevents factory resets, app uninstalls, and developer mode — making the filter much harder to bypass.</p>
                <a
                  href="https://dashboard.others.com/tutorials/andoff-overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-500 hover:text-amber-400 transition-colors"
                >
                  See managed mode guide <ExternalLink size={10} />
                </a>
              </div> */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {steps.map(step => (
        <button
          key={step.key}
          onClick={() => toggle(step.key)}
          className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${checked[step.key]
            ? 'border-success/25 bg-success/5'
            : 'border-border hover:border-border-subtle bg-background-elevated'
            }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {checked[step.key]
              ? <CheckCircle2 size={16} className="text-success" />
              : <Circle size={16} className="text-foreground-subtle" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className={`text-sm font-medium ${checked[step.key] ? 'line-through text-foreground-subtle' : 'text-foreground'}`}>
              {step.title}
            </span>
            <p className="text-xs text-foreground-muted leading-relaxed">{step.description}</p>
            {step.action && <div className="pt-1">{step.action}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Windows Setup Wizard ──────────────────────────────────

function WindowsSetupSteps() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }))

  const steps = [
    {
      key: 'download',
      title: 'Download Cloudflare One for Windows',
      description: 'Click the button below to download the .MSI installer.',
      action: (
        <a
          href="https://1111-releases.cloudflareclient.com/win/latest"
          className="inline-flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-background font-medium px-3 py-1.5 rounded-md transition-colors"
        >
          <Download size={12} /> Start Download
        </a>
      ),
    },
    {
      key: 'install',
      title: 'Run the installer',
      description: 'Double-click the downloaded .MSI file. Accept the prompts to complete installation.',
    },
    {
      key: 'open',
      title: 'Open Cloudflare One',
      description: 'Click the cloud icon in the taskbar (bottom-right, near the clock).',
    },
    {
      key: 'login',
      title: 'Sign in with your Cloudflare account',
      description: 'Enter your Cloudflare email to connect the app to your content policy.',
    },
    {
      key: 'cert',
      title: 'Install the Cloudflare certificate',
      description: 'Required for full HTTPS filtering on Windows.',
      action: (
        <a
          href="https://developers.cloudflare.com/cloudflare-one/connections/connect-devices/warp/user-side-certificates/install-cloudflare-cert/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
        >
          Certificate guide <ExternalLink size={11} />
        </a>
      ),
      optional: true,
    },
  ]

  return (
    <div className="space-y-2">
      {steps.map(step => (
        <button
          key={step.key}
          onClick={() => toggle(step.key)}
          className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${checked[step.key]
            ? 'border-success/25 bg-success/5'
            : 'border-border hover:border-border-subtle bg-background-elevated'
            }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {checked[step.key]
              ? <CheckCircle2 size={16} className="text-success" />
              : <Circle size={16} className="text-foreground-subtle" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${checked[step.key] ? 'line-through text-foreground-subtle' : 'text-foreground'}`}>
                {step.title}
              </span>
              {step.optional && <Badge variant="muted" size="sm">Optional</Badge>}
            </div>
            <p className="text-xs text-foreground-muted leading-relaxed">{step.description}</p>
            {step.action && <div className="pt-1">{step.action}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Router Setup ──────────────────────────────────────────

function RouterSetupSteps({ gatewayId }: { gatewayId?: string | null }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (key: string) => setChecked(p => ({ ...p, [key]: !p[key] }))

  const dnsHost = gatewayId
    ? `${gatewayId}.cloudflare-gateway.com`
    : 'your-gateway-id.cloudflare-gateway.com'

  const steps = [
    {
      key: 'admin',
      title: 'Open your router admin panel',
      description: 'Usually at 192.168.1.1 or 192.168.0.1 in your browser. Check the label on your router.',
    },
    {
      key: 'dns',
      title: 'Set the DNS servers',
      description: 'Find DNS settings (under WAN, Internet, or Advanced). Set Primary DNS to 1.1.1.1 and Secondary to 1.0.0.1.',
    },
    {
      key: 'doh',
      title: 'Configure DNS-over-HTTPS (recommended)',
      description: 'For full filtering, set your DoH URL in advanced DNS settings.',
      action: gatewayId ? (
        <div className="mt-1.5 p-2 bg-background-overlay rounded-md border border-border">
          <div className="text-[10px] text-foreground-subtle mb-1">Your DoH URL</div>
          <code className="text-xs text-amber-500 font-mono break-all">
            https://{dnsHost}/dns-query
          </code>
        </div>
      ) : (
        <p className="text-xs text-warning mt-1">Connect Cloudflare first to get your DoH URL</p>
      ),
    },
    {
      key: 'save',
      title: 'Save and restart your router',
      description: 'Apply the changes. All devices on your network will now use Noori filtering.',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-3 p-3.5 bg-info/6 border border-info/15 rounded-lg">
        <Info size={15} className="text-info flex-shrink-0 mt-0.5" />
        <p className="text-xs text-foreground-muted">
          Router setup filters <strong className="text-foreground">all devices</strong> on your home network — phones, laptops, tablets, smart TVs — without installing anything on each device.
        </p>
      </div>

      {steps.map(step => (
        <button
          key={step.key}
          onClick={() => toggle(step.key)}
          className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${checked[step.key]
            ? 'border-success/25 bg-success/5'
            : 'border-border hover:border-border-subtle bg-background-elevated'
            }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {checked[step.key]
              ? <CheckCircle2 size={16} className="text-success" />
              : <Circle size={16} className="text-foreground-subtle" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <span className={`text-sm font-medium ${checked[step.key] ? 'line-through text-foreground-subtle' : 'text-foreground'}`}>
              {step.title}
            </span>
            <p className="text-xs text-foreground-muted leading-relaxed">{step.description}</p>
            {step.action && <div>{step.action}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Platform setup router ─────────────────────────────────

function PlatformSetup({
  type,
  gatewayId,
  teamName,
}: {
  type: DeviceType
  gatewayId?: string | null
  teamName?: string | null
}) {
  switch (type) {
    case 'ios': return <IOSSetupSteps gatewayId={gatewayId} teamName={teamName} />
    case 'macos': return <MacOSSetupSteps />
    case 'android': return <AndroidSetupSteps teamName={teamName} />
    case 'windows': return <WindowsSetupSteps />
    default: return null
  }
}

// ── Add device modal ──────────────────────────────────────

function AddDeviceModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (device: Device) => void
}) {
  const [selectedType, setSelectedType] = useState<DeviceType | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const createDevice = useCreateDevice()

  function handleClose() {
    setSelectedType(null)
    setName('')
    setError('')
    onClose()
  }

  async function handleCreate() {
    if (!selectedType || !name.trim()) return
    setError('')
    try {
      const device = await createDevice.mutateAsync({ name: name.trim(), type: selectedType })
      onAdded(device)
      handleClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add a device" size="md">
      <div className="space-y-5">
        {/* Platform grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p.type}
              onClick={() => {
                setSelectedType(p.type)
                setName(`My ${p.shortLabel}`)
              }}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-lg border text-center transition-all ${selectedType === p.type
                ? 'border-amber-500/40 bg-amber-500/8 text-amber-500'
                : 'border-border hover:border-border-subtle bg-background-elevated text-foreground-muted hover:text-foreground'
                }`}
            >
              {p.icon}
              <span className="text-xs font-medium">{p.shortLabel}</span>
            </button>
          ))}
        </div>

        {selectedType && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Input
              label="Device name"
              placeholder="e.g. My iPhone, Work Mac"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />

            {error && (
              <p className="text-sm text-danger-text bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              onClick={handleCreate}
              loading={createDevice.isPending}
              disabled={!name.trim()}
              className="w-full"
            >
              Add device
            </Button>
          </motion.div>
        )}
      </div>
    </Modal>
  )
}

// ── Device icon helper ────────────────────────────────────

function DeviceIcon({ type, size = 16 }: { type: DeviceType; size?: number }) {
  if (type === 'macos' || type === 'windows') return <Monitor size={size} />
  return <Smartphone size={size} />
}

// ── Main page ─────────────────────────────────────────────

export default function DeviceSetupPage() {
  const { data: devices = [], isLoading } = useDevices()
  const deleteDevice = useDeleteDevice()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const selectedDevice = devices.find(d => d.id === selectedId)

  const { data: cfStatus } = useCFStatus()
  const gatewayId = cfStatus?.cfGatewayId ?? null
  const teamName = cfStatus?.cfTeamName ?? null

  async function handleDelete(id: string) {
    await deleteDevice.mutateAsync(id)
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-sora font-semibold text-2xl text-foreground">Device Setup</h1>
          <p className="text-sm text-foreground-muted mt-1">
            Connect your devices to start filtering content
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} leftIcon={<Plus size={15} />}>
          Add device
        </Button>
      </div>

      {/* Platform quick-add grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {PLATFORMS.map(p => (
          <button
            key={p.type}
            onClick={() => setShowAdd(true)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-border-subtle hover:bg-background-elevated text-center transition-all group"
          >
            <div className="text-foreground-subtle group-hover:text-foreground transition-colors">
              {p.icon}
            </div>
            <span className="text-xs text-foreground-muted group-hover:text-foreground transition-colors">
              {p.shortLabel}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="card h-20 animate-pulse bg-background-elevated" />)}
        </div>
      ) : devices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Smartphone size={20} />}
            title="No devices yet"
            description="Add your first device to get step-by-step setup instructions."
            action={{ label: 'Add first device', onClick: () => setShowAdd(true) }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Device list */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Your devices
            </h2>
            {devices.map(device => (
              <Card
                key={device.id}
                selected={selectedId === device.id}
                hoverable
                onClick={() => setSelectedId(
                  selectedId === device.id ? null : device.id
                )}
                padding="sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedId === device.id
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-background-overlay text-foreground-muted'
                    }`}>
                    <DeviceIcon type={device.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{device.name}</div>
                    <div className="text-xs text-foreground-subtle capitalize">{device.type}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(device.id) }}
                    className="text-foreground-subtle hover:text-danger-text transition-colors p-1 flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            ))}

            <button
              onClick={() => setShowAdd(true)}
              className="w-full flex items-center gap-2 p-3 rounded-lg border border-dashed border-border hover:border-border-subtle text-foreground-subtle hover:text-foreground transition-all text-sm"
            >
              <Plus size={14} /> Add another device
            </button>
          </div>

          {/* Setup guide panel */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedDevice ? (
                <motion.div
                  key={selectedDevice.id}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500">
                      <DeviceIcon type={selectedDevice.type} size={17} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        {selectedDevice.name}
                      </h2>
                      <p className="text-xs text-foreground-muted">
                        {PLATFORMS.find(p => p.type === selectedDevice.type)?.description}
                      </p>
                    </div>
                  </div>

                  <PlatformSetup type={selectedDevice.type} gatewayId={gatewayId} teamName={teamName} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-48 text-center space-y-2"
                >
                  <div className="w-10 h-10 bg-background-elevated border border-border rounded-xl flex items-center justify-center text-foreground-subtle">
                    <Smartphone size={18} />
                  </div>
                  <p className="text-sm text-foreground-muted">
                    Select a device to see setup instructions
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <AddDeviceModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={device => {
          setSelectedId(device.id)
          setShowAdd(false)
        }}
      />
    </div>
  )
}

