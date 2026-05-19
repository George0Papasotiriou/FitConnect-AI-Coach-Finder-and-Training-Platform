/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Reusable subtitle overlay for any voice-AI surface.
 *
 * Renders two captioned bars: one for the user's live transcript (interim
 * or finalised), one for the AI's reply. Designed to live at the bottom-
 * center of the viewport so it works on the global VoiceOrb modal AND
 * within the analytics canvas.
 */

import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  /** What the user is currently saying (may be interim). */
  userTranscript?: string
  /** AI's most recent response (may include the action JSON stripped out). */
  aiTranscript?: string
  /** Whether the AI is currently speaking back. Drives a subtle pulse. */
  aiSpeaking?: boolean
  /** Whether the mic is open and listening. */
  listening?: boolean
  /** Position. `inline` skips the fixed positioning so the parent controls layout. */
  position?: 'fixed' | 'inline'
  /** Extra class for the wrapper. */
  className?: string
}

export function VoiceSubtitles({
  userTranscript,
  aiTranscript,
  aiSpeaking,
  listening,
  position = 'fixed',
  className = '',
}: Props) {
  const wrapper =
    position === 'fixed'
      ? 'pointer-events-none fixed bottom-28 left-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 space-y-2'
      : 'pointer-events-none w-full space-y-2'

  return (
    <div className={`${wrapper} ${className}`} aria-live="polite">
      <AnimatePresence>
        {userTranscript && (
          <motion.div
            key="user"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex justify-end drop-shadow-2xl"
          >
            <div className="max-w-[80%] rounded-2xl border border-white/20 bg-[#1e1e24]/95 px-5 py-3 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-1.5 mb-1">
                {listening && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-purple opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-purple" />
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-widest font-black text-text-secondary">
                  You
                </span>
              </div>
              <p className="mt-1 text-[15px] font-medium text-white leading-snug">{userTranscript}</p>
            </div>
          </motion.div>
        )}

        {aiTranscript && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="flex justify-start drop-shadow-2xl"
          >
            <div className="max-w-[80%] rounded-2xl border border-accent-purple/50 bg-gradient-to-br from-accent-purple/95 to-accent-teal/95 px-5 py-3 backdrop-blur-2xl shadow-[0_8px_32px_rgba(167,139,250,0.3)]">
              <div className="flex items-center gap-1.5 mb-1">
                <motion.span
                  animate={aiSpeaking ? { scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] } : {}}
                  transition={aiSpeaking ? { duration: 1.2, repeat: Infinity } : {}}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-accent-teal"
                />
                <span className="text-[10px] uppercase tracking-widest font-black text-white/90">
                  AbiliFit AI
                </span>
              </div>
              <p className="mt-1 text-[15px] font-medium text-white leading-snug">{aiTranscript}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
