/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2.5 rounded-2xl text-text-secondary overflow-hidden
        bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]
        shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_1px_3px_0_var(--glass-shadow)]
        hover:text-text-primary hover:border-accent-purple/20
        hover:shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_2px_8px_0_var(--glass-shadow),0_0_20px_-4px_rgba(16,185,129,0.15)]
        transition-all duration-300 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple
        flex items-center justify-center
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: theme === 'light' ? 0 : 90,
          scale: theme === 'light' ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="absolute"
      >
        <Sun size={18} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          rotate: theme === 'dark' ? 0 : -90,
          scale: theme === 'dark' ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="absolute"
      >
        <Moon size={18} />
      </motion.div>
      
      {/* Invisible spacer to maintain button size */}
      <span className="invisible"><Sun size={18} /></span>
    </button>
  )
}
