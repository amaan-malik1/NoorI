import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Lock, Cloud, CreditCard, Shield,
  CheckCircle2, AlertTriangle, RefreshCw,
  Eye, EyeOff, ExternalLink, Zap, LogOut,
  KeyRound, Settings, ChevronRight, Info,
  Users, Sparkles, Smartphone, FileText, Headset
} from 'lucide-react'
import {
  useAccount, useSetPin, useLockProfile, useUnlockProfile,
  useUpdateLockingPrefs, useUpdateProfile, useBilling,
  useCreateCheckout, useCancelSubscription, useSyncCFAccount,
  useVerifyRazorpayPayment, type PlanId, type BillingInterval
} from '@/hooks/useAccount'
import { useCFStatus, useDisconnectCF } from '@/hooks/useCloudflare'
import { useAuth } from '@/hooks/useAuth'
import { getErrorMessage, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Toggle from '@/components/ui/Toggle'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import FaqSection from '@/components/faq/FaqSection'

// ── Tab config ────────────────────────────────────────────

const TABS = [
  { id: 'profile', label: 'Profile', icon: <User size={15} /> },
  { id: 'locking', label: 'Locking', icon: <Lock size={15} /> },
  { id: 'cloudflare', label: 'Cloudflare', icon: <Cloud size={15} /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard size={15} /> },
]

// ── Section wrapper ───────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-foreground-muted">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────
function Divider() {
  return <div className="border-t border-border" />
}

// ── Profile Tab ───────────────────────────────────────────

function ProfileTab() {
  const { user } = useAuth()
  const updateProfile = useUpdateProfile()
  const [emailForm, setEmailForm] = useState({ email: user?.email ?? '', error: '', success: '' })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '', error: '', success: '' })

  async function handleEmailSave() {
    setEmailForm(p => ({ ...p, error: '', success: '' }))
    try {
      await updateProfile.mutateAsync({ email: emailForm.email })
      setEmailForm(p => ({ ...p, success: 'Verification email sent to new address' }))
    } catch (err) {
      setEmailForm(p => ({ ...p, error: getErrorMessage(err) }))
    }
  }

  async function handlePasswordSave() {
    if (pwForm.next !== pwForm.confirm) {
      setPwForm(p => ({ ...p, error: 'Passwords do not match' }))
      return
    }
    setPwForm(p => ({ ...p, error: '', success: '' }))
    try {
      await updateProfile.mutateAsync({
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
      })
      setPwForm({ current: '', next: '', confirm: '', error: '', success: 'Password updated successfully' })
    } catch (err) {
      setPwForm(p => ({ ...p, error: getErrorMessage(err) }))
    }
  }

  return (
    <div className="space-y-8">
      <Section title="Email address" description="Update your login email. You'll need to verify the new address.">
        <Card padding="md" className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={emailForm.email}
            onChange={e => setEmailForm(p => ({ ...p, email: e.target.value }))}
            leftIcon={<User size={14} />}
          />
          {emailForm.error && (
            <p className="text-xs text-danger-text">{emailForm.error}</p>
          )}
          {emailForm.success && (
            <p className="text-xs text-success flex items-center gap-1.5">
              <CheckCircle2 size={12} /> {emailForm.success}
            </p>
          )}
          <Button
            size="sm"
            onClick={handleEmailSave}
            loading={updateProfile.isPending}
            disabled={emailForm.email === user?.email}
          >
            Save email
          </Button>
        </Card>
      </Section>

      <Divider />

      <Section title="Password" description="Choose a strong password with uppercase letters and numbers.">
        <Card padding="md" className="space-y-4">
          <Input
            label="Current password"
            type="password"
            value={pwForm.current}
            onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
            leftIcon={<Lock size={14} />}
          />
          <Input
            label="New password"
            type="password"
            value={pwForm.next}
            onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
            leftIcon={<Lock size={14} />}
            hint="Min. 8 characters, uppercase, and number"
          />
          <Input
            label="Confirm new password"
            type="password"
            value={pwForm.confirm}
            onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
            leftIcon={<Lock size={14} />}
          />
          {pwForm.error && (
            <p className="text-xs text-danger-text">{pwForm.error}</p>
          )}
          {pwForm.success && (
            <p className="text-xs text-success flex items-center gap-1.5">
              <CheckCircle2 size={12} /> {pwForm.success}
            </p>
          )}
          <Button
            size="sm"
            onClick={handlePasswordSave}
            loading={updateProfile.isPending}
            disabled={!pwForm.current || !pwForm.next}
          >
            Update password
          </Button>
        </Card>
      </Section>
    </div>
  )
}

