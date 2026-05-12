import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Bounty {
  id: string
  title: string
  description: string
  xpReward: number
  exerciseType: string
  goalValue: number
  expiresAt?: string
  status?: 'pending' | 'completed' | 'failed'
}

interface BountyStore {
  bounties: Bounty[]
  setBounties: (bounties: Bounty[]) => void
  completeBounty: (id: string) => void
}

export const useBountyStore = create<BountyStore>()(
  persist(
    (set) => ({
      bounties: [],
      setBounties: (bounties) => set({ bounties }),
      completeBounty: (id) => set((state) => ({
        bounties: state.bounties.map(b => b.id === id ? { ...b, status: 'completed' } : b)
      })),
    }),
    { name: 'bounty-storage' }
  )
)
