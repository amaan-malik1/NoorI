import { create } from 'zustand'

export interface AuthUser {
  id: string
  email: string
  accountId: string
  emailVerified: boolean
  account?: {
    id: string
    isLocked: boolean
    cfConnected: boolean
    subscription?: { plan: 'free' | 'pro' | 'family' }
  }
}

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setAccessToken: (token: string) => void
  setUser: (user: AuthUser) => void
  login: (token: string, user: AuthUser) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAccessToken: (token) =>
    set({ accessToken: token, isAuthenticated: true }),

  setUser: (user) =>
    set({ user }),

  login: (token, user) =>
    set({
      accessToken: token,
      user,
      isAuthenticated: true,
      isLoading: false,
    }),

  logout: () =>
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    }),

  setLoading: (loading) =>
    set({ isLoading: loading }),
}))