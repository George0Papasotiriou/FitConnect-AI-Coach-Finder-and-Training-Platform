/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { chatApi } from '../../api/chat'
import { useAuthStore } from '../../store/authStore'
import { useOnlineStore } from '../../store/onlineStore'
import { useChatStore } from '../../store/chatStore'
import ChatWindow from '../../components/chat/ChatWindow'
import Avatar from '../../components/common/Avatar'

export default function Chat() {
  const { id: conversationId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { getStatus } = useOnlineStore()
  const { conversations, setConversations } = useChatStore()
  const [isLoading, setIsLoading] = useState(conversations.length === 0)
  const [selectedConv, setSelectedConv] = useState<string | null>(conversationId || null)

  useEffect(() => {
    if (conversations.length === 0) {
      chatApi.getConversations().then(data => {
        setConversations(data)
        if (conversationId) setSelectedConv(conversationId)
      }).catch(() => {}).finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
      if (conversationId) setSelectedConv(conversationId)
    }
  }, [conversationId, conversations.length, setConversations])

  const handleSelectConversation = (id: string) => {
    setSelectedConv(id)
    navigate(`/chat/${id}`, { replace: true })
  }

  return (
    <>
      <Helmet><title>Chat — AbiliFit</title></Helmet>
      <div className="h-[calc(100vh-150px)] md:h-[calc(100vh-120px)] flex rounded-2xl overflow-hidden border border-border-color bg-bg-card shadow-sm">
        {/* Conversation List */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-border-color flex flex-col ${selectedConv ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-border-color">
            <h2 className="font-bold text-text-primary flex items-center gap-2">
              <MessageCircle size={18} className="text-accent-purple" /> Messages
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-16 h-16 bg-accent-purple/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MessageCircle size={24} className="text-accent-purple" />
                </div>
                <p className="text-text-secondary text-sm font-medium">No conversations yet</p>
                <p className="text-text-secondary text-xs mt-1">Find a coach to start chatting</p>
              </div>
            ) : (
              conversations.map((conv, i) => {
                const otherUser = conv.participants?.find((p: any) => p.id !== user?.id) || { id: '', name: 'Unknown', avatar: undefined }
                const otherStatus = otherUser.id ? getStatus(otherUser.id) : 'offline' as const
                const isActive = selectedConv === conv.id

                return (
                  <motion.button
                    key={conv.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full flex items-center gap-3 p-4 transition-all text-left group ${
                      isActive
                        ? 'bg-accent-purple/10 border-l-3 border-accent-purple'
                        : 'hover:bg-bg-card-hover border-l-3 border-transparent'
                    }`}
                  >
                    <Avatar
                      src={otherUser.avatar}
                      name={otherUser.name}
                      size="md"
                      status={otherStatus}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold text-sm truncate ${isActive ? 'text-accent-purple' : 'text-text-primary'}`}>
                          {otherUser.name}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-accent-purple text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0 ml-2 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-text-secondary truncate flex-1">
                          {conv.lastMessage?.senderId === user?.id && <span className="opacity-50">You: </span>}
                          {conv.lastMessage?.content || 'No messages yet'}
                        </p>
                        {conv.lastMessage?.senderId === user?.id && conv.lastMessage?.readAt && (
                          <span className="text-[10px] text-accent-teal font-bold ml-2">Seen</span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col relative ${selectedConv ? 'flex' : 'hidden md:flex'}`}>
          <AnimatePresence mode="wait">
            {selectedConv && conversations.find(c => c.id === selectedConv) ? (
              <motion.div
                key={selectedConv}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col h-full absolute inset-0"
              >
                <ChatWindow
                  conversation={conversations.find(c => c.id === selectedConv)!}
                  onBack={() => { setSelectedConv(null); navigate('/chat', { replace: true }) }}
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex items-center justify-center absolute inset-0"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-accent-purple/20 to-accent-teal/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle size={32} className="text-accent-purple" />
                  </div>
                  <p className="text-text-primary font-semibold text-lg">Your Messages</p>
                  <p className="text-text-secondary text-sm mt-1 max-w-xs">Select a conversation to start chatting with your coach or trainee</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
