import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Phone, Video, ArrowLeft, Image as ImageIcon, Ban, Timer, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import { useOnlineStore } from '../../store/onlineStore'
import { chatApi } from '../../api/chat'
import { useSocket } from '../../hooks/useSocket'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import Avatar from '../common/Avatar'
import WorkoutTimer from './WorkoutTimer'
import type { Conversation } from '../../api/chat'

interface ChatWindowProps {
  conversation: Conversation
  onBack?: () => void
}

export default function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  if (!conversation) return null
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { user } = useAuthStore()
  const { messages, typingUsers, addMessage, clearUnread, setMessagesRead, removeConversation, setActiveConversation } = useChatStore()
  const { getStatus } = useOnlineStore()
  const { emit, on } = useSocket()
  const navigate = useNavigate()

  const conversationMessages = messages[conversation.id] || []
  const isTyping = typingUsers[conversation.id]
  const other = conversation.participants.find((p) => p.id !== user?.id)
  const otherStatus = other ? getStatus(other.id) : 'offline'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages, isTyping])

  useEffect(() => {
    clearUnread(conversation.id)
    chatApi.markAsRead(conversation.id).catch(() => {})
    emit('mark_read', { conversationId: conversation.id })
  }, [conversation.id, clearUnread, emit])

  useEffect(() => {
    setActiveConversation(conversation.id)
    emit('join_conversation', conversation.id)
    chatApi.getMessages(conversation.id).then((msgs) => {
      useChatStore.getState().setMessages(conversation.id, msgs)
    }).catch(() => {})

    return () => setActiveConversation(null)
  }, [conversation.id, emit, setActiveConversation])

  useEffect(() => {
    // Listen for read receipts
    const removeMarkRead = on('messages_read', (data: any) => {
      if (data.conversationId === conversation.id) {
        setMessagesRead(conversation.id, data.userId)
      }
    })

    return () => {
      removeMarkRead()
    }
  }, [conversation.id, on, setMessagesRead])

  const handleCloseConversation = async () => {
    try {
      await chatApi.closeConversation(conversation.id)
      removeConversation(conversation.id)
      if (onBack) onBack()
    } catch (error) {
      console.error('Failed to close conversation', error)
    }
  }

  const handleTyping = useCallback(() => {
    emit('typing_start', { conversationId: conversation.id })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      emit('typing_stop', { conversationId: conversation.id })
    }, 2000)
  }, [emit, conversation.id])

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) return
    const content = input.trim()
    setInput('')
    setIsSending(true)
    try {
      const msg = await chatApi.sendMessage(conversation.id, content)
      addMessage(conversation.id, msg)
      emit('send_message', { conversationId: conversation.id, message: msg })
    } catch {
    } finally {
      setIsSending(false)
    }
  }, [input, isSending, conversation.id, addMessage, emit])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const msg = await chatApi.sendFile(conversation.id, file)
      addMessage(conversation.id, msg)
      emit('send_message', { conversationId: conversation.id, message: msg })
    } catch {}
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    try {
      const msg = await chatApi.sendFile(conversation.id, file)
      addMessage(conversation.id, msg)
      emit('send_message', { conversationId: conversation.id, message: msg })
    } catch {}
  }

  const handleBlockToggle = async () => {
    if (!other?.id) return
    try {
      if (isBlocked) {
        await chatApi.unblockUser(other.id)
        setIsBlocked(false)
      } else {
        await chatApi.blockUser(other.id)
        setIsBlocked(true)
      }
    } catch (e) {
      console.error('Failed to toggle block status')
    }
  }

  const statusText = otherStatus === 'available' ? 'Online' : otherStatus === 'in-call' ? 'In a call' : 'Offline'
  const statusDotColor = otherStatus === 'available' ? 'bg-green-500' : otherStatus === 'in-call' ? 'bg-red-500' : 'bg-gray-500'

  return (
    <div
      className="flex flex-col h-full bg-bg-card relative"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-3 md:px-5 py-3 md:py-4 border-b border-border-color bg-bg-card flex-shrink-0 z-10 shadow-sm"
      >
        <div className="flex items-center gap-2 md:gap-4 shrink-0 min-w-0 pr-2">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors shrink-0" aria-label="Back to conversations">
              <ArrowLeft size={20} />
            </button>
          )}
          <Avatar src={other?.avatar} name={other?.name} size="md" status={otherStatus} />
          <div className="min-w-0">
            <p className="font-bold text-sm md:text-base text-text-primary truncate">{other?.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${statusDotColor} ${otherStatus === 'available' ? 'animate-status-pulse' : ''}`} />
              <p className="text-[10px] md:text-xs text-text-secondary truncate">{statusText}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5 md:gap-1 shrink-0 overflow-x-auto scrollbar-hidden">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              emit('incoming_call', { targetUserId: other?.id, conversationId: conversation.id, callerName: user?.name, type: 'audio' })
              navigate(`/call/${conversation.id}?type=chat&audio=true&initiator=true&name=${encodeURIComponent(other?.name || 'User')}`)
            }}
            className="p-2 md:p-2.5 rounded-xl text-text-secondary hover:text-accent-teal hover:bg-accent-teal/10 transition-colors shrink-0"
            aria-label="Start audio call"
          >
            <Phone size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              emit('incoming_call', { targetUserId: other?.id, conversationId: conversation.id, callerName: user?.name, type: 'video' })
              navigate(`/call/${conversation.id}?type=chat&initiator=true&name=${encodeURIComponent(other?.name || 'User')}`)
            }}
            className="p-2 md:p-2.5 rounded-xl text-text-secondary hover:text-accent-purple hover:bg-accent-purple/10 transition-colors shrink-0"
            aria-label="Start video call"
          >
            <Video size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTimer(!showTimer)}
            className={`p-2 md:p-2.5 rounded-xl transition-colors shrink-0 ${showTimer ? 'text-accent-teal bg-accent-teal/10' : 'text-text-secondary hover:text-accent-teal hover:bg-accent-teal/10'}`}
            aria-label="Workout timer"
          >
            <Timer size={18} />
          </motion.button>
          <div className="w-px h-4 bg-border-color mx-1 shrink-0" />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBlockToggle}
            className={`p-2 md:p-2.5 rounded-xl transition-colors shrink-0 hidden sm:block ${isBlocked ? 'text-red-500 bg-red-500/10' : 'text-text-secondary hover:text-red-500 hover:bg-red-500/10'}`}
            title="Block user"
          >
            <Ban size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleCloseConversation}
            className="p-2 md:p-2.5 rounded-xl text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 hidden sm:block"
            title="Close chat"
          >
            <X size={18} />
          </motion.button>
        </div>
      </motion.div>

      {/* Messages */}
      <div
        className={`flex-1 overflow-y-auto scrollbar-thin p-3 md:p-4 space-y-4 transition-colors ${isDragOver ? 'bg-accent-purple/5 ring-2 ring-inset ring-accent-purple/30 rounded-lg' : ''}`}
        aria-live="polite"
        aria-label="Message history"
      >
        {isDragOver && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <ImageIcon size={40} className="mx-auto text-accent-purple mb-2" />
              <p className="text-accent-purple font-medium">Drop file to send</p>
            </div>
          </div>
        )}
        <AnimatePresence>
          {conversationMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.id} />
          ))}
        </AnimatePresence>
        {isTyping && <TypingIndicator />}
        {/* Adds padding to the bottom to make sure last message isn't hidden by the input */}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      <AnimatePresence>
        {showTimer && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="absolute right-2 md:right-4 top-16 md:top-20 z-50 w-[calc(100%-16px)] sm:w-72 shadow-2xl"
          >
            <WorkoutTimer onClose={() => setShowTimer(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex-shrink-0 p-3 md:p-4 border-t border-border-color bg-bg-card safe-area-pb">
        <div className="flex items-end gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            className="p-2 md:p-2.5 rounded-xl text-text-secondary hover:text-accent-purple hover:bg-accent-purple/10 transition-colors flex-shrink-0"
            aria-label="Attach file"
          >
            <Paperclip size={20} />
          </motion.button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.mp3,.wav,.ogg,.mp4"
            aria-label="File attachment"
          />

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); handleTyping() }}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              rows={1}
              aria-label="Message input"
              className="w-full bg-bg-primary border border-border-color rounded-2xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-purple resize-none scrollbar-thin max-h-32 shadow-inner"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="p-3 bg-accent-purple hover:bg-accent-teal/80 text-white rounded-2xl transition-all shadow-md shadow-accent-purple/20 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send size={18} className="ml-0.5" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
