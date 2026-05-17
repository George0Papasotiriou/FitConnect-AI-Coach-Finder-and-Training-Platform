/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

interface BadgeProps {
  children: React.ReactNode
  variant?: 'purple' | 'teal' | 'orange' | 'green' | 'red' | 'gray'
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

const variants = {
  purple: `
    bg-accent-purple/10 text-accent-purple border border-accent-purple/20
    backdrop-blur-sm
    shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1)]
  `,
  teal: `
    bg-accent-teal/10 text-accent-teal border border-accent-teal/20
    backdrop-blur-sm
    shadow-[inset_0_1px_0_0_rgba(5,150,105,0.1)]
  `,
  orange: `
    bg-accent-orange/10 text-accent-orange border border-accent-orange/20
    backdrop-blur-sm
    shadow-[inset_0_1px_0_0_rgba(245,158,11,0.1)]
  `,
  green: `
    bg-green-500/10 text-green-500 border border-green-500/20
    backdrop-blur-sm
    shadow-[inset_0_1px_0_0_rgba(34,197,94,0.1)]
  `,
  red: `
    bg-red-500/10 text-red-400 border border-red-500/20
    backdrop-blur-sm
    shadow-[inset_0_1px_0_0_rgba(239,68,68,0.1)]
  `,
  gray: `
    bg-[var(--glass-bg)] text-text-secondary border border-[var(--glass-border)]
    backdrop-blur-sm
    shadow-[inset_0_1px_0_0_var(--glass-inner-highlight)]
  `
}

const sizes = {
  sm: 'px-2.5 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm'
}

export default function Badge({ children, variant = 'purple', size = 'sm', dot = false, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full tracking-wide transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" aria-hidden="true" />}
      {children}
    </span>
  )
}
