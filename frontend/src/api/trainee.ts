/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import apiClient from './client'

export interface TraineeProfile {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  age?: number
  gender?: string
  weight?: number
  height?: number
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced'
  goals: string[]
  accessibilityNeeds: string[]
  preferredWorkoutTypes: string[]
  medicalConditions: string[]
  injuredLimbs: string[]
  injuryDescription?: string
  trainingMotivation?: string
  currentCoach?: {
    id: string
    name: string
    avatar?: string
  }
  onboardingComplete: boolean
}

export interface TraineeStats {
  totalSessions: number
  currentStreak: number
  achievements: number
  xp: number
  level: number
}

export interface OnboardingPayload {
  age: number
  weight: number
  height: number
  fitnessLevel: string
  goals: string[]
  accessibilityNeeds: string[]
  preferredWorkoutTypes: string[]
  gender?: string
  injuredLimbs?: string[]
  injuryDescription?: string
  medicalConditions?: string[]
  trainingMotivation?: string
}

export const traineeApi = {
  getProfile: () =>
    apiClient.get<TraineeProfile>('/trainee/profile').then(r => r.data),

  updateProfile: (data: Partial<TraineeProfile>) =>
    apiClient.put<TraineeProfile>('/trainee/profile', data).then(r => r.data),

  submitOnboarding: (data: OnboardingPayload) =>
    apiClient.post('/trainee/onboarding', data).then(r => r.data),

  getStats: () =>
    apiClient.get<TraineeStats>('/trainee/stats').then(r => r.data),

  getUpcomingSessions: () =>
    apiClient.get('/trainee/sessions/upcoming').then(r => r.data),

  requestCoach: (coachId: string) =>
    apiClient.post(`/trainee/request-coach/${coachId}`).then(r => r.data),

  requestInstantSession: (coachId: string) =>
    apiClient.post(`/trainee/instant-session/${coachId}`).then(r => r.data),

  scheduleSession: (coachId: string, data: { date: string; time: string; notes?: string }) =>
    apiClient.post(`/trainee/schedule-session/${coachId}`, data).then(r => r.data),

  getMotivationalQuote: () =>
    apiClient.get<{ quote: string; author: string }>('/trainee/motivational-quote').then(r => r.data)
}
