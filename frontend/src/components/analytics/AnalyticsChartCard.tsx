/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Draggable chart card used on the AI Analytics infinite canvas.
 *
 * Drag handle is the header (the `cursor-move` strip); the rest of the card
 * keeps normal pointer interaction so charts can be clicked for context locking.
 */

import { motion } from 'framer-motion'
import { GripHorizontal, X, Lock } from 'lucide-react'
import type { ChartSpec, LockedContext } from '../../api/analytics'
import { AnalyticsChart } from './AnalyticsChart'

export interface PositionedChart {
  id: string
  spec: ChartSpec
  data: Array<Record<string, unknown>>
  explanation: string
  x: number
  y: number
  zIndex: number
}

interface Props {
  chart: PositionedChart
  lockedContext: LockedContext | null
  scale: number
  onDragEnd: (id: string, x: number, y: number) => void
  onBringToFront: (id: string) => void
  onRemove: (id: string) => void
  onLockContext: (locked: LockedContext) => void
}

const CARD_WIDTH = 560

export function AnalyticsChartCard({
  chart,
  lockedContext,
  scale,
  onDragEnd,
  onBringToFront,
  onRemove,
  onLockContext,
}: Props) {
  const isLocked = lockedContext?.chartId === chart.id

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => onBringToFront(chart.id)}
      onDragEnd={(_, info) => {
        // info.offset is in screen pixels but we want canvas-space delta.
        const dx = info.offset.x / scale
        const dy = info.offset.y / scale
        onDragEnd(chart.id, chart.x + dx, chart.y + dy)
      }}
      // We pin via style.left/top so positions persist across rerenders.
      style={{
        position: 'absolute',
        left: chart.x,
        top: chart.y,
        width: CARD_WIDTH,
        zIndex: chart.zIndex,
      }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      onMouseDown={() => onBringToFront(chart.id)}
      className="rounded-2xl border border-white/10 bg-[#0a0a0b]/85 shadow-2xl backdrop-blur-2xl overflow-hidden"
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] cursor-move active:cursor-grabbing select-none"
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-2 pointer-events-none min-w-0">
          <GripHorizontal size={12} className="text-text-secondary opacity-60 shrink-0" />
          <span className="text-[11px] uppercase tracking-wider font-bold text-text-secondary truncate">
            {chart.spec.title}
          </span>
          {isLocked && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent-purple/20 px-2 py-0.5 text-[10px] font-bold text-accent-purple">
              <Lock size={10} />
              <span>filtered</span>
            </span>
          )}
        </div>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(chart.id)}
          className="rounded-md p-1 text-text-secondary hover:bg-white/10 hover:text-text-primary transition-colors"
          aria-label="Remove chart"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 pt-3" onPointerDownCapture={(e) => e.stopPropagation()}>
        <div className="mb-3">
          <h3 className="text-sm font-bold text-text-primary">{chart.spec.title}</h3>
          {chart.spec.description && (
            <p className="mt-0.5 text-[11px] text-text-secondary">{chart.spec.description}</p>
          )}
        </div>
        <AnalyticsChart
          chartId={chart.id}
          spec={chart.spec}
          data={chart.data}
          lockedContext={lockedContext}
          onLockContext={onLockContext}
        />
        {chart.explanation && (
          <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-text-secondary">
            {chart.explanation}
          </p>
        )}
      </div>
    </motion.div>
  )
}
