/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 */

import { motion } from 'framer-motion'
import { ArrowUp, Loader2, Mic, MicOff, RotateCcw } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import type { LockedContext } from '../../api/analytics'

interface Props {
  onSubmit: (q: string) => void
  pending: boolean
  notice?: string | null
  lockedContext: LockedContext | null
  onClearLock: () => void
  onReset: () => void
  voiceActive?: boolean
  voiceAmplitude?: number
  onToggleVoice?: () => void
}

export function AnalyticsChatbox({
  onSubmit,
  pending,
  notice,
  lockedContext,
  onClearLock,
  onReset,
  voiceActive,
  voiceAmplitude = 0,
  onToggleVoice,
}: Props) {
  const [value, setValue] = useState('')
  const ta = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!pending) ta.current?.focus()
  }, [pending])

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || pending) return
    setValue('')
    onSubmit(trimmed)
  }

  const voiceScale = 1 + Math.min(0.5, voiceAmplitude * 0.6)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="pointer-events-auto fixed bottom-6 left-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2"
    >
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 rounded-2xl border border-white/10 bg-[#0a0a0b]/85 px-4 py-3 text-sm text-text-primary backdrop-blur-xl"
        >
          {notice}
        </motion.div>
      )}

      {lockedContext && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent-purple/40 bg-accent-purple/15 px-3 py-1.5 text-[11px] text-accent-purple"
        >
          <span className="font-bold uppercase tracking-widest">Locked</span>
          <span>
            {lockedContext.field}: <span className="font-bold">{String(lockedContext.value)}</span>
          </span>
          <button
            type="button"
            onClick={onClearLock}
            className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider hover:bg-accent-purple/20"
          >
            clear
          </button>
        </motion.div>
      )}

      <div className="flex items-end gap-2 rounded-3xl border border-white/10 bg-[#0a0a0b]/90 px-4 py-3 shadow-2xl backdrop-blur-xl">
        <textarea
          ref={ta}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          rows={1}
          disabled={pending}
          placeholder={lockedContext ? `Ask about ${lockedContext.value}…` : 'Ask anything about your fitness data…'}
          className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder-text-secondary/50 focus:outline-none disabled:opacity-50"
        />

        <button
          type="button"
          onClick={onReset}
          title="New conversation"
          className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
        >
          <RotateCcw size={15} />
        </button>

        {onToggleVoice && (
          <motion.button
            type="button"
            onClick={onToggleVoice}
            animate={voiceActive ? { scale: voiceScale } : { scale: 1 }}
            transition={{ duration: 0.1 }}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
              voiceActive
                ? 'bg-gradient-to-br from-accent-purple to-accent-teal text-white shadow-lg shadow-accent-purple/40'
                : 'text-text-secondary hover:bg-white/10 hover:text-text-primary'
            }`}
            title={voiceActive ? 'Stop voice' : 'Start voice'}
          >
            {voiceActive ? <MicOff size={15} /> : <Mic size={15} />}
          </motion.button>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || pending}
          aria-label="Send"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-purple text-white shadow-lg shadow-accent-purple/30 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
        </button>
      </div>
    </motion.div>
  )
}
