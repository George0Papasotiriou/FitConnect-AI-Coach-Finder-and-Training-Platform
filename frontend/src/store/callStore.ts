/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { create } from 'zustand'

interface CallState {
  activeCall: {
    sessionId: string
    isInitiator: boolean
    trainerName: string
    isAdhoc?: boolean
  } | null
  ratingSession: {
    sessionId: string
    trainerName: string
  } | null
  isMinimized: boolean
  setActiveCall: (call: CallState['activeCall']) => void
  setMinimized: (minimized: boolean) => void
  setRatingSession: (session: CallState['ratingSession']) => void
  endCall: () => void
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  ratingSession: null,
  isMinimized: false,
  setActiveCall: (call) => set({ activeCall: call, isMinimized: false }),
  setMinimized: (isMinimized) => set({ isMinimized }),
  setRatingSession: (ratingSession) => set({ ratingSession }),
  endCall: () => set((state) => {
    const ratingSession = state.activeCall ? {
      sessionId: state.activeCall.sessionId,
      trainerName: state.activeCall.trainerName
    } : null;
    return {
      activeCall: null,
      isMinimized: false,
      ratingSession
    };
  }),
}))
