import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { chatApi } from '../../api/chat'
import { useAuthStore } from '../../store/authStore'
import ChatList from '../../components/chat/ChatList'
import ChatWindow from '../../components/chat/ChatWindow'

export default function Chat() {
  const { id: conversationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [conversations, setConversations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedConv, setSelectedConv] = useState<string | null>(conversationId || null)

  useEffect(() => {
    chatApi.getConversations().then(data => {
      setConversations(data)
      if (conversationId) setSelectedConv(conversationId)
    }).catch(() => {}).finally(() => setIsLoading(false))
  }, [conversationId])

  const handleSelectConversation = (id: string) => {
    setSelectedConv(id)
    navigate(`/chat/${id}`, { replace: true })
  }

  return (
    <>
      <Helmet><title>Chat — FitConnect</title></Helmet>
      <div className="h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-border-color bg-bg-card">
        {/* Conversation List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-border-color flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border-color">
            <h2 className="font-bold text-text-primary flex items-center gap-2">
              <MessageCircle size={18} className="text-accent-purple" /> Messages
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-text-secondary text-sm">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-sm">No conversations yet</div>
            ) : (
              conversations.map(conv => {
                const otherUser = conv.participants?.find((p: any) => p.id !== user?.id) || { name: 'Unknown' }
                return (
                  <button key={conv.id} onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-bg-card-hover transition-colors text-left ${selectedConv === conv.id ? 'bg-bg-card-hover border-l-2 border-accent-purple' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple font-bold text-sm flex-shrink-0">{otherUser.name?.[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-text-primary truncate">{otherUser.name}</p>
                        {conv.unreadCount > 0 && <span className="w-5 h-5 bg-accent-purple text-white text-xs rounded-full flex items-center justify-center">{conv.unreadCount}</span>}
                      </div>
                      <p className="text-xs text-text-secondary truncate mt-0.5">{conv.lastMessage?.content || 'No messages'}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col ${selectedConv ? 'flex' : 'hidden md:flex'}`}>
          {selectedConv && conversations.find(c => c.id === selectedConv) ? (
            <ChatWindow
              conversation={conversations.find(c => c.id === selectedConv)!}
              onBack={() => { setSelectedConv(null); navigate('/chat', { replace: true }) }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-accent-purple/10 rounded-full flex items-center justify-center mx-auto mb-4"><MessageCircle size={28} className="text-accent-purple" /></div>
                <p className="text-text-secondary font-medium">Select a conversation</p>
                <p className="text-xs text-text-secondary mt-1">Choose from your existing chats</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
