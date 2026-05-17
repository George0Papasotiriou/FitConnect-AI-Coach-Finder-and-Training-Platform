/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import Spinner from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses = {
  primary: `
    bg-gradient-to-br from-accent-purple to-accent-teal text-white border border-accent-purple
    backdrop-blur-lg
    shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),inset_0_-1px_0_0_rgba(0,0,0,0.1),0_1px_3px_0_rgba(16,185,129,0.2),0_4px_16px_-2px_rgba(16,185,129,0.25)]
    hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_8px_0_rgba(16,185,129,0.3),0_8px_28px_-4px_rgba(16,185,129,0.35)]
    hover:from-accent-purple hover:to-accent-teal
  `,
  secondary: `
    bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] text-accent-purple
    shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_1px_3px_0_var(--glass-shadow)]
    hover:bg-[var(--glass-bg-heavy)] hover:border-emerald-500/30 hover:text-accent-teal
    hover:shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_2px_8px_0_var(--glass-shadow),0_8px_24px_-4px_var(--glass-shadow-heavy)]
  `,
  ghost: `
    bg-transparent border border-transparent text-text-secondary
    hover:bg-[var(--glass-bg)] hover:backdrop-blur-lg hover:border-[var(--glass-border)]
    hover:text-text-primary hover:shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_1px_3px_0_var(--glass-shadow)]
  `,
  danger: `
    bg-gradient-to-br from-red-500/85 to-red-600/85 text-white border border-red-500/30
    backdrop-blur-lg
    shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_1px_3px_0_rgba(239,68,68,0.2),0_4px_16px_-2px_rgba(239,68,68,0.25)]
    hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_2px_8px_0_rgba(239,68,68,0.3),0_8px_28px_-4px_rgba(239,68,68,0.35)]
  `,
  teal: `
    bg-gradient-to-br from-emerald-600/90 to-emerald-700/90 text-white border border-emerald-600/30
    backdrop-blur-lg font-bold
    shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_1px_3px_0_rgba(5,150,105,0.2),0_4px_16px_-2px_rgba(5,150,105,0.25)]
    hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_8px_0_rgba(5,150,105,0.3),0_8px_28px_-4px_rgba(5,150,105,0.35)]
  `
}

const sizeClasses = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-5 py-2.5 text-sm rounded-2xl',
  lg: 'px-7 py-3.5 text-base rounded-2xl'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-300 ease-out cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </motion.button>
  )
})

Button.displayName = 'Button'
export default Button
