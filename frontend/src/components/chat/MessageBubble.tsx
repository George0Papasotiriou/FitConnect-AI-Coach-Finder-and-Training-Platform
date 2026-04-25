import { format } from 'date-fns'
import type { Message } from '../../api/chat'
import Avatar from '../common/Avatar'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const time = format(new Date(message.createdAt), 'HH:mm')

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isOwn && (
        <Avatar src={message.senderAvatar} name={message.senderName} size="xs" />
      )}
      <div className={`max-w-[70%] space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwn && (
          <span className="text-xs text-text-secondary px-1">{message.senderName}</span>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? 'bg-accent-purple text-white rounded-br-sm'
              : 'bg-bg-card-hover text-text-primary border border-border-color rounded-bl-sm'
          }`}
        >
          {message.type === 'image' && message.fileUrl ? (
            <img
              src={message.fileUrl}
              alt="Shared image"
              className="max-w-full rounded-lg"
            />
          ) : message.type === 'file' && message.fileUrl ? (
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline flex items-center gap-1"
            >
              📎 {message.content}
            </a>
          ) : (
            message.content
          )}
        </div>
        <span className={`text-[10px] text-text-secondary px-1 ${isOwn ? 'text-right' : 'text-left'}`}>
          {time}
          {isOwn && message.readAt && ' · Read'}
        </span>
      </div>
    </div>
  )
}
