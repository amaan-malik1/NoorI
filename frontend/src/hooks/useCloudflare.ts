import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────

export interface CFStatus {
  cfConnected: boolean
  cfAccountEmail: string | null
  cfAccountId: string | null
  cfGatewayId: string | null
  cfTeamName: string | null
  lastSyncAt: string | null
}

export interface ContentPolicy {
  id: string
  name: string
  blockedCategories: number[]
  blockedDomains: string[]
  allowedDomains: string[]
  safeSearchEnabled: boolean
  isActive: boolean
  cfPolicyId: string | null
  createdAt: string
  updatedAt: string
}

// ── Hooks ─────────────────────────────────────────────────

export function useCFStatus() {
  return useQuery<CFStatus>({
    queryKey: ['cf-status'],
    queryFn: () => api.get('/cloudflare/status').then(r => r.data.data),
  })
}

export function usePolicies() {
  return useQuery<ContentPolicy[]>({
    queryKey: ['policies'],
    queryFn: () => api.get('/cloudflare/policies').then(r => r.data.data),
  })
}

export function useVerifyCFCredentials() {
  return useMutation({
    mutationFn: (data: { email: string; globalKey: string }) =>
      api.post('/cloudflare/verify', data).then(r => r.data.data),
  })
}

export function useConnectCF() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; globalKey: string; cfAccountId: string }) =>
      api.post('/cloudflare/connect', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cf-status'] })
      qc.invalidateQueries({ queryKey: ['account'] })
      qc.invalidateQueries({ queryKey: ['protection-score'] })
    },
  })
}

export function useDisconnectCF() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/cloudflare/disconnect').then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cf-status'] })
      qc.invalidateQueries({ queryKey: ['account'] })
    },
  })
}

export function useSavePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<ContentPolicy>) =>
      api.post('/cloudflare/policies', data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] })
      qc.invalidateQueries({ queryKey: ['protection-score'] })
    },
  })
}

export function useDeletePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/cloudflare/policies/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] })
    },
  })
}

export function useApplyPreset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (preset: 'basic' | 'balanced' | 'maximum') =>
      api.post('/onboarding/preset', { preset }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] })
      qc.invalidateQueries({ queryKey: ['protection-score'] })
    },
  })
}
