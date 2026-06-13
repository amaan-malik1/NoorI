import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Smartphone, Monitor, Download, ChevronDown,
  ChevronUp, Lock, Shield, Eye, Camera, Globe,
  Settings, Star, AlertTriangle
} from 'lucide-react'
import { useDevices, useSaveDeviceConfig, useDownloadConfig } from '@/hooks/useDevices'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Toggle from '@/components/ui/Toggle'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'

// ── Restriction groups ─────────────────────────────────────

const IOS_GROUPS = [
  {
    id: 'siri',
    label: 'Siri & Voice',
    icon: <Globe size={14} />,
    fields: [
      { key: 'allowAssistant', label: 'Allow Siri', defaultValue: true },
      { key: 'allowAssistantWhileLocked', label: 'Allow Siri when locked', defaultValue: false },
    ],
  },
  {
    id: 'camera',
    label: 'Camera & Media',
    icon: <Camera size={14} />,
    fields: [
      { key: 'allowCamera', label: 'Allow Camera', defaultValue: true },
      { key: 'allowScreenShot', label: 'Allow Screenshots', defaultValue: true },
      { key: 'allowAirPrint', label: 'Allow AirPrint', defaultValue: true },
    ],
  },
  {
    id: 'browsing',
    label: 'Browser & Search',
    icon: <Globe size={14} />,
    fields: [
      { key: 'allowSafari', label: 'Allow Safari', defaultValue: true },
      { key: 'forceAssistantProfanityFilter', label: 'Force Safe Search', defaultValue: true },
    ],
  },
  {
    id: 'apps',
    label: 'App Management',
    icon: <Star size={14} />,
    fields: [
      { key: 'allowAppInstallation', label: 'Allow app installation', defaultValue: true },
      { key: 'allowInAppPurchases', label: 'Allow in-app purchases', defaultValue: false },
      { key: 'requireITunesStorePasswordEntry', label: 'Require iTunes password', defaultValue: true },
    ],
  },
  {
    id: 'security',
    label: 'Security & Privacy',
    icon: <Lock size={14} />,
    fields: [
      { key: 'allowEraseContentAndSettings', label: 'Allow erase device', defaultValue: false },
      { key: 'allowPasscodeModification', label: 'Allow passcode change', defaultValue: false },
      { key: 'allowAccountModification', label: 'Allow account changes', defaultValue: false },
      { key: 'allowBluetoothModification', label: 'Allow Bluetooth toggle', defaultValue: true },
      { key: 'allowUSBRestrictedMode', label: 'USB restricted mode', defaultValue: true },
      { key: 'allowPasswordAutoFill', label: 'Password AutoFill', defaultValue: true },
      { key: 'allowVPNCreation', label: 'Allow VPN creation', defaultValue: false },
    ],
  },
]

