import apiClient from './client'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  role: 'trainee' | 'trainer'
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    name: string
    email: string
    role: string
    avatar?: string
    xp?: number
    level?: number
    onboardingComplete?: boolean
  }
}

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data).then(r => r.data),

  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data).then(r => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then(r => r.data),

  me: () =>
    apiClient.get<AuthResponse['user']>('/auth/me').then(r => r.data),

  refreshToken: () =>
    apiClient.post<{ token: string }>('/auth/refresh').then(r => r.data)
}
