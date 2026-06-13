import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────

export type DeviceType = 'ios' | 'macos' | 'android' | 'windows' | 'router'

export interface Device {
  id: string
  name: string
  type: DeviceType
  isActive: boolean
  createdAt: string
  config?: {
    id: string
    updatedAt: string
    restrictions: Record<string, unknown>
  }
}

// ── Hooks ─────────────────────────────────────────────────

export function useDevices() {
  return useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: () => api.get('/devices').then(r => r.data.data),
  })
}

export function useDevice(id: string) {
  return useQuery<Device>({
    queryKey: ['devices', id],
    queryFn: () => api.get(`/devices/${id}`).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useCreateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; type: DeviceType }) =>
      api.post('/devices', data).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['protection-score'] })
    },
  })
}

export function useUpdateDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; isActive?: boolean }) =>
      api.patch(`/devices/${id}`, data).then(r => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['devices', vars.id] })
    },
  })
}

export function useDeleteDevice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/devices/${id}`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] })
      qc.invalidateQueries({ queryKey: ['protection-score'] })
    },
  })
}

export function useSaveDeviceConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, restrictions }: { id: string; restrictions: Record<string, unknown> }) =>
      api.post(`/devices/${id}/config`, { restrictions }).then(r => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['devices', vars.id] })
      qc.invalidateQueries({ queryKey: ['devices'] })
    },
  })
}

export function useDownloadConfig() {
  return useMutation({
    mutationFn: async ({ id, name, type }: { id: string; name: string; type: string }) => {
      const res = await api.get(`/devices/${id}/download`, {
        responseType: 'blob',
      })
      // Trigger browser download
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `Noori-${type}-${name.replace(/\s+/g, '-').toLowerCase()}.mobileconfig`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
  })
}
