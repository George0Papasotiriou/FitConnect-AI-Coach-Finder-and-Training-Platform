/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import apiClient from './client'

export interface VoiceAIRequest {
  transcript: string
  context?: string
}

export interface VoiceAIResponse {
  response: string
  action?: {
    type: 'navigate' | 'search' | 'info' | 'rep_counter_start' | 'log_pr'
    payload?: any
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  favicon?: string
}

export interface GeneratedProgram {
  name: string
  description: string
  days: {
    dayOfWeek: string
    exercises: {
      name: string
      category: string
      sets: number
      reps: number
      duration?: number
      notes?: string
    }[]
  }[]
}

export const aiApi = {
  sendVoiceMessage: (data: VoiceAIRequest) =>
    apiClient.post<VoiceAIResponse>('/ai/voice', data).then(r => r.data),

  getMotivationalQuote: () =>
    apiClient.get<{ quote: string; author: string }>('/ai/quote').then(r => r.data),

  getWorkoutSuggestion: () =>
    apiClient.get<{ suggestion: string }>('/ai/workout-suggestion').then(r => r.data),

  getDietaryTip: () =>
    apiClient.get<{ tip: string }>('/ai/dietary-tip').then(r => r.data),

  getFormTip: (exercise: string) =>
    apiClient.get<{ tip: string }>(`/ai/form-tip/${encodeURIComponent(exercise)}`).then(r => r.data),

  chat: (message: string, history: ChatMessage[] = []) =>
    apiClient.post<{ response: string }>('/ai/chat', { message, history }).then(r => r.data),

  getLinkPreview: (url: string) =>
    apiClient.get<LinkPreviewData>('/ai/link-preview', { params: { url } }).then(r => r.data),

  generateProgram: (data: { goals: string[]; fitnessLevel: string; daysPerWeek: number; focusAreas?: string[] }) =>
    apiClient.post<GeneratedProgram>('/ai/generate-program', data).then(r => r.data),

  coachMatch: (data: { goals?: string[]; fitnessLevel?: string; preferences?: string }) =>
    apiClient.post<{ recommendation: string }>('/ai/coach-match', data).then(r => r.data),
}
