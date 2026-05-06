import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001')

let socketInstance: Socket | null = null

export function useSocket() {
  const { token } = useAuthStore()
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

    return () => {
      // We don't disconnect globally here, as other hooks might be using it.
      // We just clear the local ref if needed, but usually we keep it for performance.
    }
  }, [token, getSocket])

  const emit = useCallback((event: string, data?: unknown) => {
    const socket = socketRef.current || getSocket()
    if (socket) {
      socket.emit(event, data)
    }
  }, [getSocket])

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const socket = socketRef.current || getSocket()
    socket?.on(event, handler)
    return () => socket?.off(event, handler)
  }, [getSocket])

  const off = useCallback((event: string, handler?: (...args: any[]) => void) => {
    const socket = socketRef.current || getSocket()
    socket?.off(event, handler)
  }, [getSocket])

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect()
      socketInstance = null
    }
  }, [])

  return { emit, on, off, disconnect, socket: socketRef.current || getSocket() }
}

export function getSocketInstance() {
  return socketInstance
}
