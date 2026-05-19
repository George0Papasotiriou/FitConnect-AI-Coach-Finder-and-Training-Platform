/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * VoiceOrb — global floating voice assistant.
 *
 * UX goals
 *  - One clear call-to-action: tap the orb to talk.
 *  - User can SEE where they are on the platform (the "You are here" chip)
 *    so they can validate the assistant's actions against reality.
 *  - User can SEE what the assistant just did (the recent-actions list).
 *  - Closing the panel is a hard kill — TTS stops, mic stops, no creepy
 *    voices in the background.
 *  - Soothing female voice via lib/voiceSynth, soft purple/teal palette.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic, MicOff, X, MapPin, CheckCircle2, AlertCircle, Sparkles, Loader2,
} from 'lucide-react'
import { useVoiceAI } from '../../hooks/useVoiceAI'
import { VoiceSubtitles } from './VoiceSubtitles'

const GREETINGS = [
  "Hi — I'm here whenever you need me. Tap the orb when you'd like to talk.",
  "Hey there. Tap the orb and I'll listen.",
  "Ready when you are. Just tap to start.",
]

/**
 * Map well-known routes to a friendly label so the validation chip reads as
 * "You are on My Programs" instead of "/programs".
 */
const PATH_LABELS: Record<string, string> = {
  '/trainee/dashboard': 'Trainee dashboard',
  '/trainer/dashboard': 'Trainer dashboard',
  '/admin/dashboard': 'Admin dashboard',
  '/progress-hub': 'My progress',
  '/programs': 'My programs',
  '/my-coach': 'My coach',
  '/search': 'Coach search',
  '/ai-trainer': 'AI trainer chat',
  '/form-critic': 'Form critic',
  '/recovery': 'Recovery dashboard',
  '/circadian': 'Circadian optimizer',
  '/bounties': 'Bounties',
  '/map': 'Sweat map',
  '/virtual-gym': 'Solo trainer',
  '/leaderboard': 'Leaderboard',
  '/achievements': 'Achievements',
  '/notifications': 'Notifications',
  '/settings': 'Settings',
  '/chat': 'Messages',
  '/trainer/clients': 'My clients',
  '/trainer/sessions': 'Sessions',
  '/trainer/profile': 'Trainer profile',
}

