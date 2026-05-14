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
  isMinimized: boolean
  setActiveCall: (call: CallState['activeCall']) => void
  setMinimized: (minimized: boolean) => void
  endCall: () => void
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  isMinimized: false,
  setActiveCall: (call) => set({ activeCall: call, isMinimized: false }),
  setMinimized: (isMinimized) => set({ isMinimized }),
  endCall: () => set({ activeCall: null, isMinimized: false }),
}))
