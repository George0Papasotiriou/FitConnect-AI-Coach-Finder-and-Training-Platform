import apiClient from './client'

export interface Notification {
  id: string
  userId: string
  type: 'session' | 'message' | 'achievement' | 'request' | 'system'
  title: string
  body: string
  read: boolean
  createdAt: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export const notificationApi = {
  getNotifications: () =>
    apiClient.get<Notification[]>('/notifications').then(r => r.data),

  getAll: () =>
    apiClient.get<Notification[]>('/notifications').then(r => r.data),

  markAsRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`).then(r => r.data),

  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`).then(r => r.data),

  markAllAsRead: () =>
    apiClient.post('/notifications/read-all').then(r => r.data),

  markAllRead: () =>
    apiClient.post('/notifications/read-all').then(r => r.data),

  deleteNotification: (id: string) =>
    apiClient.delete(`/notifications/${id}`).then(r => r.data),

  subscribePush: (subscription: PushSubscription) =>
    apiClient.post('/notifications/push-subscribe', { subscription }).then(r => r.data)
}