const MACOS_GROUPS = [
  {
    id: 'safari',
    label: 'Safari',
    icon: <Globe size={14} />,
    fields: [
      { key: 'allowSafari', label: 'Allow Safari', defaultValue: true },
      { key: 'safariAllowJavaScript', label: 'Allow JavaScript', defaultValue: true },
      { key: 'safariAllowAutoFill', label: 'Allow AutoFill', defaultValue: false },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: <Settings size={14} />,
    fields: [
      { key: 'allowCamera', label: 'Allow Camera', defaultValue: true },
      { key: 'allowScreenShot', label: 'Allow Screenshots', defaultValue: true },
      { key: 'allowAssistant', label: 'Allow Siri', defaultValue: true },
      { key: 'requireAdminForSystemPrefs', label: 'Require admin for System Prefs', defaultValue: true },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: <Lock size={14} />,
    fields: [
      { key: 'allowEraseContentAndSettings', label: 'Allow erase device', defaultValue: false },
      { key: 'allowPasscodeModification', label: 'Allow passcode change', defaultValue: false },
      { key: 'allowAccountModification', label: 'Allow account changes', defaultValue: false },
      { key: 'allowBluetoothModification', label: 'Allow Bluetooth toggle', defaultValue: true },
      { key: 'allowAppInstallation', label: 'Allow app installation', defaultValue: true },
      { key: 'allowInAppPurchases', label: 'Allow in-app purchases', defaultValue: false },
    ],
  },
]

// ── Restriction group section ─────────────────────────────

function RestrictionGroup({
  group,
  values,
  onChange,
}: {
  group: typeof IOS_GROUPS[0]
  values: Record<string, boolean>
  onChange: (key: string, value: boolean) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-background-elevated/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-foreground-muted">{group.icon}</span>
          <span className="text-sm font-medium text-foreground">{group.label}</span>
          <Badge variant="muted" size="sm">
            {group.fields.filter(f => values[f.key] ?? f.defaultValue).length}/{group.fields.length}
          </Badge>
        </div>
        {open
          ? <ChevronUp size={15} className="text-foreground-subtle" />
          : <ChevronDown size={15} className="text-foreground-subtle" />}
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {group.fields.map(field => (
            <div key={field.key} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-foreground-muted">{field.label}</span>
              <Toggle
                checked={values[field.key] ?? field.defaultValue}
                onChange={v => onChange(field.key, v)}
                size="sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export default function ConfigGeneratorPage() {
  const { user } = useAuth()
  const isPro = user?.account?.subscription?.plan === 'pro'

  const { data: devices = [], isLoading } = useDevices()
  const saveConfig = useSaveDeviceConfig()
  const downloadConfig = useDownloadConfig()

  const appleDevices = devices.filter(d => d.type === 'ios' || d.type === 'macos')

  const [selectedId, setSelectedId] = useState<string | null>(
    appleDevices[0]?.id ?? null
  )
  const [values, setValues] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const selectedDevice = appleDevices.find(d => d.id === selectedId)
  const groups = selectedDevice?.type === 'ios' ? IOS_GROUPS : MACOS_GROUPS

  function handleChange(key: string, value: boolean) {
    setValues(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    if (!selectedDevice) return
    setSaving(true)
    try {
      await saveConfig.mutateAsync({ id: selectedDevice.id, restrictions: values })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDownload() {
    if (!selectedDevice) return
    if (!isPro && selectedDevice.type === 'ios') return

    await saveConfig.mutateAsync({ id: selectedDevice.id, restrictions: values })
    downloadConfig.mutate({
      id: selectedDevice.id,
      name: selectedDevice.name,
      type: selectedDevice.type,
    })
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="card h-20 animate-pulse bg-background-elevated" />
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
      <div>
        <h1 className="font-sora font-semibold text-2xl text-foreground">Config Generator</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Generate Apple MDM profiles to enforce restrictions on iPhone, iPad, and Mac
        </p>
      </div>

      {/* Pro gate for iOS */}
      {!isPro && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/6 border border-amber-500/20 rounded-lg">
          <Shield size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-medium text-foreground">iOS Config Generator requires Pro.</span>
            <span className="text-foreground-muted ml-1">macOS config is free. Upgrade to Pro for iPhone and iPad profiles.</span>
          </div>
        </div>
      )}

      {appleDevices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Smartphone size={20} />}
            title="No Apple devices found"
            description="Add an iPhone, iPad, or Mac in Device Setup to use the config generator."
            action={{
              label: 'Go to Device Setup',
              onClick: () => window.location.href = '/dashboard/devices',
            }}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device picker */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
              Select device
            </h2>
            {appleDevices.map(device => (
              <Card
                key={device.id}
                selected={selectedId === device.id}
                hoverable
                onClick={() => {
                  setSelectedId(device.id)
                  setValues(
                    (device.config?.restrictions as Record<string, boolean>) ?? {}
                  )
                  setSaved(false)
                }}
                padding="sm"
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    selectedId === device.id
                      ? 'bg-amber-500/15 text-amber-500'
                      : 'bg-background-overlay text-foreground-muted'
                  )}>
                    {device.type === 'ios'
                      ? <Smartphone size={16} />
                      : <Monitor size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {device.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant={device.type === 'ios' ? 'amber' : 'default'} size="sm">
                        {device.type === 'ios' ? 'iOS' : 'macOS'}
                      </Badge>
                      {device.type === 'ios' && !isPro && (
                        <Badge variant="warning" size="sm">Pro</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Restriction editor */}
          <div className="lg:col-span-2 space-y-4">
            {selectedDevice ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-foreground">
                    Restrictions for {selectedDevice.name}
                  </h2>
                  {saved && (
                    <span className="text-xs text-success flex items-center gap-1">
                      ✓ Saved
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {groups.map(group => (
                    <RestrictionGroup
                      key={group.id}
                      group={group}
                      values={values}
                      onChange={handleChange}
                    />
                  ))}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={handleSave}
                    loading={saving}
                    size="md"
                  >
                    Save settings
                  </Button>

                  <Button
                    onClick={handleDownload}
                    loading={downloadConfig.isPending}
                    disabled={
                      !isPro && selectedDevice.type === 'ios'
                    }
                    leftIcon={<Download size={14} />}
                    size="md"
                    className="flex-1"
                  >
                    {!isPro && selectedDevice.type === 'ios'
                      ? 'Pro required for iOS'
                      : `Download .mobileconfig`}
                  </Button>
                </div>

                {/* Install instructions */}
                <div className="p-4 bg-background-elevated rounded-lg border border-border space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <AlertTriangle size={12} className="text-warning" />
                    How to install on {selectedDevice.type === 'ios' ? 'iPhone/iPad' : 'Mac'}
                  </div>
                  {selectedDevice.type === 'ios' ? (
                    <ol className="text-xs text-foreground-muted space-y-1">
                      <li>1. Download the .mobileconfig file to your iPhone</li>
                      <li>2. Open Settings → General → VPN & Device Management</li>
                      <li>3. Tap the Noori profile → Install</li>
                      <li>4. Enter your device passcode when prompted</li>
                    </ol>
                  ) : (
                    <ol className="text-xs text-foreground-muted space-y-1">
                      <li>1. Download the .mobileconfig file</li>
                      <li>2. Double-click to open in System Preferences</li>
                      <li>3. Go to System Preferences → Profiles</li>
                      <li>4. Click Install and enter your password</li>
                    </ol>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-sm text-foreground-muted">
                Select a device to configure
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
