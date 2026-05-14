/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import apiClient from './client'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xpReward: number
  progress: number
  maxProgress: number
  unlocked: boolean
  unlockedAt?: string
  category: string
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  avatar?: string
  xp: number
  level: number
  achievements: number
}

export interface DailyTask {
  id: string
  title: string
  description: string
  xpReward: number
  completed: boolean
  completedAt?: string
  type: string
}

export interface UserXP {
  xp: number
  level: number
  nextLevelXp: number
  currentLevelXp: number
}

export const gamificationApi = {
  getAchievements: () =>
    apiClient.get<Achievement[]>('/gamification/achievements').then(r => r.data),

  getLeaderboard: (period: 'weekly' | 'monthly' | 'all-time' = 'weekly') =>
    apiClient.get<LeaderboardEntry[]>('/gamification/leaderboard', { params: { period } }).then(r => r.data),

  getDailyTasks: () =>
    apiClient.get<DailyTask[]>('/gamification/daily-tasks').then(r => r.data),

  completeTask: (taskId: string) =>
    apiClient.post(`/gamification/daily-tasks/${taskId}/complete`).then(r => r.data),

  getUserXP: () =>
    apiClient.get<UserXP>('/gamification/xp').then(r => r.data)
}
