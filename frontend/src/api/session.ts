import apiClient from './client'

export interface Session {
  id: string
  trainerId: string
  traineeId: string
  trainerName: string
  traineeName: string
  trainerAvatar?: string
  traineeAvatar?: string
  type: 'video' | 'audio' | 'in-person'
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  scheduledAt: string
  duration?: number
  notes?: string
  rating?: number
  review?: string
}

export const sessionApi = {
  getSessions: () =>
    apiClient.get<Session[]>('/sessions').then(r => r.data),

  getSessionById: (id: string) =>
    apiClient.get<Session>(`/sessions/${id}`).then(r => r.data),

  getSession: (id: string) =>
    apiClient.get<Session>(`/sessions/${id}`).then(r => r.data),

  createSession: (data: Partial<Session>) =>
    apiClient.post<Session>('/sessions', data).then(r => r.data),

  startSession: (id: string) =>
    apiClient.post(`/sessions/${id}/start`).then(r => r.data),

  endSession: (id: string) =>
    apiClient.post(`/sessions/${id}/end`).then(r => r.data),

  cancelSession: (id: string, reason?: string) =>
    apiClient.post(`/sessions/${id}/cancel`, { reason }).then(r => r.data),

  rateSession: (id: string, rating: number, review?: string) =>
    apiClient.post(`/sessions/${id}/rate`, { rating, review }).then(r => r.data)
}
