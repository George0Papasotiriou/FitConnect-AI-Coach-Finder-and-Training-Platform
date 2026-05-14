/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationApi } from '../api/notification'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'

export function useNotifications() {
  const { token } = useAuthStore()
  const { setNotifications, markAsRead, markAllAsRead } = useNotificationStore()

  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationApi.getNotifications,
    enabled: !!token,
    refetchInterval: 30000
  })

  useEffect(() => {
    if (data) setNotifications(data)
  }, [data, setNotifications])

  const handleMarkAsRead = useCallback(async (id: string) => {
    markAsRead(id)
    try {
      await notificationApi.markAsRead(id)
    } catch {}
  }, [markAsRead])

  const handleMarkAllAsRead = useCallback(async () => {
    markAllAsRead()
    try {
      await notificationApi.markAllAsRead()
    } catch {}
  }, [markAllAsRead])

  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const permission = await Notification.requestPermission()
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'your-vapid-public-key'
      })
      await notificationApi.subscribePush(subscription)
      return true
    }
    return false
  }, [])

  return { markAsRead: handleMarkAsRead, markAllAsRead: handleMarkAllAsRead, requestPushPermission, refetch }
}