// ── Locking Tab ───────────────────────────────────────────

function LockingTab() {
  const { data: account } = useAccount()
  const setPin = useSetPin()
  const lockProfile = useLockProfile()
  const unlockProfile = useUnlockProfile()
  const updatePrefs = useUpdateLockingPrefs()

  const [pinForm, setPinForm] = useState({ pin: '', currentPin: '', confirm: '', error: '', success: '' })
  const [unlockPin, setUnlockPin] = useState('')
  const [unlockError, setUnlockError] = useState('')

  async function handleSetPin() {
    if (pinForm.pin !== pinForm.confirm) {
      setPinForm(p => ({ ...p, error: 'PINs do not match' }))
      return
    }
    setPinForm(p => ({ ...p, error: '', success: '' }))
    try {
      await setPin.mutateAsync({
        pin: pinForm.pin,
        currentPin: pinForm.currentPin || undefined,
      })
      setPinForm({ pin: '', currentPin: '', confirm: '', error: '', success: 'PIN set successfully' })
    } catch (err) {
      setPinForm(p => ({ ...p, error: getErrorMessage(err) }))
    }
  }

  async function handleUnlock() {
    setUnlockError('')
    try {
      await unlockProfile.mutateAsync(unlockPin)
      setUnlockPin('')
    } catch (err) {
      setUnlockError(getErrorMessage(err))
    }
  }

  return (
    <div className="space-y-8">
      {/* Lock status */}
      <Section title="Profile lock status">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${account?.isLocked ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                }`}>
                <Lock size={16} />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {account?.isLocked ? 'Profile is locked' : 'Profile is unlocked'}
                </div>
                <div className="text-xs text-foreground-muted">
                  {account?.isLocked
                    ? 'Enter your PIN to make changes'
                    : 'Click lock to prevent unauthorized changes'}
                </div>
              </div>
            </div>
            {account?.isLocked ? (
              <Badge variant="warning" dot>Locked</Badge>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Lock size={13} />}
                onClick={() => lockProfile.mutate()}
                loading={lockProfile.isPending}
                disabled={!account?.hasLockPin}
              >
                Lock now
              </Button>
            )}
          </div>

          {/* Unlock form */}
          {account?.isLocked && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              <Input
                label="Enter PIN to unlock"
                type="password"
                placeholder="4-8 digit PIN"
                value={unlockPin}
                onChange={e => setUnlockPin(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                leftIcon={<KeyRound size={14} />}
              />
              {unlockError && (
                <p className="text-xs text-danger-text">{unlockError}</p>
              )}
              <Button
                size="sm"
                onClick={handleUnlock}
                loading={unlockProfile.isPending}
                disabled={!unlockPin}
              >
                Unlock profile
              </Button>
            </div>
          )}

          {!account?.hasLockPin && !account?.isLocked && (
            <p className="text-xs text-foreground-muted mt-3 flex items-center gap-1.5">
              <Info size={12} />
              Set a PIN below to enable locking
            </p>
          )}
        </Card>
      </Section>

      <Divider />

      {/* Set PIN */}
      <Section
        title={account?.hasLockPin ? 'Change PIN' : 'Set a lock PIN'}
        description="A 4-8 digit PIN that protects your NoorI settings from unauthorized changes."
      >
        <Card padding="md" className="space-y-4">
          {account?.hasLockPin && (
            <Input
              label="Current PIN"
              type="password"
              placeholder="Your current PIN"
              value={pinForm.currentPin}
              onChange={e => setPinForm(p => ({ ...p, currentPin: e.target.value }))}
              leftIcon={<KeyRound size={14} />}
            />
          )}
          <Input
            label="New PIN"
            type="password"
            placeholder="4-8 digits"
            value={pinForm.pin}
            onChange={e => setPinForm(p => ({ ...p, pin: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
            leftIcon={<KeyRound size={14} />}
            hint="Numbers only, 4-8 digits"
          />
          <Input
            label="Confirm PIN"
            type="password"
            placeholder="Repeat PIN"
            value={pinForm.confirm}
            onChange={e => setPinForm(p => ({ ...p, confirm: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
            leftIcon={<KeyRound size={14} />}
          />
          {pinForm.error && <p className="text-xs text-danger-text">{pinForm.error}</p>}
          {pinForm.success && (
            <p className="text-xs text-success flex items-center gap-1.5">
              <CheckCircle2 size={12} /> {pinForm.success}
            </p>
          )}
          <Button size="sm" onClick={handleSetPin} loading={setPin.isPending} disabled={!pinForm.pin || !pinForm.confirm}>
            {account?.hasLockPin ? 'Change PIN' : 'Set PIN'}
          </Button>
        </Card>
      </Section>

      <Divider />

      {/* Locking preferences */}
      <Section title="Locking preferences">
        <Card padding="md">
          <Toggle
            checked={account?.lockoutEnabled ?? true}
            onChange={v => updatePrefs.mutate(v)}
            label="Enable profile locking"
            description="When disabled, the lock button is hidden and the profile stays unlocked."
          />
        </Card>
      </Section>
    </div>
  )
}

// ── Cloudflare Tab ────────────────────────────────────────

function CloudflareTab() {
  const { data: cfStatus } = useCFStatus()
  const { data: account } = useAccount()
  const disconnectCF = useDisconnectCF()
  const syncCF = useSyncCFAccount()
  const navigate = useNavigate()
  const [disconnectConfirm, setDisconnectConfirm] = useState(false)

  return (
    <div className="space-y-8">
      {/* Connection status */}
      <Section title="Cloudflare connection" description="Manage your Cloudflare Zero Trust account connection.">
        <Card padding="md" className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfStatus?.cfConnected ? 'bg-success/10 text-success' : 'bg-border text-foreground-subtle'
                }`}>
                <Cloud size={16} />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {cfStatus?.cfConnected ? 'Connected' : 'Not connected'}
                </div>
                <div className="text-xs text-foreground-muted">
                  {cfStatus?.cfAccountEmail ?? 'No account linked'}
                </div>
              </div>
            </div>
            <Badge variant={cfStatus?.cfConnected ? 'success' : 'muted'} dot>
              {cfStatus?.cfConnected ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          {cfStatus?.cfConnected && account?.lastSyncAt && (
            <div className="text-xs text-foreground-subtle">
              Last synced: {formatDate(account.lastSyncAt)}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!cfStatus?.cfConnected ? (
              <Button
                size="sm"
                onClick={() => navigate('/dashboard/cloudflare/connect')}
                leftIcon={<Zap size={13} />}
              >
                Connect Cloudflare
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => syncCF.mutate()}
                  loading={syncCF.isPending}
                  leftIcon={<RefreshCw size={13} />}
                >
                  Sync account
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDisconnectConfirm(true)}
                >
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {/* Disconnect confirm */}
          <AnimatePresence>
            {disconnectConfirm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-danger/20 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-danger flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground-muted">
                      Disconnecting will remove all content filtering. Your devices will no longer be protected until you reconnect.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setDisconnectConfirm(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => disconnectCF.mutate()}
                      loading={disconnectCF.isPending}
                    >
                      Yes, disconnect
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </Section>

      <Divider />

      {/* Gateway info */}
      {cfStatus?.cfConnected && (
        <Section title="Gateway details" description="Technical details about your Cloudflare Zero Trust setup.">
          <Card padding="md" className="space-y-3">
            {[
              { label: 'Account ID', value: cfStatus.cfAccountId ?? '—' },
              { label: 'Gateway ID', value: cfStatus.cfGatewayId ?? '—' },
              {
                label: 'DoH URL',
                value: cfStatus.cfGatewayId
                  ? `https://${cfStatus.cfGatewayId}.cloudflare-gateway.com/dns-query`
                  : '—',
                mono: true,
              },
            ].map(item => (
              <div key={item.label} className="flex items-start justify-between gap-4">
                <span className="text-xs text-foreground-muted flex-shrink-0">{item.label}</span>
                <span className={`text-xs text-right break-all ${item.mono ? 'font-mono text-amber-500' : 'text-foreground'
                  }`}>
                  {item.value}
                </span>
              </div>
            ))}
          </Card>
        </Section>
      )}

      {/* App preferences note */}
      <Section title="Cloudflare One App" description="Settings for the Cloudflare WARP / Cloudflare One client on your devices.">
        <Card padding="md" className="space-y-3">
          {[
            {
              label: 'Filtering mode',
              value: 'DoH (DNS only)',
              hint: 'WARP mode requires certificate installation on all devices',
            },
            {
              label: 'Auto-connect',
              value: 'Enabled',
              hint: 'App automatically connects when device starts',
            },
          ].map(item => (
            <div key={item.label} className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-foreground">{item.label}</div>
                <div className="text-xs text-foreground-muted">{item.hint}</div>
              </div>
              <Badge variant="muted" size="sm">{item.value}</Badge>
            </div>
          ))}

          <div className="pt-2 border-t border-border">
            <a
              href="https://developers.cloudflare.com/cloudflare-one/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
            >
              Cloudflare One docs <ExternalLink size={11} />
            </a>
          </div>
        </Card>
      </Section>
    </div>
  )
}

// ── Billing Tab 

const PLAN_ICON: Record<PlanId, React.ReactNode> = {
  free: <Shield size={18} />,
  pro: <Zap size={18} />,
  family: <Users size={18} />,
}

const PLAN_FEATURE_ROWS: { key: string; label: string }[] = [
  { key: 'maxDevices', label: 'Devices' },
  { key: 'maxPolicies', label: 'Content policies' },
  { key: 'logRetentionDays', label: 'Activity history' },
  { key: 'iosConfigGenerator', label: 'iOS config generator' },
  { key: 'macosConfigGenerator', label: 'macOS config generator' },
  { key: 'policyScheduling', label: 'Time-based scheduling' },
  { key: 'timeLock', label: 'Time-lock profile' },
  { key: 'scheduledAutoLock', label: 'Scheduled auto-lock' },
  { key: 'bypassEmailAlerts', label: 'Bypass email alerts' },
]

function formatFeatureValue(plan: import('@/hooks/useAccount').PlanLimits, key: string): string {
  const value = (plan as unknown as Record<string, unknown>)[key]
  if (key === 'maxDevices' || key === 'maxPolicies') {
    return value === null ? 'Unlimited' : String(value)
  }
  if (key === 'logRetentionDays') {
    return `${value} days`
  }
  return value ? '✓' : '-'
}

// ── Single plan card ───────────────────────────────────────

function PlanCard({
  plan,
  interval,
  isCurrent,
  gatewaysAvailable,
  onCheckout,
  checkoutLoading,
}: {
  plan: import('@/hooks/useAccount').PlanLimits
  interval: BillingInterval
  isCurrent: boolean
  gatewaysAvailable: { stripe: boolean; razorpay: boolean }
  onCheckout: (gateway: 'stripe' | 'razorpay') => void
  checkoutLoading: boolean
}) {
  const price = interval === 'yearly' ? plan.priceYearly : plan.priceMonthly
  const monthlyEquivalent = interval === 'yearly' ? (plan.priceYearly / 12).toFixed(2) : null
  const isFamily = plan.id === 'family'

  return (
    <Card
      padding="lg"
      className={`relative space-y-5 ${isFamily ? 'border-amber-500/30' : ''} ${isCurrent ? 'ring-1 ring-success/30' : ''}`}
    >
      {isFamily && !isCurrent && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge variant="amber" size="sm">Most popular</Badge>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isFamily ? 'bg-amber-500/15 text-amber-500' : 'bg-background-overlay text-foreground-muted'
          }`}>
          {PLAN_ICON[plan.id]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-foreground">{plan.name}</span>
            {isCurrent && <Badge variant="success" size="sm">Current plan</Badge>}
          </div>
          <p className="text-xs text-foreground-muted">{plan.tagline}</p>
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-foreground">${price}</span>
          <span className="text-sm text-foreground-muted">/{interval === 'yearly' ? 'yr' : 'mo'}</span>
        </div>
        {monthlyEquivalent && (
          <p className="text-xs text-foreground-subtle mt-0.5">
            ≈ ${monthlyEquivalent}/mo · billed yearly · save 20%
          </p>
        )}
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        {PLAN_FEATURE_ROWS.map(row => (
          <div key={row.key} className="flex items-center justify-between">
            <span className="text-xs text-foreground-muted">{row.label}</span>
            <span className="text-xs font-medium text-foreground">
              {formatFeatureValue(plan, row.key)}
            </span>
          </div>
        ))}
      </div>

      {!isCurrent && (
        <div className="space-y-2 pt-2">
          {gatewaysAvailable.stripe && (
            <Button
              onClick={() => onCheckout('stripe')}
              loading={checkoutLoading}
              className="w-full"
              size="sm"
              rightIcon={<ExternalLink size={12} />}
            >
              Pay with Card
            </Button>
          )}
          {gatewaysAvailable.razorpay && (
            <Button
              variant={gatewaysAvailable.stripe ? 'secondary' : 'primary'}
              onClick={() => onCheckout('razorpay')}
              loading={checkoutLoading}
              className="w-full"
              size="sm"
            >
              Pay with UPI / Card (India)
            </Button>
          )}
          {!gatewaysAvailable.stripe && !gatewaysAvailable.razorpay && (
            <p className="text-xs text-foreground-subtle text-center py-2">
              Payments aren't configured for this plan yet
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Billing tab ───────────────────────────────────────────

function BillingTab() {
  const { data: billing, isLoading } = useBilling()
  const { user } = useAuth()
  const createCheckout = useCreateCheckout()
  const verifyPayment = useVerifyRazorpayPayment()
  const cancelSub = useCancelSubscription()
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [checkoutPlan, setCheckoutPlan] = useState<'pro' | 'family' | null>(null)

  const currentPlan = billing?.plan ?? 'free'

  async function handleCheckout(plan: 'pro' | 'family', gateway: 'stripe' | 'razorpay') {
    setCheckoutError('')
    setCheckoutPlan(plan)
    try {
      const result = await createCheckout.mutateAsync({
        gateway,
        plan,
        interval,
        name: user?.email ?? '',
      })

      if (result.gateway === 'stripe' && result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }

      // Razorpay — open checkout widget, verify on success
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      document.body.appendChild(script)
      script.onload = () => {
        const rzp = new (window as unknown as {
          Razorpay: new (opts: unknown) => { open: () => void }
        }).Razorpay({
          key: result.keyId,
          subscription_id: result.subscriptionId,
          name: 'NoorI',
          description: `${billing?.plans[plan]?.name ?? plan} Plan — ${interval === 'yearly' ? 'Yearly' : 'Monthly'}`,
          prefill: { email: user?.email },
          theme: { color: '#F5A623' },
          handler: async (response: {
            razorpay_payment_id: string
            razorpay_subscription_id: string
            razorpay_signature: string
          }) => {
            try {
              await verifyPayment.mutateAsync({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                plan,
                interval,
              })
              window.location.href = '/dashboard/settings?tab=billing&success=1'
            } catch (err) {
              setCheckoutError(
                'Payment succeeded but verification failed. Contact support with payment ID: ' +
                response.razorpay_payment_id
              )
            }
          },
        })
        rzp.open()
      }
    } catch (err) {
      setCheckoutError(getErrorMessage(err))
    } finally {
      setCheckoutPlan(null)
    }
  }

  if (isLoading || !billing) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 mx-auto animate-pulse bg-background-elevated rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-96 animate-pulse bg-background-elevated rounded-lg" />
          <div className="h-96 animate-pulse bg-background-elevated rounded-lg" />
        </div>
      </div>
    )
  }

  const proPlan = billing.plans.pro
  const familyPlan = billing.plans.family

  return (
    <div className="space-y-8">
      {/* Current plan summary */}
      <Section title="Current plan">
        <Card padding="md" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${currentPlan !== 'free' ? 'bg-amber-500/15 text-amber-500' : 'bg-background-overlay text-foreground-muted'
                }`}>
                {PLAN_ICON[currentPlan]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {billing.plans[currentPlan].name} Plan
                  </span>
                  {currentPlan !== 'free' && <Badge variant="amber">Active</Badge>}
                </div>
                <div className="text-xs text-foreground-muted">
                  {currentPlan !== 'free' && billing.currentPeriodEnd
                    ? `Renews ${formatDate(billing.currentPeriodEnd)} · ${billing.billingInterval}`
                    : 'Free forever — upgrade anytime for more devices and features'}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {currentPlan === 'free' || true ? (
        <>
          <Divider />
          <Section
            title={currentPlan === 'free' ? 'Upgrade your plan' : 'Plans'}
            description="One price for everyone, billed in USD."
          >
            <div className="space-y-5">
              {checkoutError && (
                <p className="text-sm text-danger-text bg-danger/10 border border-danger/20 rounded-md px-3 py-2">
                  {checkoutError}
                </p>
              )}

              {/* Monthly / yearly toggle */}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center gap-1 p-1 bg-background-overlay rounded-lg border border-border">
                  <button
                    onClick={() => setInterval('monthly')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${interval === 'monthly'
                      ? 'bg-amber-500 text-background'
                      : 'text-foreground-muted hover:text-foreground'
                      }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setInterval('yearly')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${interval === 'yearly'
                      ? 'bg-amber-500 text-background'
                      : 'text-foreground-muted hover:text-foreground'
                      }`}
                  >
                    Yearly
                    <Badge variant={interval === 'yearly' ? 'muted' : 'success'} size="sm">
                      Save 20%
                    </Badge>
                  </button>
                </div>
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PlanCard
                  plan={proPlan}
                  interval={interval}
                  isCurrent={currentPlan === 'pro'}
                  gatewaysAvailable={billing.gatewaysAvailable}
                  onCheckout={gateway => handleCheckout('pro', gateway)}
                  checkoutLoading={createCheckout.isPending && checkoutPlan === 'pro'}
                />
                <PlanCard
                  plan={familyPlan}
                  interval={interval}
                  isCurrent={currentPlan === 'family'}
                  gatewaysAvailable={billing.gatewaysAvailable}
                  onCheckout={gateway => handleCheckout('family', gateway)}
                  checkoutLoading={createCheckout.isPending && checkoutPlan === 'family'}
                />
              </div>

              {!billing.gatewaysAvailable.stripe && !billing.gatewaysAvailable.razorpay && (
                <p className="text-xs text-foreground-subtle text-center">
                  Payments aren't set up yet — upgrades will be available soon.
                </p>
              )}
            </div>
          </Section>
        </>
      ) : null}

      {/* Manage subscription — only shown for paid plans */}
      {currentPlan !== 'free' && (
        <>
          <Divider />
          <Section title="Manage subscription">
            <Card padding="md" className="space-y-4">
              <div className="text-sm text-foreground-muted">
                Payment method: <span className="text-foreground capitalize">{billing.gateway ?? '—'}</span>
              </div>

              {billing.cancelAtPeriodEnd ? (
                <div className="flex items-start gap-2 p-3 bg-warning/8 border border-warning/20 rounded-md">
                  <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground-muted">
                    Your subscription will cancel on{' '}
                    <strong className="text-foreground">
                      {billing.currentPeriodEnd ? formatDate(billing.currentPeriodEnd) : '—'}
                    </strong>. You'll keep {billing.plans[currentPlan].name} access until then.
                  </p>
                </div>
              ) : (
                <>
                  <Button variant="danger" size="sm" onClick={() => setCancelConfirm(true)}>
                    Cancel subscription
                  </Button>

                  <AnimatePresence>
                    {cancelConfirm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 border-t border-border space-y-3">
                          <p className="text-xs text-foreground-muted">
                            You'll keep {billing.plans[currentPlan].name} access until the end of your
                            current billing period.
                          </p>
                          <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setCancelConfirm(false)}>
                              Keep {billing.plans[currentPlan].name}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => cancelSub.mutate()}
                              loading={cancelSub.isPending}
                            >
                              Confirm cancel
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </Card>
          </Section>
        </>
      )}

      <Divider />
      <Section title="Questions about billing">
        <FaqSection category="billing" showFilters={false} title="" />
      </Section>
    </div>
  )
}

// ── Main Settings page ────────────────────────────────────

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') ?? 'profile'

  function setTab(tab: string) {
    setSearchParams({ tab })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-sora font-semibold text-2xl text-foreground">Settings</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Manage your account, security, and billing preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab sidebar */}
        <div className="space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all text-left ${activeTab === tab.id
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'text-foreground-muted hover:text-foreground hover:bg-background-elevated'
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'locking' && <LockingTab />}
              {activeTab === 'cloudflare' && <CloudflareTab />}
              {activeTab === 'billing' && <BillingTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}