import apiClient from './client'

export interface TrainerProfile {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  bio: string
  specialties: string[]
  experience: number
  hourlyRate: number
  rating: number
  totalReviews: number
  credentials: string[]
  isAvailable: boolean
  applicationStatus: 'pending' | 'approved' | 'rejected'
}

export interface TrainerStats {
  totalClients: number
  sessionsThisWeek: number
  averageRating: number
  earnings: number
}

export interface ClientRequest {
  id: string
  trainee: {
    id: string
    name: string
    avatar?: string
    fitnessLevel: string
    goals: string[]
  }
  createdAt: string
  status: 'pending' | 'accepted' | 'rejected'
}

export interface TrainerApplicationPayload {
  bio: string
  description: string
  specialties: string[]
  experience: number
  hourlyRate: number
  certificates?: string[]
}

export const trainerApi = {
  getProfile: () =>
    apiClient.get<TrainerProfile>('/trainer/profile').then(r => r.data),

  updateProfile: (data: Partial<TrainerProfile>) =>
    apiClient.put<TrainerProfile>('/trainer/profile', data).then(r => r.data),

  getStats: () =>
    apiClient.get<TrainerStats>('/trainer/stats').then(r => r.data),

  getClients: () =>
    apiClient.get<ClientRequest[]>('/trainer/clients').then(r => r.data),

  acceptClient: (requestId: string) =>
    apiClient.post(`/trainer/clients/${requestId}/accept`).then(r => r.data),

  rejectClient: (requestId: string) =>
    apiClient.post(`/trainer/clients/${requestId}/reject`).then(r => r.data),

  getSessions: () =>
    apiClient.get('/trainer/sessions').then(r => r.data),

  submitApplication: (data: TrainerApplicationPayload) =>
    apiClient.post('/trainer/application', data).then(r => r.data),

  uploadDocument: (file: File) => {
    const formData = new FormData()
    formData.append('document', file)
    return apiClient.post('/trainer/upload-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data)
  },

  search: (params: {
    specialty?: string
    minRating?: number
    maxRate?: number
    query?: string
    page?: number
    limit?: number
  }) =>
    apiClient.get('/trainers/search', { params }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get<TrainerProfile>(`/trainers/${id}`).then(r => r.data),

  getReviews: (id: string) =>
    apiClient.get(`/trainers/${id}/reviews`).then(r => r.data)
}