function labelForPath(path: string): string {
  if (PATH_LABELS[path]) return PATH_LABELS[path]
  // Strip leading slash; capitalise each segment for a readable fallback.
  return path
    .replace(/^\//, '')
    .split(/[/-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ') || 'Home'
}

export default function VoiceOrb() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)

  const {
    isListening,
    isProcessing,
    transcript,
    interim,
    response,
    aiSpeaking,
    amplitude,
    actionLog,
    currentPath,
    startListening,
    stopListening,
    speak,
  } = useVoiceAI()

  /* Open / close ───────────────────────────────────────────────────── */
  const handleClose = useCallback(() => {
    // Hard kill: stop mic, drain TTS. useVoiceAI handles both.
    stopListening()
    setIsOpen(false)
  }, [stopListening])

  const handleToggleOpen = useCallback(() => {
    if (isOpen) {
      handleClose()
    } else {
      setHasGreeted(false)
      setIsOpen(true)
    }
  }, [isOpen, handleClose])

  /* Greet once shortly after opening so the user knows what to do.
   * We DO NOT auto-start the mic — the orb is an explicit tap target.
   * That removes the "is it always listening?" creepiness. */
  useEffect(() => {
    if (!isOpen || hasGreeted) return
    const t = window.setTimeout(() => {
      const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)]
      speak(g)
      setHasGreeted(true)
    }, 250)
    return () => window.clearTimeout(t)
  }, [isOpen, hasGreeted, speak])

  /* Stop everything on unmount. */
  useEffect(() => {
    return () => {
      stopListening()
    }
  }, [stopListening])

  /* Tap-the-orb toggles mic. Closing the modal also stops the mic. */
  const handleMicTap = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      void startListening()
    }
  }, [isListening, startListening, stopListening])

  /* Keyboard: Escape to close. */
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, handleClose])

  const orbScale = 1 + Math.min(0.45, amplitude * 0.4)
  const friendlyPath = useMemo(() => labelForPath(currentPath), [currentPath])

  const status: string = isProcessing
    ? 'Thinking…'
    : isListening
      ? aiSpeaking
        ? '…pausing — I hear you'
        : 'Listening'
      : aiSpeaking
        ? 'Speaking'
        : 'Tap the orb to talk'

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-between"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, rgba(124,58,237,0.18), transparent 60%), rgba(6,6,12,0.92)',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Voice assistant"
          >
            {/* Top bar */}
            <div className="w-full flex items-start justify-between p-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-xl">
                <MapPin size={11} className="text-accent-teal" />
                <span className="uppercase tracking-widest font-bold text-white/55">You are on</span>
                <span className="text-white">{friendlyPath}</span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close voice assistant"
              >
                <X size={16} />
              </button>
            </div>

            {/* Center stage */}
            <div className="flex flex-1 w-full flex-col items-center justify-center gap-8 px-6">
              {/* Orb */}
              <motion.button
                type="button"
                onClick={handleMicTap}
                whileTap={{ scale: 0.96 }}
                animate={{ scale: isListening ? orbScale : 1 }}
                transition={{ duration: 0.08 }}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                className="relative flex items-center justify-center focus:outline-none"
              >
                {/* Soft outer halo */}
                <motion.div
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  animate={{
                    scale: aiSpeaking ? [1, 1.18, 1] : isListening ? [1, 1.05, 1] : [1, 1.03, 1],
                    opacity: aiSpeaking ? [0.45, 0.7, 0.45] : isListening ? [0.55, 0.85, 0.55] : [0.35, 0.5, 0.35],
                  }}
                  transition={{ duration: aiSpeaking ? 2.4 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    background:
                      'radial-gradient(circle, rgba(167,139,250,0.55), rgba(16,185,129,0.0) 70%)',
                    filter: 'blur(40px)',
                    inset: '-60px',
                  }}
                />
                {/* Concentric ripples while listening */}
                {isListening && [0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    aria-hidden
                    className="absolute rounded-full border"
                    style={{
                      borderColor: 'rgba(167,139,250,0.4)',
                      width: 180,
                      height: 180,
                    }}
                    animate={{ scale: [1, 1.45 + i * 0.18], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35, ease: 'easeOut' }}
                  />
                ))}
                {/* Inner orb body */}
                <div
                  className="relative flex h-44 w-44 items-center justify-center rounded-full"
                  style={{
                    background: aiSpeaking
                      ? 'radial-gradient(circle at 38% 32%, #c4b5fd, #a78bfa 45%, #7c3aed 80%)'
                      : 'radial-gradient(circle at 38% 32%, #6ee7b7, #34d399 45%, #10b981 80%)',
                    boxShadow: aiSpeaking
                      ? '0 0 64px rgba(167,139,250,0.55), inset 0 -8px 24px rgba(0,0,0,0.18), inset 0 8px 24px rgba(255,255,255,0.25)'
                      : isListening
                        ? `0 0 ${48 + amplitude * 70}px rgba(16,185,129,0.55), inset 0 -8px 24px rgba(0,0,0,0.18), inset 0 8px 24px rgba(255,255,255,0.25)`
                        : '0 0 36px rgba(16,185,129,0.35), inset 0 -8px 24px rgba(0,0,0,0.18), inset 0 8px 24px rgba(255,255,255,0.25)',
                  }}
                >
                  {isProcessing ? (
                    <Loader2 size={44} className="text-white animate-spin" />
                  ) : isListening ? (
                    <Mic size={48} className="text-white" />
                  ) : (
                    <MicOff size={48} className="text-white/85" />
                  )}
                </div>
              </motion.button>

              {/* Status line */}
              <div className="text-center">
                <div className="text-sm text-white">{status}</div>
                {!isListening && !isProcessing && !aiSpeaking && (
                  <div className="mt-2 text-[11px] text-white/45">
                    Try{' '}
                    <span className="text-white/70">"open my programs"</span>{' '}
                    ·{' '}
                    <span className="text-white/70">"start a 90-second timer"</span>{' '}
                    ·{' '}
                    <span className="text-white/70">"log a set at 60 kilos"</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom: recent actions panel (validation UI) */}
            <div className="w-full p-5 pb-7 flex flex-col gap-4">
              <VoiceSubtitles
                userTranscript={interim || transcript}
                aiTranscript={response}
                aiSpeaking={aiSpeaking}
                listening={isListening}
                position="inline"
              />
              <AnimatePresence>
                {actionLog.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-xl"
                  >
                    <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/55">
                      <Sparkles size={11} className="text-accent-teal" />
                      Recent actions
                    </div>
                    <ul className="space-y-1.5">
                      {actionLog.slice(0, 4).map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-[12px] text-white/85">
                          {a.ok ? (
                            <CheckCircle2 size={13} className="text-accent-teal shrink-0" />
                          ) : (
                            <AlertCircle size={13} className="text-amber-400 shrink-0" />
                          )}
                          <span className="truncate">{a.summary}</span>
                          <span className="ml-auto shrink-0 text-[10px] text-white/40 font-mono">
                            {Math.round((Date.now() - a.at) / 1000)}s
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating launcher */}
      <motion.button
        onClick={handleToggleOpen}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        style={{
          background: 'linear-gradient(135deg, #6ee7b7 0%, #10b981 60%, #a78bfa 110%)',
          boxShadow: '0 8px 30px rgba(16,185,129,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset',
        }}
        aria-label="Open voice assistant"
        aria-expanded={isOpen}
      >
        <motion.div
          animate={isOpen ? {} : { scale: [1, 1.12, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Mic size={22} className="text-white" />
        </motion.div>
      </motion.button>
    </>
  )
}
