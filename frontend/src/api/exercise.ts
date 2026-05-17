/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 */

import { apiClient } from './client'

export interface ExerciseRatingResponse {
  exerciseId: string
  userRating: number
  avgRating: number
  totalRatings: number
}

export interface ExerciseRatingsMap {
  ratings: Record<string, { avg: number; count: number; userRating: number | null }>
}

export const exerciseApi = {
  async rateExercise(exerciseId: string, rating: number): Promise<ExerciseRatingResponse> {
    const { data } = await apiClient.post('/exercises/rate', { exerciseId, rating })
    return data
  },

  async getRatings(): Promise<ExerciseRatingsMap> {
    const { data } = await apiClient.get('/exercises/ratings')
    return data
  },
}
