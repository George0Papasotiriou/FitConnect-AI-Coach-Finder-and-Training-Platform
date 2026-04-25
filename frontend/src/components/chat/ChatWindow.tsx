import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Paperclip, Phone, Video, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import { chatApi } from '../../api/chat'
import { useSocket } from '../../hooks/useSocket'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import Avatar from '../common/Avatar'
import type { Conversation } from '../../api/chat'

interface ChatWindowProps {
  conversation: Conversation
  onBack?: () => void
}

export default function ChatWindow({ conversation, onBack }: ChatWindowProps) {
  if (!conversation) return null
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { user } = useAuthStore()
  const { messages, typingUsers, addMessage, clearUnread } = useChatStore()
  const { emit } = useSocket()
  const navigate = useNavigate()

  const conversationMessages = messages[conversation.id] || []
  const isTyping = typingUsers[conversation.id]
  const other = conversation.participants.find((p) => p.id !== user?.id)

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
    } catch {}
    e.target.value = ''
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-color bg-bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors" aria-label="Back to conversations">
              <ArrowLeft size={20} />
            </button>
          )}
          <Avatar src={other?.avatar} name={other?.name} size="sm" isOnline={other?.isOnline} />
          <div>
            <p className="font-semibold text-sm text-text-primary">{other?.name}</p>
            <p className="text-xs text-text-secondary capitalize">{other?.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/call/${conversation.id}?audio=true`)}
            className="p-2 rounded-lg text-text-secondary hover:text-accent-teal hover:bg-accent-teal/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Start audio call"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => navigate(`/call/${conversation.id}`)}
            className="p-2 rounded-lg text-text-secondary hover:text-accent-purple hover:bg-accent-purple/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Start video call"
          >
            <Video size={18} />
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4"
        aria-live="polite"
        aria-label="Message history"
      >
        {conversationMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isOwn={msg.senderId === user?.id} />
        ))}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 p-4 border-t border-border-color bg-bg-card">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-text-secondary hover:text-accent-purple hover:bg-accent-purple/10 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Attach file"
          >
            <Paperclip size={20} />
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} aria-label="File attachment" />

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
            className="p-2.5 bg-accent-purple hover:bg-purple-600 text-white rounded-xl transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Send message"
          >
            <Send size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
