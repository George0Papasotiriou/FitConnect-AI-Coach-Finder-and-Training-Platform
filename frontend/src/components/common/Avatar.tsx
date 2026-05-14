/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState } from 'react'
import type { UserStatus } from '../../store/onlineStore'

interface AvatarProps {
  src?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xl2'
  isOnline?: boolean
  status?: UserStatus
  className?: string
  showStatus?: boolean
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl',
  xl2: 'w-32 h-32 text-4xl'
}

const dotSizes = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
  xl: 'w-5 h-5',
  xl2: 'w-6 h-6'
}

const dotBorder = {
  xs: 'border',
  sm: 'border-2',
  md: 'border-2',
  lg: 'border-2',
  xl: 'border-[3px]',
  xl2: 'border-[4px]'
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getColorFromName(name?: string) {
  const colors = [
    'bg-purple-500', 'bg-teal-500', 'bg-blue-500', 'bg-orange-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-green-500', 'bg-red-500'
  ]
  if (!name) return colors[0]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

function getStatusColor(status?: UserStatus, isOnline?: boolean): string {
  if (status === 'available') return 'bg-green-500'
  if (status === 'in-call') return 'bg-red-500'
  if (status === 'offline') return 'bg-gray-500'
  // Fallback to isOnline prop
  if (isOnline === true) return 'bg-green-500'
  if (isOnline === false) return 'bg-gray-500'
  return 'bg-gray-500'
}

function getStatusLabel(status?: UserStatus, isOnline?: boolean): string {
  if (status === 'available') return 'Available'
  if (status === 'in-call') return 'In a call'
  if (status === 'offline') return 'Offline'
  if (isOnline === true) return 'Online'
  return 'Offline'
}

function shouldPulse(status?: UserStatus, isOnline?: boolean): boolean {
  return status === 'available' || (status === undefined && isOnline === true)
}

export default function Avatar({ src, name, size = 'md', isOnline, status, className = '', showStatus = true }: AvatarProps) {
  const hasStatus = status !== undefined || isOnline !== undefined
  const [imgError, setImgError] = useState(false)

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {src && !imgError ? (
        <img
          src={src.startsWith('http') ? src : `http://localhost:3001${src}`}
          alt={name ? `${name}'s avatar` : 'User avatar'}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-border-color`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={`${sizes[size]} ${getColorFromName(name)} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-border-color`}
          aria-label={name ? `${name}'s avatar` : 'User avatar'}
        >
          {getInitials(name)}
        </div>
      )}
      {showStatus && hasStatus && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full ${dotBorder[size]} border-bg-card ${getStatusColor(status, isOnline)} ${shouldPulse(status, isOnline) ? 'animate-status-pulse' : ''}`}
          aria-label={getStatusLabel(status, isOnline)}
          title={getStatusLabel(status, isOnline)}
        />
      )}
    </div>
  )
}
