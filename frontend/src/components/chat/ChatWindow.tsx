import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Phone, Video, ArrowLeft, Image as ImageIcon } from 'lucide-react'
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
import { Award, Timer } from 'lucide-react'
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { user } = useAuthStore()
  const { messages, typingUsers, addMessage, clearUnread } = useChatStore()
  const { getStatus } = useOnlineStore()
  const { emit } = useSocket()
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
  }, [conversation.id, clearUnread])

  useEffect(() => {
    chatApi.getMessages(conversation.id).then((msgs) => {
      useChatStore.getState().setMessages(conversation.id, msgs)
    }).catch(() => {})
  }, [conversation.id])

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

  const statusText = otherStatus === 'available' ? 'Online' : otherStatus === 'in-call' ? 'In a call' : 'Offline'
  const statusDotColor = otherStatus === 'available' ? 'bg-green-500' : otherStatus === 'in-call' ? 'bg-red-500' : 'bg-gray-500'

  return (
    <div
      className="flex flex-col h-full"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-5 py-4 border-b border-border-color bg-bg-card flex-shrink-0"
      >
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors" aria-label="Back to conversations">
              <ArrowLeft size={20} />
            </button>
          )}
          <Avatar src={other?.avatar} name={other?.name} size="lg" status={otherStatus} />
          <div>
            <p className="font-bold text-base text-text-primary">{other?.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${statusDotColor} ${otherStatus === 'available' ? 'animate-status-pulse' : ''}`} />
              <p className="text-xs text-text-secondary">{statusText}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTimer(!showTimer)}
            className={`p-2.5 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${showTimer ? 'text-accent-teal bg-accent-teal/10 font-bold' : 'text-text-secondary hover:text-accent-teal hover:bg-accent-teal/10'}`}
            aria-label="Toggle workout timer"
            title="Workout Timer"
          >
            <Timer size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/call/${conversation.id}?audio=true`)}
            className="p-2.5 rounded-xl text-text-secondary hover:text-accent-teal hover:bg-accent-teal/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Start audio call"
          >
            <Phone size={20} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(`/call/${conversation.id}`)}
            className="p-2.5 rounded-xl text-text-secondary hover:text-accent-purple hover:bg-accent-purple/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Start video call"
          >
            <Video size={20} />
          </motion.button>
        </div>
      </motion.div>

      {/* Messages */}
      <div
        className={`flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 transition-colors ${isDragOver ? 'bg-accent-purple/5 ring-2 ring-inset ring-accent-purple/30 rounded-lg' : ''}`}
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
        <div ref={messagesEndRef} />
      </div>

      <AnimatePresence>
        {showTimer && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-4 top-20 z-50 w-72"
          >
            <WorkoutTimer onClose={() => setShowTimer(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t border-border-color bg-bg-card">
        <div className="flex items-end gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-text-secondary hover:text-accent-purple hover:bg-accent-purple/10 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
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
              placeholder="Type a message..."
              rows={1}
              aria-label="Message input"
              className="w-full bg-bg-primary border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none scrollbar-thin max-h-32"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className="p-2.5 bg-accent-purple hover:bg-accent-teal/80 text-white rounded-xl transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Send message"
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
