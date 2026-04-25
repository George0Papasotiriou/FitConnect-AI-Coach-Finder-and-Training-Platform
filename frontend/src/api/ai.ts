import apiClient from './client'

export interface VoiceAIRequest {
  transcript: string
  context?: string
}

export interface VoiceAIResponse {
  response: string
  action?: {
    type: 'navigate' | 'search' | 'info'
    payload?: string
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
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
}
