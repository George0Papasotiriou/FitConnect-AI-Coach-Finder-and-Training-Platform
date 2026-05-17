/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnatomyFront, AnatomyBack, MuscleGroup } from '../ai/AnatomyModel'

export const BODY_PARTS = [
  { key: 'chest',          label: 'Chest' },
  { key: 'upperBack',      label: 'Upper Back' },
  { key: 'lowerBack',      label: 'Lower Back' },
  { key: 'deltoids',       label: 'Shoulders (Deltoids)' },
  { key: 'biceps',         label: 'Biceps' },
  { key: 'triceps',        label: 'Triceps' },
  { key: 'forearms',       label: 'Forearms' },
  { key: 'quads',          label: 'Quads (Thighs)' },
  { key: 'hamstrings',     label: 'Hamstrings' },
  { key: 'glutes',         label: 'Glutes' },
  { key: 'calves',         label: 'Calves' },
  { key: 'core',           label: 'Core / Abs' },
]

interface BodyFigureProps {
  selected: string[]
  onToggle?: (part: string) => void
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = { sm: 160, md: 240, lg: 300 }

export default function BodyFigure({ selected, onToggle, size = 'md' }: BodyFigureProps) {
  const [view, setView] = useState<'front' | 'back'>('front')
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null)
  
  const isInteractive = !!onToggle
  const w = SIZE_MAP[size]
  const h = Math.round(w * 1.8)

  const isSelected = (muscle: string) => selected.includes(muscle)

  // Returns color for AnatomyModel paths.
  // We use values that ensure "isHighlighted" is true in AnatomyModel (not 'rgba(100,100,120,0.06)')
  const getColor = (muscle: MuscleGroup) => {
    if (isSelected(muscle)) return '#ef4444' // Selected / Injured
    return 'rgba(148, 163, 184, 0.15)' // Neutral Slate
  }

  const handleMuscleClick = (muscle: MuscleGroup) => {
    if (onToggle) {
      onToggle(muscle)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Front / Back Toggle Selector */}
      <div className="flex bg-bg-primary p-1 rounded-xl border border-border-color shadow-inner" style={{ maxWidth: '180px' }}>
        {(['front', 'back'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`relative px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              view === v
                ? 'bg-accent-purple text-white shadow-md'
                : 'text-text-secondary hover:text-text-primary bg-transparent'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Anatomy Model Container */}
      <div 
        className="relative flex items-center justify-center bg-bg-primary/20 rounded-2xl p-4 border border-border-color/30 backdrop-blur-sm"
        style={{ width: `${w + 40}px`, height: `${h + 40}px` }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex items-center justify-center"
          >
            {view === 'front' ? (
              <AnatomyFront
                getColor={getColor}
                hoveredMuscle={hoveredMuscle}
                setHoveredMuscle={setHoveredMuscle as any}
                onMuscleClick={handleMuscleClick}
              />
            ) : (
              <AnatomyBack
                getColor={getColor}
                hoveredMuscle={hoveredMuscle}
                setHoveredMuscle={setHoveredMuscle as any}
                onMuscleClick={handleMuscleClick}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Hover label overlay */}
        {hoveredMuscle && isInteractive && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/85 border border-border-color px-2.5 py-1 rounded-lg pointer-events-none shadow-xl text-[10px] font-black uppercase tracking-wider text-accent-teal">
            {BODY_PARTS.find(p => p.key === hoveredMuscle)?.label ?? hoveredMuscle}
          </div>
        )}
      </div>

      {/* Selected Limbs Legend */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
          {selected.map(key => {
            const part = BODY_PARTS.find(p => p.key === key)
            return (
              <span
                key={key}
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold border transition-all animate-pulse"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.3)' }}
              >
                🚨 {part?.label ?? key}
              </span>
            )
          })}
        </div>
      )}

      {isInteractive && (
        <p className="text-[11px] text-center text-text-secondary font-medium tracking-wide">
          Tap any muscle group on the model to flag pain or injury points
        </p>
      )}
    </div>
  )
}
