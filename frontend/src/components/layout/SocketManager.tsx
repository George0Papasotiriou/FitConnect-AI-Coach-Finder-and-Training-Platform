/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { MessageSquare, X } from 'lucide-react'
import { useSocket } from '../../hooks/useSocket'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'
import { useNotificationStore } from '../../store/notificationStore'
import { useOnlineStore, UserStatus } from '../../store/onlineStore'
import { chatApi } from '../../api/chat'
import type { Message } from '../../api/chat'
import type { Notification } from '../../api/notification'

export default function SocketManager() {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const { on, socket } = useSocket()
  const { addMessage, setTyping, updateConversationLastMessage, incrementUnread, setConversations } = useChatStore()
  const { addNotification } = useNotificationStore()
  const { setStatus, setMultipleStatuses } = useOnlineStore()

  useEffect(() => {
    if (!token || !user) return

    // Pre-fetch contexts
    chatApi.getConversations().then((data: any[]) => setConversations(data)).catch(() => {})

    const handleNewMessage = (message: Message) => {
      addMessage(message.conversationId, message)
      updateConversationLastMessage(message.conversationId, message)
      
      const currentActive = useChatStore.getState().activeConversation
      if (currentActive === message.conversationId) {
        // Dynamic "Seen" update
        socket?.emit('mark_read', { conversationId: message.conversationId })
        chatApi.markAsRead(message.conversationId).catch(() => {})
      } else {
        incrementUnread(message.conversationId)
        
        const isChatRoute = window.location.pathname.startsWith('/chat')
        const isEnabled = localStorage.getItem('fc_notificationsEnabled') !== 'false'
        
        if (!isChatRoute && isEnabled) {
          // Gentle Audio Notification
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioCtx.createOscillator()
            const gainNode = audioCtx.createGain()
            oscillator.type = 'sine'
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime)
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1)
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05)
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2)
            oscillator.connect(gainNode)
            gainNode.connect(audioCtx.destination)
            oscillator.start()
            oscillator.stop(audioCtx.currentTime + 0.25)
          } catch (e) {}

          const conversations = useChatStore.getState().conversations
          const conversation = conversations.find((c: any) => c.id === message.conversationId)
          const sender = conversation?.participants.find((p: any) => p.id === message.senderId)
          const avatarUrl = sender?.avatar ? (sender.avatar.startsWith('http') ? sender.avatar : `http://localhost:3001${sender.avatar}`) : null

          toast.custom((t) => (
            <div 
              onClick={() => {
                toast.dismiss(t)
                navigate(`/chat/${message.conversationId}`)
              }}
              className="flex backdrop-blur-xl bg-[#1a1b23]/90 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-2xl p-3.5 gap-3.5 w-[300px] items-center overflow-hidden relative cursor-pointer group hover:bg-[#1f212a]/95 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-accent-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" />
              <div className="relative shrink-0 z-10">
                 {avatarUrl ? (
                   <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-sm" />
                 ) : (
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple/20 to-accent-purple/5 flex items-center justify-center border border-white/10 shadow-inner">
                     <MessageSquare className="text-accent-purple/80" size={17} />
                   </div>
                 )}
                 <span className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] bg-[#10b981] rounded-full border-2 border-[#1a1b23] shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
              </div>
              <div className="flex-1 min-w-0 pr-5 relative z-10">
                 <p className="text-white/95 font-semibold text-[13px] tracking-tight truncate">{sender?.name || 'New Message'}</p>
                 <p className="text-white/50 text-[12px] truncate mt-0.5 leading-tight">{message.content}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); toast.dismiss(t) }}
                className="absolute top-2 right-2 p-1.5 rounded-full text-white/30 hover:text-white/80 hover:bg-white/5 transition-all z-20 focus:outline-none"
                aria-label="Close"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </div>
          ), { 
            duration: 5000, 
            position: 'top-center',
            unstyled: true,
            style: { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, margin: 0 }
          })
        }
      }
    }

    const handleNewConversation = (data: { conversationId: string }) => {
      socket?.emit('join_conversation', data.conversationId)
      chatApi.getConversations().then((convs: any[]) => setConversations(convs)).catch(() => {})
    }

    const handleTypingStart = ({ conversationId }: { conversationId: string }) => setTyping(conversationId, true)
    const handleTypingStop = ({ conversationId }: { conversationId: string }) => setTyping(conversationId, false)
    const handleNotification = (notif: Notification) => addNotification(notif)
    const handleUserOnline = ({ userId }: { userId: string }) => setStatus(userId, 'available')
    const handleUserOffline = ({ userId }: { userId: string }) => setStatus(userId, 'offline')
    const handleUserStatusChange = ({ userId, status }: { userId: string; status: UserStatus }) => setStatus(userId, status)
    const handleOnlineUsers = (users: Record<string, UserStatus>) => setMultipleStatuses(users)
    const handleConnect = () => socket?.emit('get_online_users')

    const unsubscribers = [
      on('new_message', handleNewMessage),
      on('new_conversation', handleNewConversation),
      on('typing_start', handleTypingStart),
      on('typing_stop', handleTypingStop),
      on('notification', handleNotification),
      on('user_online', handleUserOnline),
      on('user_offline', handleUserOffline),
      on('user_status_change', handleUserStatusChange),
      on('online_users', handleOnlineUsers),
      on('connect', handleConnect)
    ]

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [token, user, on, socket, addMessage, setTyping, updateConversationLastMessage, incrementUnread, setConversations, addNotification, setStatus, setMultipleStatuses, navigate])

  return null
}
