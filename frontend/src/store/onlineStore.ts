import { create } from 'zustand'

export type UserStatus = 'available' | 'in-call' | 'offline'

interface OnlineStore {
  statuses: Record<string, UserStatus>
  setStatus: (userId: string, status: UserStatus) => void
  setMultipleStatuses: (statuses: Record<string, UserStatus>) => void
  getStatus: (userId: string) => UserStatus
  removeUser: (userId: string) => void
}

export const useOnlineStore = create<OnlineStore>((set, get) => ({
  statuses: {},

  setStatus: (userId, status) =>
    set((state) => ({
      statuses: { ...state.statuses, [userId]: status }
    })),

  setMultipleStatuses: (newStatuses) =>
    set((state) => ({
      statuses: { ...state.statuses, ...newStatuses }
    })),

  getStatus: (userId) => {
    return get().statuses[userId] || 'offline'
  },

  removeUser: (userId) =>
    set((state) => {
      const { [userId]: _, ...rest } = state.statuses
      return { statuses: rest }
    })
}))
