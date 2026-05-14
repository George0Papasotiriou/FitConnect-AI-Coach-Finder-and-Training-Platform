/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface StrengthRecord {
  id: string
  exercise: string
  weight: number
  reps: number
  muscleGroup: string
  createdAt: string
}

export interface MuscleFatigue {
  muscle: string
  fatigueLevel: number // 0 to 100
  lastWorked: string
  recoveryStartTime: string
}

interface StrengthStore {
  records: StrengthRecord[]
  fatigue: Record<string, MuscleFatigue>
  setRecords: (records: StrengthRecord[]) => void
  addRecord: (record: StrengthRecord) => void
  updateMuscleFatigue: (muscle: string, level: number) => void
  getRecoveryProgress: (muscle: string) => number // returns 0 to 100% recovered
}

export const useStrengthStore = create<StrengthStore>()(
  persist(
    (set, get) => ({
      records: [],
      fatigue: {},
      setRecords: (records) => set({ records }),
      addRecord: (record) => set((state) => ({ records: [record, ...state.records] })),
      updateMuscleFatigue: (muscle, level) => set((state) => ({
        fatigue: {
          ...state.fatigue,
          [muscle]: {
            muscle,
            fatigueLevel: level,
            lastWorked: new Date().toISOString(),
            recoveryStartTime: new Date().toISOString()
          }
        }
      })),
      getRecoveryProgress: (muscle) => {
        const data = get().fatigue[muscle]
        if (!data) return 100
        const now = new Date().getTime()
        const start = new Date(data.recoveryStartTime).getTime()
        const hoursPassed = (now - start) / (1000 * 60 * 60)
        
        // Basic recovery model: 2% per hour
        const recovered = Math.min(100, hoursPassed * 2)
        const currentFatigue = Math.max(0, data.fatigueLevel - recovered)
        return 100 - currentFatigue
      }
    }),
    { name: 'strength-storage' }
  )
)
