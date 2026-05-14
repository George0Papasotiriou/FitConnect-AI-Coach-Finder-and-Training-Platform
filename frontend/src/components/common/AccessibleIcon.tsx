/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

interface AccessibleIconProps {
  icon: React.ReactNode
  label: string
  className?: string
}

export default function AccessibleIcon({ icon, label, className = '' }: AccessibleIconProps) {
  return (
    <span className={`inline-flex ${className}`} aria-hidden="true" title={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  )
}
