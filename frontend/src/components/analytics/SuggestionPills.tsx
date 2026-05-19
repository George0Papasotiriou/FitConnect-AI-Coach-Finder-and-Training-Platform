/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Suggestion pills — premium two-column grid positioned on the left side
 * of the analytics canvas with glassmorphism cards and stagger animations.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, ArrowRight } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

interface Props {
  suggestions: string[]
  onSelect: (s: string) => void
  loading?: boolean
}

export function SuggestionPills({ suggestions, onSelect, loading }: Props) {
  const theme = useThemeStore((s) => s.theme)
  const isDark = theme === 'dark'

  if (!suggestions.length && !loading) return null

  const cardBg = isDark
    ? 'bg-[rgba(14,14,20,0.88)]'
    : 'bg-white/90'
  const cardBorder = isDark
    ? 'border-white/[0.08]'
    : 'border-black/[0.08]'
  const pillBg = isDark
    ? 'bg-white/[0.04] hover:bg-accent-purple/15'
    : 'bg-black/[0.02] hover:bg-accent-purple/8'
  const pillBorder = isDark
    ? 'border-white/[0.06] hover:border-accent-purple/50'
    : 'border-black/[0.06] hover:border-accent-purple/40'
  const pillText = isDark ? 'text-white/85' : 'text-black/80'
  const mutedText = isDark ? 'text-white/40' : 'text-black/40'
  const skelBg = isDark ? 'bg-white/[0.05]' : 'bg-black/[0.04]'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`rounded-2xl border ${cardBorder} ${cardBg} backdrop-blur-2xl p-4 shadow-2xl w-[340px]`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-purple/15">
          <Lightbulb size={12} className="text-accent-purple" />
        </div>
        <span className={`text-[10px] uppercase tracking-[0.15em] font-bold ${mutedText}`}>
          Suggested questions
        </span>
      </div>

      {/* Pills grid */}
      <div className="flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <motion.div
                  key={`skel-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.05 }}
                  className={`h-10 rounded-xl ${skelBg} animate-pulse`}
                />
              ))
            : suggestions.slice(0, 8).map((s, i) => (
                <motion.button
                  key={s}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30, delay: i * 0.04 }}
                  onClick={() => onSelect(s)}
                  type="button"
                  className={`group flex items-center gap-2 text-left rounded-xl border px-3 py-2.5 text-[11px] leading-snug font-medium transition-all duration-200 ${pillBg} ${pillBorder} ${pillText}`}
                >
                  <span className="flex-1">{s}</span>
                  <ArrowRight
                    size={11}
                    className="shrink-0 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all duration-200"
                  />
                </motion.button>
              ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
