import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────

export interface AccountData {
  id: string
  isLocked: boolean
  lockoutEnabled: boolean
  cfConnected: boolean
  cfAccountEmail: string | null
  cfAccountId: string | null
  cfGatewayId: string | null
  lastSyncAt: string | null
  subscription: { plan: 'free' | 'pro'; currentPeriodEnd: string | null }
  _count: { policies: number; devices: number }
}

export interface BillingStatus {
  plan: 'free' | 'pro'
  gateway: 'stripe' | 'razorpay' | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  pricing: { usd: number; inr: number }
  gatewaysAvailable: { stripe: boolean; razorpay: boolean }
}

// ── Account hooks ─────────────────────────────────────────

export function useAccount() {
  return useQuery<AccountData>({
    queryKey: ['account'],
    queryFn: () => api.get('/account').then(r => r.data.data),
  })
}

export function useSetPin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { pin: string; currentPin?: string }) =>
      api.post('/account/pin', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account'] }),
  })
}

export function useLockProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/account/lock').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUnlockProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (pin: string) =>
      api.post('/account/unlock', { pin }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['account'] })
      qc.invalidateQueries({ queryKey: ['me'] })
    },
  })
}

export function useUpdateLockingPrefs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (lockoutEnabled: boolean) =>
      api.patch('/account/locking-prefs', { lockoutEnabled }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account'] }),
  })
}

export function useUpdateProfile() {
  return useMutation({
    mutationFn: (data: { email?: string; currentPassword?: string; newPassword?: string }) =>
      api.patch('/auth/profile', data).then(r => r.data),
  })
}

// ── Billing hooks ─────────────────────────────────────────

export function useBilling() {
  return useQuery<BillingStatus>({
    queryKey: ['billing'],
    queryFn: () => api.get('/billing').then(r => r.data.data),
  })
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: { gateway: 'stripe' | 'razorpay'; name?: string }) =>
      api.post('/billing/checkout', data).then(r => r.data.data),
  })
}

export function useCancelSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/billing/cancel').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing'] }),
  })
}

// ── CF sync ───────────────────────────────────────────────

export function useSyncCFAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/activity/sync').then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account'] }),
  })
}
