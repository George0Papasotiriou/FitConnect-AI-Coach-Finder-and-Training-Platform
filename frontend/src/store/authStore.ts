import { create } from 'zustand'
import { authApi } from '../api/auth'

export interface User {
  id: string
  name: string
  email: string
  role: 'trainee' | 'trainer' | 'admin'
  avatar?: string
  xp?: number
  level?: number
  onboardingComplete?: boolean
}

interface AuthStore {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  setToken: (token: string) => void
}

const getInitialState = () => {
  try {
    const item = localStorage.getItem('auth-storage')
    if (item) {
      const parsed = JSON.parse(item)
      return { user: parsed.user || null, token: parsed.token || null }
    }
  } catch {}
  return { user: null, token: null }
}

const initialState = getInitialState()

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: initialState.user,
  token: initialState.token,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const data = await authApi.login({ email, password })
      set({ user: data.user as User, token: data.token, isLoading: false })
      localStorage.setItem('auth-storage', JSON.stringify({ user: data.user, token: data.token }))
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },

  logout: () => {
    set({ user: null, token: null })
    localStorage.removeItem('auth-storage')
  },

  setUser: (user) => {
    set({ user })
    localStorage.setItem('auth-storage', JSON.stringify({ user, token: get().token }))
  },
  setToken: (token) => {
    set({ token })
    localStorage.setItem('auth-storage', JSON.stringify({ user: get().user, token }))
  }
}))
