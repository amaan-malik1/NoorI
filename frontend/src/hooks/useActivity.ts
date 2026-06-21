import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────

export type ActivityAction = 'allowed' | 'blocked' | 'overridden'
export type Period = 'day' | 'week' | 'month'

export interface ActivityLog {
  id: string
  domain: string
  action: ActivityAction
  categoryId: number | null
  timestamp: string
}

export interface ActivityLogsResponse {
  logs: ActivityLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  meta: {
    plan: 'free' | 'pro' | 'family'
    retentionDays: number
  }
}

export interface ChartBucket {
  bucket: string
  action: ActivityAction
  count: number
}

export interface ChartResponse {
  buckets: ChartBucket[]
  summary: {
    allowed: number
    blocked: number
    overridden: number
    total: number
  }
  period: Period
}

export interface StatsResponse {
  topBlocked: { domain: string; count: number }[]
  topAllowed: { domain: string; count: number }[]
  recentBypass: { domain: string; timestamp: string; categoryId: number | null }[]
}

// ── Hooks ─────────────────────────────────────────────────

export function useActivityLogs(params: {
  period: Period
  page: number
  limit?: number
  action?: ActivityAction | 'all'
  domain?: string
}) {
  return useQuery<ActivityLogsResponse>({
    queryKey: ['activity', 'logs', params],
    queryFn: () => {
      const query = new URLSearchParams({
        period: params.period,
        page: String(params.page),
        limit: String(params.limit ?? 50),
        ...(params.action && params.action !== 'all' && { action: params.action }),
        ...(params.domain && { domain: params.domain }),
      })
      return api.get(`/activity?${query}`).then(r => r.data.data)
    },
    placeholderData: prev => prev,
  })
}

export function useActivityChart(period: Period) {
  return useQuery<ChartResponse>({
    queryKey: ['activity', 'chart', period],
    queryFn: () =>
      api.get(`/activity/chart?period=${period}`).then(r => r.data.data),
  })
}

export function useActivityStats() {
  return useQuery<StatsResponse>({
    queryKey: ['activity', 'stats'],
    queryFn: () => api.get('/activity/stats').then(r => r.data.data),
  })
}

export function useForceSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/activity/sync').then(r => r.data),
    onSuccess: () => {
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['activity'] })
      }, 3000) // wait 3s for worker to process
    },
  })
}

export function useExportCSV(period: Period) {
  return useMutation({
    mutationFn: async () => {
      const res = await api.get(`/activity/export?period=${period}`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `noori-activity-${period}-${Date.now()}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
  })
}