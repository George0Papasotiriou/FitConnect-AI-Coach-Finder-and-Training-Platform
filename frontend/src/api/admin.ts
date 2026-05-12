import apiClient from './client'

export interface AdminStats {
  totalUsers: number
  totalTrainers: number
  totalTrainees: number
  pendingApplications: number
  totalSessions: number
  activeSessions: number
}

export interface TrainerApplication {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  bio: string
  specialties: string[]
  experience: number
  hourlyRate: number
  documents: string[]
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt?: string
  reviewNotes?: string
}

export const adminApi = {
  getStats: () =>
    apiClient.get<AdminStats>('/admin/stats').then(r => r.data),

  getApplications: (status?: string) =>
    apiClient.get<TrainerApplication[]>('/admin/applications', { params: { status } }).then(r => r.data),

  getApplicationById: (id: string) =>
    apiClient.get<TrainerApplication>(`/admin/applications/${id}`).then(r => r.data),

  approveApplication: (id: string, notes?: string) =>
    apiClient.post(`/admin/applications/${id}/approve`, { notes }).then(r => r.data),

  rejectApplication: (id: string, notes: string) =>
    apiClient.post(`/admin/applications/${id}/reject`, { notes }).then(r => r.data),

  getUsers: (params?: { role?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/users', { params }).then(r => r.data),

  banUser: (userId: string, reason: string) =>
    apiClient.post(`/admin/users/${userId}/ban`, { reason }).then(r => r.data),

  unbanUser: (userId: string) =>
    apiClient.post(`/admin/users/${userId}/unban`).then(r => r.data)
}
