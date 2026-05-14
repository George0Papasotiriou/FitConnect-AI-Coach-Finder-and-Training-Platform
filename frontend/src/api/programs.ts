/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import apiClient from './client'

export interface ProgramExercise {
  id?: string
  exerciseName: string
  exerciseCategory: string
  sets: number
  reps: number
  duration?: number
  weight?: number
  notes?: string
  sortOrder: number
  isCustom?: boolean
}

export interface ProgramDay {
  id?: string
  dayDate: string
  notes?: string
  exercises: ProgramExercise[]
}

export interface TrainingProgram {
  id: string
  userId: string
  name: string
  description: string
  days: ProgramDay[]
  createdAt: string
  updatedAt: string
}

export const programsApi = {
  getPrograms: () =>
    apiClient.get<TrainingProgram[]>('/programs').then(r => r.data),

  getProgram: (id: string) =>
    apiClient.get<TrainingProgram>(`/programs/${id}`).then(r => r.data),

  createProgram: (data: { name: string; description?: string }) =>
    apiClient.post<TrainingProgram>('/programs', data).then(r => r.data),

  updateProgram: (id: string, data: Partial<TrainingProgram>) =>
    apiClient.put<TrainingProgram>(`/programs/${id}`, data).then(r => r.data),

  deleteProgram: (id: string) =>
    apiClient.delete(`/programs/${id}`).then(r => r.data),

  saveDay: (programId: string, day: ProgramDay) =>
    apiClient.post<ProgramDay>(`/programs/${programId}/days`, day).then(r => r.data),

  deleteDay: (programId: string, dayId: string) =>
    apiClient.delete(`/programs/${programId}/days/${dayId}`).then(r => r.data),

  shareProgram: (programId: string, coachId: string) =>
    apiClient.post(`/programs/${programId}/share`, { coachId }).then(r => r.data),
}
