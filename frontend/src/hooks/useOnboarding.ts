import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type OnboardingGoal = 'self' | 'parental' | 'both'
export type ProtectionLevel = 'basic' | 'balanced' | 'maximum'

export interface ProtectionPreset {
  id: ProtectionLevel
  name: string
  description: string
  categoryCount: number
  safeSearch: boolean
}

export interface ProtectionScoreItem {
  id: string
  label: string
  completed: boolean
  action: string
}

export interface ProtectionScore {
  score: number
  items: ProtectionScoreItem[]
}

export function usePresets() {
  return useQuery<ProtectionPreset[]>({
    queryKey: ['onboarding-presets'],
    queryFn: () => api.get('/onboarding/presets').then(r => r.data.data),
  })
}

export function useProtectionScore() {
  return useQuery<ProtectionScore>({
    queryKey: ['protection-score'],
    queryFn: () => api.get('/onboarding/score').then(r => r.data.data),
  })
}

export function useRunOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { goal: OnboardingGoal; level: ProtectionLevel }) =>
      api.post('/onboarding/setup', data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['protection-score'] })
      qc.invalidateQueries({ queryKey: ['policies'] })
      qc.invalidateQueries({ queryKey: ['account'] })
    },
  })
}
