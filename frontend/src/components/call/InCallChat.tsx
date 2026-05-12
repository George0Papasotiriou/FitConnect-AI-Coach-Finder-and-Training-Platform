import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Paperclip, X, Image as ImageIcon, File as FileIcon, Download } from 'lucide-react'
import type { DataMessage } from '../../hooks/useWebRTC'

interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: number
  isOwn: boolean
  type: 'text' | 'image' | 'file'
  fileName?: string
  fileData?: string // base64 for images
  fileSize?: number
}

interface InCallChatProps {
  onClose: () => void
  sendData: (msg: DataMessage) => void
  onDataMessage: (listener: (msg: DataMessage) => void) => () => void
  userName: string
  dataChannelReady: boolean
  onUnreadChange?: (count: number) => void
  isVisible: boolean
}

export default function InCallChat({
  onClose, sendData, onDataMessage, userName, dataChannelReady, onUnreadChange, isVisible
}: InCallChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [remoteTyping, setRemoteTyping] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const msgIdCounter = useRef(0)

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }, [])

  // Listen for incoming chat messages from data channel
  useEffect(() => {
    const removeListener = onDataMessage((msg: DataMessage) => {
      if (msg.type === 'chat') {
        if (msg.subtype === 'message') {
          const chatMsg: ChatMessage = {
            id: `remote-${Date.now()}-${Math.random()}`,
            sender: msg.sender || 'User',
            content: msg.content,
            timestamp: msg.timestamp || Date.now(),
            isOwn: false,
            type: msg.messageType || 'text',
            fileName: msg.fileName,
            fileData: msg.fileData,
            fileSize: msg.fileSize
          }
          setMessages(prev => [...prev, chatMsg])
          if (!isVisible && onUnreadChange) {
            onUnreadChange(1) // increment
          }
        } else if (msg.subtype === 'typing') {
          setRemoteTyping(msg.sender || 'User')
          if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current)
          remoteTypingTimeoutRef.current = setTimeout(() => setRemoteTyping(null), 2500)
        }
      }
    })
    return removeListener
  }, [onDataMessage, isVisible, onUnreadChange])

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = useCallback(() => {
    if (!input.trim() || !dataChannelReady) return
    const content = input.trim()
    setInput('')

    const chatMsg: ChatMessage = {
      id: `local-${++msgIdCounter.current}`,
      sender: userName,
      content,
      timestamp: Date.now(),
      isOwn: true,
      type: 'text'
    }
    setMessages(prev => [...prev, chatMsg])

    sendData({
      type: 'chat',
      subtype: 'message',
      sender: userName,
      content,
      messageType: 'text',
      timestamp: Date.now()
    })
  }, [input, dataChannelReady, userName, sendData])

  const sendTyping = useCallback(() => {
    sendData({ type: 'chat', subtype: 'typing', sender: userName })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {}, 2000)
  }, [sendData, userName])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !dataChannelReady) return
    e.target.value = ''

    // Limit file size to 5MB for data channel
    if (file.size > 5 * 1024 * 1024) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const isImage = file.type.startsWith('image/')
      
      const chatMsg: ChatMessage = {
        id: `local-${++msgIdCounter.current}`,
        sender: userName,
        content: file.name,
        timestamp: Date.now(),
        isOwn: true,
        type: isImage ? 'image' : 'file',
        fileName: file.name,
        fileData: base64,
        fileSize: file.size
      }
      setMessages(prev => [...prev, chatMsg])

      sendData({
        type: 'chat',
        subtype: 'message',
        sender: userName,
        content: file.name,
        messageType: isImage ? 'image' : 'file',
        fileName: file.name,
        fileData: base64,
        fileSize: file.size,
        timestamp: Date.now()
      })
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file || !dataChannelReady) return

    if (file.size > 5 * 1024 * 1024) return

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      const isImage = file.type.startsWith('image/')
      
      const chatMsg: ChatMessage = {
        id: `local-${++msgIdCounter.current}`,
        sender: userName,
        content: file.name,
        timestamp: Date.now(),
        isOwn: true,
        type: isImage ? 'image' : 'file',
        fileName: file.name,
        fileData: base64,
        fileSize: file.size
      }
      setMessages(prev => [...prev, chatMsg])

      sendData({
        type: 'chat',
        subtype: 'message',
        sender: userName,
        content: file.name,
        messageType: isImage ? 'image' : 'file',
        fileName: file.name,
        fileData: base64,
        fileSize: file.size,
        timestamp: Date.now()
      })
    }
    reader.readAsDataURL(file)
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed top-0 right-0 bottom-0 w-full md:w-96 z-[110] flex flex-col"
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Glassmorphism background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl border-l border-white/10" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <h3 className="text-white font-bold text-base tracking-tight">In-Call Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages area */}
        <div
          className={`flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar scrollbar-thin transition-colors ${isDragOver ? 'bg-emerald-500/5 ring-2 ring-inset ring-emerald-500/30' : ''}`}
        >
          {isDragOver && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <ImageIcon size={32} className="mx-auto text-emerald-400 mb-2 opacity-70" />
                <p className="text-emerald-400 font-medium text-sm">Drop to send</p>
              </div>
            </div>
          )}

          {messages.length === 0 && !isDragOver && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/30 space-y-2">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Send size={24} className="opacity-40" />
                </div>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs">Send a message or drop a file</p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'}`}
            >
              {/* Sender name */}
              <span className={`text-[10px] font-semibold mb-1 px-1 uppercase tracking-wider ${msg.isOwn ? 'text-emerald-400/60' : 'text-purple-400/60'}`}>
                {msg.sender}
              </span>

              {/* Bubble */}
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.isOwn 
                  ? 'bg-gradient-to-br from-emerald-600/40 to-emerald-700/30 border border-emerald-500/20' 
                  : 'bg-white/8 border border-white/10'
              }`}>
                {msg.type === 'image' && msg.fileData && (
                  <div className="mb-2 rounded-xl overflow-hidden">
                    <img src={msg.fileData} alt={msg.fileName} className="max-w-full h-auto max-h-48 object-contain rounded-xl" />
                  </div>
                )}
                {msg.type === 'file' && (
                  <div className="flex items-center gap-3 mb-1 p-2 bg-black/20 rounded-xl">
                    <div className="p-2 bg-white/10 rounded-lg flex-shrink-0">
                      <FileIcon size={16} className="text-white/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate font-medium">{msg.fileName}</p>
                      {msg.fileSize && <p className="text-[10px] text-white/40">{formatFileSize(msg.fileSize)}</p>}
                    </div>
                    {msg.fileData && (
                      <a href={msg.fileData} download={msg.fileName} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
                        <Download size={14} className="text-white/50" />
                      </a>
                    )}
                  </div>
                )}
                {msg.type === 'text' && (
                  <p className="text-sm text-white leading-relaxed break-words">{msg.content}</p>
                )}
                <p className={`text-[10px] mt-1 ${msg.isOwn ? 'text-emerald-400/40' : 'text-white/25'}`}>
                  {formatTime(msg.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}

          {/* Remote typing indicator */}
          <AnimatePresence>
            {remoteTyping && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="flex items-center gap-2 px-2"
              >
                <span className="text-[10px] text-purple-400/70 font-semibold uppercase tracking-wider">{remoteTyping}</span>
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} className="h-1" />
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 p-3 border-t border-white/10">
          <div className="flex items-end gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl text-white/40 hover:text-emerald-400 hover:bg-white/5 transition-all flex-shrink-0"
              aria-label="Attach file"
            >
              <Paperclip size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,.pdf,.doc,.docx,.mp3,.wav,.ogg,.mp4,.txt,.zip"
              aria-label="File attachment"
            />

            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  sendTyping()
                }}
                onKeyDown={handleKeyDown}
                placeholder={dataChannelReady ? 'Type a message...' : 'Connecting...'}
                disabled={!dataChannelReady}
                rows={1}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/30 resize-none max-h-24 transition-all disabled:opacity-40"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={sendMessage}
              disabled={!input.trim() || !dataChannelReady}
              className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all shadow-md shadow-emerald-600/20 flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send size={16} className="ml-0.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
