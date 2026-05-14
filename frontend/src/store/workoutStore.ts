/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

/**
 * AbiliFit — AI-Powered Fitness & Coach Finder Platform
 * Copyright © 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * File: workoutStore.ts
 * Created: 2026-05-14
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useStrengthStore } from './strengthStore'

/* ── Types ─────────────────────────────────────────────── */

export interface LoggedSet {
  reps: number
  weight: number
  timestamp: string
}

export interface WorkoutExerciseLog {
  exerciseId: string
  exerciseName: string
  category: string
  muscleGroups: string[]       // all muscles (primary + secondary)
  primaryMuscles: string[]     // just primary muscles for fatigue weighting
  secondaryMuscles: string[]   // just secondary muscles for fatigue weighting
  sets: LoggedSet[]
}

export interface CompletedWorkout {
  id: string
  date: string               // 'yyyy-MM-dd'
  startedAt: string           // ISO timestamp
  finishedAt: string          // ISO timestamp
  exercises: WorkoutExerciseLog[]
  totalVolume: number         // kg
  totalSets: number
  musclesWorked: string[]
  durationMinutes: number
  aiSummary?: string
}

/* ── Recovery constants (hours) ────────────────────────── */
export const RECOVERY_HOURS: Record<string, number> = {
  chest: 48,
  upperBack: 48,
  lowerBack: 72,
  deltoids: 48,
  biceps: 36,
  triceps: 36,
  forearms: 24,
  quads: 72,
  hamstrings: 72,
  glutes: 72,
  calves: 36,
  core: 24,
}

/* Map exercise-category names to muscle-group keys */
export const CATEGORY_TO_MUSCLES: Record<string, string[]> = {
  Chest: ['chest', 'triceps'],
  Back: ['upperBack', 'lowerBack', 'biceps'],
  Legs: ['quads', 'hamstrings', 'glutes', 'calves'],
  Shoulders: ['deltoids'],
  Arms: ['biceps', 'triceps', 'forearms'],
  Core: ['core'],
  Cardio: [],
  Flexibility: [],
  Sport: ['quads', 'hamstrings', 'core'],
}

/* ── Store ─────────────────────────────────────────────── */

interface WorkoutStore {
  completedWorkouts: CompletedWorkout[]
  currentSessionStart: string | null

  startSession: () => void
  finishWorkout: (workout: Omit<CompletedWorkout, 'id'>) => CompletedWorkout
  getWorkoutsForDate: (dateKey: string) => CompletedWorkout[]
  getWorkoutsForMonth: (year: number, month: number) => CompletedWorkout[]
  getLastWorkoutForMuscle: (muscle: string) => { workout: CompletedWorkout; hoursAgo: number } | null
  getMuscleRecoveryStatus: (muscle: string) => { percent: number; hoursRemaining: number; hoursElapsed: number; totalHours: number }
  getTotalStats: () => { workouts: number; totalVolume: number; totalSets: number; uniqueMuscles: number }
  getWeeklyWorkoutCount: () => number
  clearAll: () => void
}

export const useWorkoutStore = create<WorkoutStore>()(
  persist(
    (set, get) => ({
      completedWorkouts: [],
      currentSessionStart: null,

      startSession: () => set({ currentSessionStart: new Date().toISOString() }),

      finishWorkout: (data) => {
        const id = `w-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const workout: CompletedWorkout = { ...data, id }

        set(state => ({
          completedWorkouts: [workout, ...state.completedWorkouts],
          currentSessionStart: null,
        }))

        // Sync muscle fatigue to strengthStore — weighted for primary vs secondary
        const strengthStore = useStrengthStore.getState()
        const primaryMuscles = new Set(workout.exercises.flatMap(e => e.primaryMuscles || []))
        const secondaryMuscles = new Set(workout.exercises.flatMap(e => e.secondaryMuscles || []))

        for (const muscle of workout.musclesWorked) {
          const volumeForMuscle = workout.exercises
            .filter(ex => ex.muscleGroups.includes(muscle))
            .reduce((sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0)

          const isPrimary = primaryMuscles.has(muscle)
          const isSecondary = secondaryMuscles.has(muscle)

          // Primary muscles get higher fatigue, secondary muscles get moderate fatigue
          let fatigueLevel: number
          if (isPrimary) {
            fatigueLevel = Math.min(95, Math.round(volumeForMuscle / 40)) // Higher fatigue for primary
            fatigueLevel = Math.max(fatigueLevel, 55)  // Minimum 55% fatigue for primary
          } else if (isSecondary) {
            fatigueLevel = Math.min(70, Math.round(volumeForMuscle / 80)) // Moderate fatigue for secondary
            fatigueLevel = Math.max(fatigueLevel, 30)  // Minimum 30% fatigue for secondary
          } else {
            fatigueLevel = Math.min(60, Math.round(volumeForMuscle / 100))
            fatigueLevel = Math.max(fatigueLevel, 20)
          }

          strengthStore.updateMuscleFatigue(muscle, fatigueLevel)
        }

        return workout
      },

      getWorkoutsForDate: (dateKey) =>
        get().completedWorkouts.filter(w => w.date === dateKey),

      getWorkoutsForMonth: (year, month) =>
        get().completedWorkouts.filter(w => {
          const [y, m] = w.date.split('-').map(Number)
          return y === year && m === month
        }),

      getLastWorkoutForMuscle: (muscle) => {
        const now = Date.now()
        for (const w of get().completedWorkouts) {
          if (w.musclesWorked.includes(muscle)) {
            const hoursAgo = (now - new Date(w.finishedAt).getTime()) / (1000 * 60 * 60)
            return { workout: w, hoursAgo }
          }
        }
        return null
      },

      getMuscleRecoveryStatus: (muscle) => {
        const last = get().getLastWorkoutForMuscle(muscle)
        const totalHours = RECOVERY_HOURS[muscle] || 48
        if (!last) return { percent: 100, hoursRemaining: 0, hoursElapsed: totalHours, totalHours }
        const hoursElapsed = last.hoursAgo
        const hoursRemaining = Math.max(0, totalHours - hoursElapsed)
        const percent = Math.min(100, Math.round((hoursElapsed / totalHours) * 100))
        return { percent, hoursRemaining, hoursElapsed, totalHours }
      },

      getTotalStats: () => {
        const workouts = get().completedWorkouts
        const allMuscles = new Set<string>()
        let totalVolume = 0
        let totalSets = 0
        for (const w of workouts) {
          totalVolume += w.totalVolume
          totalSets += w.totalSets
          w.musclesWorked.forEach(m => allMuscles.add(m))
        }
        return { workouts: workouts.length, totalVolume, totalSets, uniqueMuscles: allMuscles.size }
      },

      getWeeklyWorkoutCount: () => {
        const now = Date.now()
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000
        return get().completedWorkouts.filter(w => new Date(w.finishedAt).getTime() >= weekAgo).length
      },

      clearAll: () => set({ completedWorkouts: [], currentSessionStart: null }),
    }),
    { name: 'workout-storage' }
  )
)
