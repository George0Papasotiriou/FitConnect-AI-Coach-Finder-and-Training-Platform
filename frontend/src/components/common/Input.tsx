/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { forwardRef, InputHTMLAttributes, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  type,
  className = '',
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-text-secondary mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`
            w-full bg-bg-card border rounded-xl px-4 py-3 text-text-primary
            placeholder-text-secondary transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-accent-purple
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-border-color focus:border-accent-purple'}
            ${leftIcon ? 'pl-10' : ''}
            ${isPassword || rightElement ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
        {!isPassword && rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-sm text-red-400">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
