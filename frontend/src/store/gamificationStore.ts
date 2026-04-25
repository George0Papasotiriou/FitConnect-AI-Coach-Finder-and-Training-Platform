import { create } from 'zustand'
import type { Achievement, DailyTask, UserXP } from '../api/gamification'

interface GamificationStore {
  xp: number
  level: number
  nextLevelXp: number
  currentLevelXp: number
  achievements: Achievement[]
  dailyTasks: DailyTask[]
  streak: number
  setUserXP: (data: UserXP) => void
  setAchievements: (achievements: Achievement[]) => void
  setDailyTasks: (tasks: DailyTask[]) => void
  completeTask: (taskId: string) => void
  addXP: (amount: number) => void
  setStreak: (streak: number) => void
}

export const useGamificationStore = create<GamificationStore>((set) => ({
  xp: 0,
  level: 1,
  nextLevelXp: 1000,
  currentLevelXp: 0,
  achievements: [],
  dailyTasks: [],
  streak: 0,

  setUserXP: (data) => set({
    xp: data.xp,
    level: data.level,
    nextLevelXp: data.nextLevelXp,
    currentLevelXp: data.currentLevelXp
  }),

  setAchievements: (achievements) => set({ achievements }),

  setDailyTasks: (tasks) => set({ dailyTasks: tasks }),

  completeTask: (taskId) =>
    set((state) => ({
      dailyTasks: state.dailyTasks.map((t) =>
        t.id === taskId ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
      )
    })),

  addXP: (amount) =>
    set((state) => ({ xp: state.xp + amount })),

  setStreak: (streak) => set({ streak })
}))
