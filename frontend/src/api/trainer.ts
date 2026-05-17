/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import apiClient from './client'

export interface TrainerProfile {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  bio: string
  description?: string
  specialties: string[]
  experience: number
  hourlyRate: number
  rating: number
  totalReviews: number
  credentials: string[]
  isAvailable: boolean
  applicationStatus: 'pending' | 'approved' | 'rejected'
  // Extended questionnaire fields
  age?: number
  gender?: string
  languages?: string[]
  trainingPhilosophy?: string
  availabilityHours?: string
  certifications?: string[]
  coachingStyle?: string[]
  onboardingComplete?: boolean
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
    age?: number
    gender?: string
    weight?: number
    height?: number
    medicalConditions?: string[]
    injuredLimbs?: string[]
    injuryDescription?: string
    trainingMotivation?: string
    accessibilityNeeds?: string[]
    preferredWorkoutTypes?: string[]
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
  trainingPhilosophy?: string
  // Questionnaire fields
  age?: number
  gender?: string
  languages?: string[]
  availabilityHours?: string
  certifications?: string[]
  coachingStyle?: string[]
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
