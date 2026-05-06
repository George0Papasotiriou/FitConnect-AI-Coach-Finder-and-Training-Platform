import { create } from 'zustand'
import type { Conversation, Message } from '../api/chat'

interface ChatStore {
  conversations: Conversation[]
  activeConversation: string | null
  messages: Record<string, Message[]>
  typingUsers: Record<string, boolean>
  setConversations: (conversations: Conversation[]) => void
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: Message) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  setTyping: (conversationId: string, isTyping: boolean) => void
  updateConversationLastMessage: (conversationId: string, message: Message) => void
  incrementUnread: (conversationId: string) => void
  clearUnread: (conversationId: string) => void
  setMessagesRead: (conversationId: string, userId: string) => void
  removeConversation: (conversationId: string) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  conversations: [],
  activeConversation: null,
  messages: {},
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversation: id }),

  addMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] || []
      const isDuplicate = existing.some(m => m.id === message.id)
      return {
        messages: {
          ...state.messages,
          [conversationId]: isDuplicate ? existing : [...existing, message]
        }
      }
    }),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages }
    })),

  setTyping: (conversationId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [conversationId]: isTyping }
    })),

  updateConversationLastMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: message, updatedAt: message.createdAt } : c
      )
    })),

  incrementUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c
      )
    })),

  clearUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    })),

  setMessagesRead: (conversationId, userId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((m) =>
          m.senderId !== userId ? { ...m, readAt: new Date().toISOString() } : m
        )
      }
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversation: state.activeConversation === id ? null : state.activeConversation
    }))
}))
