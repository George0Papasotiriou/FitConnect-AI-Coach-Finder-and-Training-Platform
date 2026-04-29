import apiClient from './client'

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  type: 'text' | 'image' | 'file' | 'voice' | 'program'
  fileUrl?: string
  createdAt: string
  readAt?: string
}

export interface Conversation {
  id: string
  participants: {
    id: string
    name: string
    avatar?: string
    role: string
    isOnline: boolean
  }[]
  lastMessage?: Message
  unreadCount: number
  updatedAt: string
}

export const chatApi = {
  getConversations: () =>
    apiClient.get<Conversation[]>('/chat/conversations').then(r => r.data),

  getMessages: (conversationId: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<Message[]>(`/chat/conversations/${conversationId}/messages`, { params }).then(r => r.data),

  sendMessage: (conversationId: string, content: string, type = 'text') =>
    apiClient.post<Message>(`/chat/conversations/${conversationId}/messages`, { content, type }).then(r => r.data),

  sendFile: (conversationId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<Message>(
      `/chat/conversations/${conversationId}/files`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ).then(r => r.data)
  },

  markAsRead: (conversationId: string) =>
    apiClient.post(`/chat/conversations/${conversationId}/read`).then(r => r.data),

  createConversation: (participantId: string) =>
    apiClient.post<Conversation>('/chat/conversations', { participantId }).then(r => r.data)
}
