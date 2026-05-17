/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { HTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glass?: boolean
  gradient?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingClasses = { sm: 'p-4', md: 'p-6', lg: 'p-8', none: '' }

export default function Card({
  hover = false,
  glass = false,
  gradient = false,
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const base = `
    rounded-3xl border transition-all duration-400
    ${glass
      ? 'glass-card'
      : `bg-[var(--glass-bg-heavy)] backdrop-blur-xl border-[var(--glass-border)]
         shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_1px_3px_0_var(--glass-shadow),0_4px_16px_-2px_var(--glass-shadow)]`
    }
    ${gradient ? 'bg-gradient-to-br from-[var(--glass-bg)] to-[var(--glass-bg-heavy)]' : ''}
    ${paddingClasses[padding]}
    ${hover ? `hover:border-accent-purple/30 hover:shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_2px_8px_0_var(--glass-shadow),0_12px_32px_-4px_var(--glass-shadow-heavy)] cursor-pointer` : ''}
    ${className}
  `

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -3, scale: 1.005 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={base}
        {...(props as React.ComponentProps<typeof motion.div>)}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={base} {...props}>
      {children}
    </div>
  )
}
