import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'

export function useAuthInit() {
  const { login, logout, setLoading } = useAuthStore()

  useEffect(() => {
    async function restoreSession() {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 5000)

      try {
        const refreshRes = await api.post(`/auth/refresh`, {}, {
          signal: controller.signal,
        })
        const { accessToken } = refreshRes.data.data

        const meRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        })

        login(accessToken, meRes.data.data)
      } catch {
        // 401 = not logged in (expected on public pages)
        // Network error / timeout = treat as logged out
        logout()
      } finally {
        clearTimeout(timer)
        setLoading(false) // always unblock the UI
      }
    }

    restoreSession()
  }, [login, logout, setLoading])
}

export function useAuth() {
  return useAuthStore()
}