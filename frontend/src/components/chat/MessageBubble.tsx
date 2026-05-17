/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState, useEffect, memo } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { FileText, Download, ExternalLink, Image as ImageIcon, File, CheckCheck, Check, Trash2 } from 'lucide-react'
import type { Message } from '../../api/chat'
import { chatApi } from '../../api/chat'
import { useChatStore } from '../../store/chatStore'
import { aiApi } from '../../api/ai'
import Avatar from '../common/Avatar'
import ProgramMessage from './ProgramMessage'
import SessionProposalMessage from './SessionProposalMessage'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  favicon?: string
}

// URL detection regex
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url)
}

function isPdfUrl(url: string): boolean {
  return /\.pdf(\?.*)?$/i.test(url)
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

function getFileIcon(filename: string) {
  const ext = getFileExtension(filename)
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return <ImageIcon size={18} />
  if (ext === 'pdf') return <FileText size={18} className="text-red-400" />
  return <File size={18} />
}

function getFileColor(filename: string): string {
  const ext = getFileExtension(filename)
  if (ext === 'pdf') return 'border-red-500/30 bg-red-500/10'
  if (['doc', 'docx'].includes(ext)) return 'border-blue-500/30 bg-blue-500/10'
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'border-purple-500/30 bg-purple-500/10'
  if (['mp4'].includes(ext)) return 'border-teal-500/30 bg-teal-500/10'
  return 'border-border-color bg-bg-card'
}

// Renders text with clickable links
function RichText({ content, isOwn }: { content: string; isOwn: boolean }) {
  const parts = content.split(URL_REGEX)

  return (
    <span>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          // Reset regex lastIndex
          URL_REGEX.lastIndex = 0
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline decoration-1 underline-offset-2 hover:decoration-2 transition-all inline-flex items-center gap-0.5 ${
                isOwn ? 'text-white/90 hover:text-white' : 'text-accent-purple hover:text-purple-400'
              }`}
            >
              {part.length > 50 ? part.slice(0, 47) + '...' : part}
              <ExternalLink size={11} className="inline flex-shrink-0" />
            </a>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

// Link preview card component
const LinkPreviewCard = memo(function LinkPreviewCard({ url, isOwn }: { url: string; isOwn: boolean }) {
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    aiApi.getLinkPreview(url)
      .then(data => { if (!cancelled) setPreview(data) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [url])

  if (error || !preview || (!preview.title && !preview.description)) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block mt-2 rounded-xl overflow-hidden border transition-all hover:scale-[1.01] ${
        isOwn ? 'border-white/20 bg-white/10' : 'border-border-color bg-bg-card-hover'
      }`}
    >
      {preview.image && (
        <div className="w-full h-32 overflow-hidden">
          <img src={preview.image} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-2">
          {preview.favicon && <img src={preview.favicon} alt="" className="w-4 h-4 rounded-sm" />}
          <span className={`text-xs truncate ${isOwn ? 'text-white/60' : 'text-text-secondary'}`}>
            {new URL(url).hostname}
          </span>
        </div>
        {preview.title && (
          <p className={`text-sm font-semibold line-clamp-2 ${isOwn ? 'text-white' : 'text-text-primary'}`}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={`text-xs line-clamp-2 ${isOwn ? 'text-white/70' : 'text-text-secondary'}`}>
            {preview.description}
          </p>
        )}
      </div>
    </a>
  )
})

// File attachment renderer
function FileAttachment({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const fileUrl = message.fileUrl || ''
  const fileName = message.content || 'Attachment'
  const ext = getFileExtension(fileName)
  const isImage = message.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
  const isPdf = ext === 'pdf'

  if (isImage && fileUrl) {
    return (
      <div className="space-y-2">
        <div className="relative group max-w-full overflow-hidden rounded-xl border border-border-color bg-bg-card">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-80 w-auto rounded-lg object-contain cursor-pointer transition-transform group-hover:scale-[1.02]"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                target.parentElement!.innerHTML = `<div class="flex items-center gap-2 p-4 text-text-secondary"><span>📎</span><span>${fileName}</span></div>`
              }}
            />
          </a>
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a 
              href={fileUrl} 
              download={fileName} 
              className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-black/80 transition-colors"
              title="Download image"
            >
              <Download size={16} />
            </a>
          </div>
        </div>
        <p className={`text-[10px] px-1 ${isOwn ? 'text-white/60 text-right' : 'text-text-secondary'}`}>{fileName}</p>
      </div>
    )
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.01] ${getFileColor(fileName)}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        isPdf ? 'bg-red-500/20' : 'bg-accent-purple/20'
      }`}>
        {getFileIcon(fileName)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-text-primary'}`}>
          {fileName}
        </p>
        <p className={`text-xs uppercase ${isOwn ? 'text-white/60' : 'text-text-secondary'}`}>
          {ext} file
        </p>
      </div>
      <Download size={16} className={`flex-shrink-0 ${isOwn ? 'text-white/60' : 'text-text-secondary'}`} />
    </a>
  )
}

// Extract URLs from text
function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX)
  return matches ? [...new Set(matches)] : []
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt), 'HH:mm')
  const isFile = (message.type === 'image' || message.type === 'file') && message.fileUrl
  const urls = !isFile ? extractUrls(message.content) : []
  const { setMessages, conversations } = useChatStore()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await chatApi.deleteMessage(message.conversationId, message.id)
      const convMsgs = useChatStore.getState().messages[message.conversationId] || []
      useChatStore.getState().setMessages(
        message.conversationId,
        convMsgs.filter(m => m.id !== message.id)
      )
    } catch (error) {
      console.error('Failed to delete message', error)
      setIsDeleting(false)
    }
  }

  if (isDeleting) {
    return (
      <motion.div
        animate={{ opacity: 0, scale: 0.8, height: 0, margin: 0 }}
        transition={{ duration: 0.3 }}
      />
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex items-end gap-2 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isOwn && (
        <Avatar src={message.senderAvatar} name={message.senderName} size="xs" />
      )}
      <div className={`max-w-[70%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col relative`}>
        {isOwn && (
          <button
            onClick={handleDelete}
            className="absolute top-1/2 -translate-y-1/2 -left-10 opacity-0 group-hover:opacity-100 transition-opacity p-2 text-text-secondary hover:text-red-500 bg-surface-dark rounded-full shadow-lg"
            title="Delete message"
          >
            <Trash2 size={14} />
          </button>
        )}

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? 'bg-accent-purple text-white rounded-br-sm'
              : 'bg-bg-card-hover text-text-primary border border-border-color rounded-bl-sm'
          }`}
        >
          {message.type === 'program' ? (
            <ProgramMessage content={message.content} />
          ) : message.type === 'session_proposal' ? (
            <SessionProposalMessage message={message} isOwn={isOwn} />
          ) : isFile ? (
            <FileAttachment message={message} isOwn={isOwn} />
          ) : (
            <RichText content={message.content} isOwn={isOwn} />
          )}

          {/* Link previews */}
          {urls.slice(0, 2).map((url) => (
            <LinkPreviewCard key={url} url={url} isOwn={isOwn} />
          ))}
        </div>
        <div className={`flex items-center gap-1.5 px-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
          {!isOwn && (
            <span className="text-[10px] text-text-secondary font-medium">
              {message.senderName} •
            </span>
          )}
          <span className="text-[10px] text-text-secondary">
            {time}
          </span>
          {isOwn && (
            message.readAt
              ? <CheckCheck size={12} className="text-accent-teal" />
              : <Check size={12} className="text-text-secondary" />
          )}
        </div>
      </div>
    </motion.div>
  )
}
