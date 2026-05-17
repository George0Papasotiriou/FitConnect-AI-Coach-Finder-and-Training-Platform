/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Sparkles, Box, Zap, User, Target,
  ChevronRight, ChevronLeft, X, PartyPopper
} from 'lucide-react'

const STORAGE_KEY = 'abilfit-tutorial-complete'

interface TutorialStep {
  title: string
  description: string
  icon: React.ReactNode
  selector?: string // CSS selector for spotlight target
  color: string
}

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to AbiliFit!',
    description: "Your all-in-one fitness command center. Let us give you a quick tour of the platform — it'll only take a moment.",
    icon: <Zap size={32} />,
    color: 'from-accent-purple to-accent-teal',
  },
  {
    title: 'Dashboard',
    description: 'Your central hub. View daily stats, active bounties, streaks, and upcoming sessions — all at a glance.',
    icon: <LayoutDashboard size={28} />,
    selector: 'a[href="/trainee/dashboard"]',
    color: 'from-accent-purple to-accent-teal',
  },
  {
    title: 'My Progress',
    description: 'Track your transformation journey with AI-powered body analysis, recovery insights, and performance metrics.',
    icon: <Sparkles size={28} />,
    selector: 'a[href="/progress-hub"]',
    color: 'from-emerald-400 to-teal-500',
  },
  {
    title: 'Solo Trainer',
    description: 'Browse our Exercise Bestiary, log workouts, and master over 30 exercises with guided form and video tutorials.',
    icon: <Box size={28} />,
    selector: 'a[href="/virtual-gym"]',
    color: 'from-indigo-400 to-purple-500',
  },
  {
    title: 'AI Trainer',
    description: 'Your personal AI fitness coach — get instant workout plans, nutrition advice, and recovery tips 24/7.',
    icon: <Zap size={28} />,
    selector: 'a[href="/ai-trainer"]',
    color: 'from-amber-400 to-orange-500',
  },
  {
    title: 'Find a Coach',
    description: 'Connect with certified trainers worldwide. Browse profiles, book live sessions, and start your training partnership.',
    icon: <User size={28} />,
    selector: 'a[href="/my-coach"]',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    title: 'Bounties',
    description: 'Complete fitness challenges to earn XP, level up, and climb the leaderboard. New bounties drop regularly!',
    icon: <Target size={28} />,
    selector: 'a[href="/bounties"]',
    color: 'from-rose-400 to-pink-500',
  },
]

function ConfettiParticle({ delay }: { delay: number }) {
  const colors = ['#10b981', '#059669', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899']
  const color = colors[Math.floor(Math.random() * colors.length)]
  const x = Math.random() * 100
  const rotation = Math.random() * 720 - 360

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-sm"
      style={{ left: `${x}%`, top: '-10px', backgroundColor: color }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{ y: 400, opacity: 0, rotate: rotation, x: (Math.random() - 0.5) * 200 }}
      transition={{ duration: 2, delay, ease: 'easeOut' }}
    />
  )
}

export default function AppTutorial() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [spotlightPos, setSpotlightPos] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      const timer = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const updateSpotlight = useCallback(() => {
    const currentStep = STEPS[step]
    if (!currentStep?.selector) { setSpotlightPos(null); return }
    const el = document.querySelector(currentStep.selector)
    if (!el) { setSpotlightPos(null); return }
    const rect = el.getBoundingClientRect()
    const pad = 8
    setSpotlightPos({ x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 })
  }, [step])

  useEffect(() => { updateSpotlight() }, [step, updateSpotlight])
  useEffect(() => {
    window.addEventListener('resize', updateSpotlight)
    return () => window.removeEventListener('resize', updateSpotlight)
  }, [updateSpotlight])

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
  }, [])

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1)
    else complete()
  }
  const prev = () => { if (step > 0) setStep(s => s - 1) }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!visible) return
      if (e.key === 'Escape') complete()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  if (!visible) return null

  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Dark overlay with spotlight hole */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {spotlightPos && (
                <motion.rect
                  x={spotlightPos.x} y={spotlightPos.y}
                  width={spotlightPos.w} height={spotlightPos.h}
                  rx={12} fill="black"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%" height="100%"
            fill="rgba(0,0,0,0.75)"
            mask="url(#spotlight-mask)"
            style={{ pointerEvents: 'all' }}
            onClick={(e) => e.stopPropagation()}
          />
        </svg>

        {/* Spotlight ring animation */}
        {spotlightPos && (
          <motion.div
            className="absolute border-2 border-accent-purple/40 rounded-xl pointer-events-none"
            style={{ left: spotlightPos.x, top: spotlightPos.y, width: spotlightPos.w, height: spotlightPos.h }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 rounded-xl" style={{ animation: 'spotlightPulse 2s ease-in-out infinite' }} />
          </motion.div>
        )}

        {/* Tutorial card */}
        <motion.div
          key={step}
          className="relative z-10 w-full max-w-md mx-4"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: [0.25, 0.8, 0.25, 1] }}
          style={spotlightPos ? {
            position: 'absolute',
            top: spotlightPos.y + spotlightPos.h + 16,
            left: Math.min(Math.max(spotlightPos.x, 16), window.innerWidth - 420),
          } : {}}
        >
          <div className="backdrop-blur-2xl bg-bg-primary/90 border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/40">
            {/* Skip button */}
            <button
              onClick={complete}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-text-secondary/60 hover:text-text-primary hover:bg-white/5 transition-colors"
              aria-label="Skip tutorial"
            >
              <X size={16} />
            </button>

            {/* Icon */}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${current.color} flex items-center justify-center text-white mb-4 shadow-lg`}>
              {isLast ? <PartyPopper size={28} /> : current.icon}
            </div>

            {/* Content */}
            <h2 className="text-lg font-bold text-text-primary mb-1.5">
              {isLast ? "You're All Set! 🎉" : current.title}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed mb-5">
              {isLast
                ? "You've seen all the key features. Start exploring and build your ultimate fitness journey!"
                : current.description}
            </p>

            {/* Confetti on last step */}
            {isLast && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                {Array.from({ length: 20 }).map((_, i) => (
                  <ConfettiParticle key={i} delay={i * 0.05} />
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
              {/* Progress dots */}
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? 'w-6 bg-accent-purple' : i < step ? 'w-1.5 bg-accent-purple/40' : 'w-1.5 bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2">
                {step > 0 && !isFirst && (
                  <button onClick={prev}
                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <button
                  onClick={next}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-purple text-white text-sm font-semibold hover:bg-accent-purple/90 transition-colors shadow-lg shadow-accent-purple/20"
                >
                  {isLast ? "Let's Go!" : isFirst ? 'Start Tour' : 'Next'}
                  {!isLast && <ChevronRight size={15} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
