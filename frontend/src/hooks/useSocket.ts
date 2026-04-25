import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { useNotificationStore } from '../store/notificationStore'
import type { Message } from '../api/chat'
import type { Notification } from '../api/notification'

const SOCKET_URL = 'http://localhost:3001'

let socketInstance: Socket | null = null

export function useSocket() {
  const { token } = useAuthStore()
  const { addMessage, setTyping, updateConversationLastMessage, incrementUnread, activeConversation } = useChatStore()
  const { addNotification } = useNotificationStore()
  const socketRef = useRef<Socket | null>(null)

  const getSocket = useCallback(() => {
    if (!socketInstance && token) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })
    }
    return socketInstance
  }, [token])

  useEffect(() => {
    if (!token) return

    const socket = getSocket()
    if (!socket) return
    socketRef.current = socket

    socket.on('new_message', (message: Message) => {
      addMessage(message.conversationId, message)
      updateConversationLastMessage(message.conversationId, message)
      if (activeConversation !== message.conversationId) {
        incrementUnread(message.conversationId)
      }
    })

    socket.on('typing_start', ({ conversationId }: { conversationId: string }) => {
      setTyping(conversationId, true)
    })

    socket.on('typing_stop', ({ conversationId }: { conversationId: string }) => {
      setTyping(conversationId, false)
    })

    socket.on('notification', (notification: Notification) => {
      addNotification(notification)
    })

    return () => {
      socket.off('new_message')
      socket.off('typing_start')
      socket.off('typing_stop')
      socket.off('notification')
    }
  }, [token, getSocket, addMessage, setTyping, updateConversationLastMessage, incrementUnread, activeConversation, addNotification])

  const emit = useCallback((event: string, data?: unknown) => {
    const socket = socketRef.current || getSocket()
    if (socket?.connected) {
      socket.emit(event, data)
    }
  }, [getSocket])

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const socket = socketRef.current || getSocket()
    socket?.on(event, handler)
    return () => socket?.off(event, handler)
  }, [getSocket])

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    const socket = socketRef.current || getSocket()
    socket?.off(event, handler)
  }, [getSocket])

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect()
      socketInstance = null
    }
  }, [])

  return { emit, on, off, disconnect, socket: socketRef.current }
}

export function getSocketInstance() {
  return socketInstance
}
