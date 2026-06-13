import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'

export function useAuthInit() {
  const { login, logout, setLoading } = useAuthStore()

  useEffect(() => {
    async function restoreSession() {
      try {
        // Try to refresh access token from HttpOnly cookie
        const refreshRes = await api.post('/auth/refresh')
        const { accessToken } = refreshRes.data.data

        // Fetch user with new token
        const meRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        login(accessToken, meRes.data.data)
      } catch {
        logout()
      }
    }

    restoreSession()
  }, [login, logout, setLoading])
}

export function useAuth() {
  return useAuthStore()
}
