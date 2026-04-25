import { format } from 'date-fns'
import type { Conversation } from '../../api/chat'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../common/Avatar'

interface ChatListProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
}

export default function ChatList({ conversations, activeId, onSelect }: ChatListProps) {
  const { user } = useAuthStore()

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-color">
        <h2 className="font-bold text-lg text-text-primary">Messages</h2>
      </div>
      <ul className="flex-1 overflow-y-auto scrollbar-thin" role="list" aria-label="Conversations">
        {conversations.length === 0 && (
          <li className="p-6 text-center text-text-secondary text-sm">
            No conversations yet
          </li>
        )}
        {conversations.map((conv) => {
          const other = conv.participants.find((p) => p.id !== user?.id)
          const isActive = conv.id === activeId
          const time = conv.lastMessage
            ? format(new Date(conv.updatedAt), 'HH:mm')
            : ''

          return (
            <li key={conv.id}>
              <button
                onClick={() => onSelect(conv.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-purple ${
                  isActive
                    ? 'bg-accent-purple/10 border-l-2 border-accent-purple'
                    : 'hover:bg-bg-card-hover border-l-2 border-transparent'
                }`}
                aria-current={isActive ? 'true' : undefined}
                aria-label={`Conversation with ${other?.name}${conv.unreadCount > 0 ? `, ${conv.unreadCount} unread messages` : ''}`}
              >
                <Avatar
                  src={other?.avatar}
                  name={other?.name}
                  size="md"
                  isOnline={other?.isOnline}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-text-primary truncate">{other?.name}</span>
                    <span className="text-xs text-text-secondary flex-shrink-0 ml-2">{time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-text-secondary truncate">
                      {conv.lastMessage?.content || 'Start a conversation'}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 flex-shrink-0 w-5 h-5 bg-accent-purple text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
