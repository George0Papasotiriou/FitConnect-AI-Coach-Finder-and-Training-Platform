/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import apiClient from './client'
import type { AnalyticsResponse, EditorialResult, LockedContext } from './analytics'

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
    apiClient.post(`/admin/users/${userId}/unban`).then(r => r.data),

  queryAnalytics: (question: string, conversationId: string, lockedContext?: LockedContext | null) =>
    apiClient
      .post<AnalyticsResponse>('/analytics/query', { question, conversationId, lockedContext })
      .then(r => r.data),

  analyticsSuggestions: (conversationId: string, lockedContext?: LockedContext | null) =>
    apiClient
      .get<{ suggestions: string[] }>('/analytics/suggestions', {
        params: {
          conversationId,
          lockedContext: lockedContext ? JSON.stringify(lockedContext) : undefined,
        },
      })
      .then(r => r.data.suggestions),

  resetAnalyticsConversation: (conversationId: string) =>
    apiClient.post(`/analytics/conversations/${conversationId}/reset`).then(r => r.data),

  editorial: (conversationId: string) =>
    apiClient.post<EditorialResult>('/analytics/editorial', { conversationId }).then(r => r.data),
}
