/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 */

import type { SeriesFormat } from '../../api/analytics'

export function formatValue(
  value: unknown,
  format?: SeriesFormat['format'],
): string {
  if (value === null || value === undefined) return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) {
    if (format === 'datetime' && typeof value === 'string') {
      try {
        const d = new Date(value)
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: '2-digit',
          })
        }
      } catch {}
    }
    return String(value)
  }
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(n)
    case 'percentage':
      return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(n / 100)
    case 'duration':
      if (n < 60) return `${n.toFixed(0)}s`
      if (n < 3600) return `${(n / 60).toFixed(1)}m`
      return `${(n / 3600).toFixed(1)}h`
    case 'datetime':
      try {
        const d = new Date(n)
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      } catch {
        return String(n)
      }
    default:
      if (Math.abs(n) >= 1000) {
        return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n)
      }
      return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
}

export const CHART_PALETTE = [
  '#a78bfa', // accent-purple
  '#10b981', // accent-teal
  '#f59e0b', // accent-orange
  '#ec4899', // pink
  '#3b82f6', // blue
  '#facc15', // yellow
  '#22d3ee', // cyan
  '#f97316', // orange
]
