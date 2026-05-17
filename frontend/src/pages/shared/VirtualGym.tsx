/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

/**
 * AbiliFit — AI-Powered Fitness & Coach Finder Platform
 * Copyright © 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * File: VirtualGym.tsx
 * Created: 2026-05-14
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import {
  Search, Play, Pause, Star, ChevronLeft,
  Dumbbell, Timer, Zap, Trophy, Plus, Minus,
  BookOpen, Activity, Mic, MicOff, Clock,
  Music, Volume2, SkipForward, SkipBack,
  X, Scale, Car, BusFront, Bird,
  Volume1, CheckCircle, Flame,
  RotateCcw, Info, Bookmark, StopCircle, Sparkles, TrendingUp
} from 'lucide-react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { toast } from 'sonner'
import { EXERCISES, Exercise, MUSCLE_MAP, BODY_PART_FILTERS } from '../../data/exercises'
import { AnatomyFront, AnatomyBack, MuscleGroup } from '../../components/ai/AnatomyModel'
import { useWorkoutStore, CATEGORY_TO_MUSCLES, type WorkoutExerciseLog } from '../../store/workoutStore'
import { aiApi } from '../../api/ai'
import { exerciseApi } from '../../api/exercise'
import { format } from 'date-fns'

// ── Types ──
type HubView = 'HUB' | 'BESTIARY' | 'EXERCISE_DETAIL'

interface WorkoutSet { reps: number; weight: number; timestamp: Date }
interface SessionLog { exerciseId: string; sets: WorkoutSet[] }

// ── Milestones ──
const MILESTONES = [
  { threshold: 0, label: 'Getting Started', emoji: '🪶', color: 'var(--text-secondary)' },
  { threshold: 500, label: 'A Grand Piano', emoji: '🎹', color: '#10b981' },
  { threshold: 1000, label: 'A Small Horse', emoji: '🐎', color: '#f59e0b' },
  { threshold: 2500, label: 'An SUV Car', emoji: '🚗', color: '#3b82f6' },
  { threshold: 5000, label: 'An Elephant', emoji: '🐘', color: '#8b5cf6' },
  { threshold: 10000, label: 'A School Bus', emoji: '🚌', color: '#ef4444' },
  { threshold: 25000, label: 'A Space Shuttle', emoji: '🚀', color: '#06b6d4' },
]

const fmt = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

const getMilestone = (vol: number) =>
  [...MILESTONES].reverse().find(m => vol >= m.threshold) || MILESTONES[0]
const getNextMilestone = (vol: number) =>
  MILESTONES.find(m => m.threshold > vol)

const getMuscleFill = (exercise: Exercise | null, muscle: MuscleGroup): string => {
  if (!exercise) return 'rgba(100,100,120,0.06)'
  const isPrimary = exercise.muscleGroups.primary.some(p => MUSCLE_MAP[p.toLowerCase()] === muscle)
  const isSecondary = exercise.muscleGroups.secondary.some(s => MUSCLE_MAP[s.toLowerCase()] === muscle)
  if (isPrimary) return 'var(--accent-purple)'
  if (isSecondary) return 'rgba(16,185,129,0.3)'
  return 'rgba(100,100,120,0.06)'
}

// ── Thumbnail Card — lazy-loaded via IntersectionObserver, static first frame only ──
function ExerciseThumb({ exercise, onClick, isFav, onFav }: {
  exercise: Exercise; onClick: () => void; isFav: boolean; onFav: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const vidRef = useRef<HTMLVideoElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Only start loading video when card scrolls into viewport
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); obs.disconnect() } },
      { rootMargin: '200px' } // start loading slightly before visible
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Once visible & video element exists, seek to first frame and pause
  useEffect(() => {
    if (!isVisible) return
    const v = vidRef.current
    if (!v) return
    const handler = () => { v.currentTime = 0.5; v.pause(); setIsLoaded(true) }
    v.addEventListener('loadeddata', handler, { once: true })
    return () => v.removeEventListener('loadeddata', handler)
  }, [isVisible])

  return (
    <div ref={containerRef} className="group cursor-pointer" onClick={onClick}>
      <div className="aspect-[4/5] bg-bg-card rounded-2xl overflow-hidden border border-border-color relative transition-all duration-200 group-hover:border-accent-purple/40 group-hover:shadow-lg group-hover:-translate-y-1">
        {/* Placeholder (always present behind video) */}
        <div className={`absolute inset-0 flex items-center justify-center bg-bg-card transition-opacity duration-500 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}>
          <Dumbbell size={28} className="text-text-secondary opacity-20 animate-pulse" />
        </div>

        {isVisible && (
          <video
            ref={vidRef}
            src={exercise.videoUrl}
            muted
            playsInline
            preload="metadata"
            className={`w-full h-full object-contain pointer-events-none transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
        {/* Fav button */}
        <button
          onClick={e => { e.stopPropagation(); onFav() }}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg bg-bg-primary/80 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10 border border-border-color"
        >
          <Bookmark size={14} className={isFav ? 'text-accent-purple fill-current' : 'text-text-secondary'} />
        </button>
        {/* Category pill */}
        <div className="absolute bottom-2.5 left-2.5">
          <span className="px-2 py-0.5 bg-bg-primary/80 backdrop-blur rounded-md text-[9px] font-bold text-text-secondary uppercase tracking-wider border border-border-color">
            {exercise.category}
          </span>
        </div>
      </div>
      <div className="mt-3 px-0.5">
        <h3 className="text-sm font-bold text-text-primary group-hover:text-accent-purple transition-colors leading-snug">{exercise.name}</h3>
        <p className="text-[10px] text-text-secondary font-medium mt-0.5">{exercise.muscleGroups.primary.join(', ')}</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════
export default function SoloTrainingHub() {
  const [view, setView] = useState<HubView>('HUB')
  const [selectedExercise, setSelectedExercise] = useState<Exercise>(EXERCISES[0])
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeBodyPart, setActiveBodyPart] = useState('All')

  // Training
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([])
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(60)

  // Timer
  const [timerDuration, setTimerDuration] = useState(60)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerActive, setTimerActive] = useState(false)

  // Voice
  const [voiceActive, setVoiceActive] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Music
  const [musicUrl, setMusicUrl] = useState('')

  // Hype
  const [hypeLevel, setHypeLevel] = useState(0)

  // Favorites
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  // Muscle hover for anatomy
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null)

  // Exercise ratings from DB
  const [exerciseRatings, setExerciseRatings] = useState<Record<string, { avg: number; count: number; userRating: number | null }>>({})
  const [ratingAnimKey, setRatingAnimKey] = useState(0)

  // Load ratings on mount
  useEffect(() => {
    exerciseApi.getRatings().then(data => setExerciseRatings(data.ratings)).catch(() => {})
  }, [])

  const handleRateExercise = async (exerciseId: string, rating: number) => {
    setRatingAnimKey(k => k + 1)
    // Optimistic update
    setExerciseRatings(prev => ({
      ...prev,
      [exerciseId]: { avg: rating, count: (prev[exerciseId]?.count || 0) + (prev[exerciseId]?.userRating ? 0 : 1), userRating: rating }
    }))
    try {
      const res = await exerciseApi.rateExercise(exerciseId, rating)
      setExerciseRatings(prev => ({
        ...prev,
        [exerciseId]: { avg: res.avgRating, count: res.totalRatings, userRating: res.userRating }
      }))
      toast.success(`Rated ${rating}/5 ⭐`, { duration: 1500 })
    } catch { toast.error('Failed to save rating') }
  }

  // Workout store integration
  const workoutStore = useWorkoutStore()
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [showSummary, setShowSummary] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [lastFinishedWorkout, setLastFinishedWorkout] = useState<any>(null)

  // ── Computed ──
  const totalVolume = useMemo(() =>
    sessionLogs.reduce((acc, log) =>
      acc + log.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0
    ), [sessionLogs])

  const milestone = getMilestone(totalVolume)
  const nextMilestone = getNextMilestone(totalVolume)
  const totalSets = sessionLogs.reduce((a, l) => a + l.sets.length, 0)

  const filteredExercises = useMemo(() =>
    EXERCISES.filter(ex => {
      const matchSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.bodyPart.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ex.equipment.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchPart = activeBodyPart === 'All' 
        ? true 
        : activeBodyPart === 'Favorites' 
          ? favorites.has(ex.id)
          : (ex.bodyPart === activeBodyPart || ex.muscleGroups.primary.some(m => m.toLowerCase().includes(activeBodyPart.toLowerCase())))
          
      return matchSearch && matchPart
    }), [searchQuery, activeBodyPart, favorites])

  // ── Voice ──
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SR) {
      const r = new SR()
      r.continuous = true; r.interimResults = false; r.lang = 'en-US'
      r.onresult = (e: any) => {
        const t = e.results[e.results.length - 1][0].transcript.toLowerCase().trim()
        const wordMap: Record<string, number> = {
          one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
          eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
        }
        const num = wordMap[t] || parseInt(t.match(/\b(\d+)\b/)?.[1] || '')
        if (!isNaN(num) && num > 0 && num <= 100) {
          setReps(num)
          setHypeLevel(p => Math.min(100, p + 12))
          toast.success(`🎙️ Voice: ${num} reps`, { duration: 1500 })
        }
      }
      r.onerror = () => setVoiceActive(false)
      recognitionRef.current = r
    }
  }, [])

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) { toast.error('Voice not supported'); return }
    if (voiceActive) { recognitionRef.current.stop(); setVoiceActive(false) }
    else { recognitionRef.current.start(); setVoiceActive(true); toast.info('🎙️ Listening...', { duration: 2000 }) }
  }, [voiceActive])

  // ── Timer ──
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000)
    return () => clearInterval(id)
  }, [timerActive, timeLeft])

  useEffect(() => {
    if (timerActive && timeLeft === 0) {
      setTimerActive(false)
      try {
        const ctx = new AudioContext()
        const beep = (freq: number, t: number) => {
          const o = ctx.createOscillator(); const g = ctx.createGain()
          o.connect(g); g.connect(ctx.destination)
          o.frequency.value = freq; g.gain.value = 0.3
          o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.15)
        }
        beep(880, 0); beep(880, 0.2); beep(1320, 0.4)
      } catch (_) { /* no audio context */ }
      toast.success('⏱️ Rest Complete!', { duration: 4000 })
    }
  }, [timerActive, timeLeft])

  const startTimer = (secs: number) => { setTimerDuration(secs); setTimeLeft(secs); setTimerActive(true) }

  // ── Hype decay ──
  useEffect(() => {
    const id = setInterval(() => setHypeLevel(h => Math.max(0, h - 1.5)), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Log Set ──
  const logSet = () => {
    if (reps <= 0 || weight <= 0) return
    // Auto-start session on first set
    if (!sessionActive) {
      setSessionActive(true)
      setSessionStartTime(new Date())
      workoutStore.startSession()
    }
    const newSet: WorkoutSet = { reps, weight, timestamp: new Date() }
    setSessionLogs(prev => {
      const ex = prev.find(l => l.exerciseId === selectedExercise.id)
      if (ex) return prev.map(l => l.exerciseId === selectedExercise.id ? { ...l, sets: [...l.sets, newSet] } : l)
      return [...prev, { exerciseId: selectedExercise.id, sets: [newSet] }]
    })
    setHypeLevel(p => Math.min(100, p + 18))
    toast.success(`💪 ${reps} × ${weight}kg logged`, { duration: 2000 })
  }

  // ── Finish Workout ──
  const finishWorkout = useCallback(async () => {
    if (sessionLogs.length === 0) { toast.error('No sets logged yet!'); return }
    const now = new Date()
    const startTime = sessionStartTime || now
    const durationMinutes = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 60000))

    // Build exercise logs with muscle groups (PRIMARY + SECONDARY)
    const exercises: WorkoutExerciseLog[] = sessionLogs.map(log => {
      const ex = EXERCISES.find(e => e.id === log.exerciseId)!
      const muscles: string[] = []
      const primaryMapped: string[] = []
      const secondaryMapped: string[] = []

      // Map primary muscles
      for (const p of ex.muscleGroups.primary) {
        const mapped = MUSCLE_MAP[p.toLowerCase()]
        if (mapped && !muscles.includes(mapped)) {
          muscles.push(mapped)
          primaryMapped.push(mapped)
        }
      }
      // Map secondary muscles — CRITICAL: bench press should trigger triceps, deltoids, etc.
      for (const s of ex.muscleGroups.secondary) {
        const mapped = MUSCLE_MAP[s.toLowerCase()]
        if (mapped && !muscles.includes(mapped)) {
          muscles.push(mapped)
          secondaryMapped.push(mapped)
        }
      }
      // Fallback: also add category-based muscles
      const catMuscles = CATEGORY_TO_MUSCLES[ex.category] || []
      for (const m of catMuscles) { if (!muscles.includes(m)) muscles.push(m) }

      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category || ex.bodyPart,
        muscleGroups: muscles,
        primaryMuscles: primaryMapped,
        secondaryMuscles: secondaryMapped,
        sets: log.sets.map(s => ({ reps: s.reps, weight: s.weight, timestamp: s.timestamp.toISOString() })),
      }
    })

    const allMuscles = [...new Set(exercises.flatMap(e => e.muscleGroups))]
    const totalVol = sessionLogs.reduce((a, l) => a + l.sets.reduce((s, set) => s + set.reps * set.weight, 0), 0)
    const totalSetsCount = sessionLogs.reduce((a, l) => a + l.sets.length, 0)

    const workout = workoutStore.finishWorkout({
      date: format(now, 'yyyy-MM-dd'),
      startedAt: startTime.toISOString(),
      finishedAt: now.toISOString(),
      exercises,
      totalVolume: totalVol,
      totalSets: totalSetsCount,
      musclesWorked: allMuscles,
      durationMinutes,
    })

    setLastFinishedWorkout(workout)
    setShowSummary(true)
    toast.success('🎉 Workout saved!', { duration: 3000 })

    // Reset session
    setSessionLogs([])
    setSessionActive(false)
    setSessionStartTime(null)

    // Get AI summary
    setSummaryLoading(true)
    try {
      const summary = await aiApi.chat(
        `I just finished a workout. Here are the details:
- Duration: ${durationMinutes} minutes
- Exercises: ${exercises.map(e => `${e.exerciseName} (${e.sets.length} sets)`).join(', ')}
- Total volume: ${totalVol.toLocaleString()} kg
- Muscles worked: ${allMuscles.join(', ')}

Please give me a brief, motivational post-workout analysis with recovery tips and suggestions for my next session.`,
        []
      )
      setAiSummary(summary.response)
      // Update workout with AI summary
    } catch { setAiSummary('Great workout! Remember to hydrate, stretch, and get adequate sleep for optimal recovery. 💪') }
    setSummaryLoading(false)
  }, [sessionLogs, sessionStartTime, workoutStore])

  const openDetail = (ex: Exercise) => { setDetailExercise(ex); setView('EXERCISE_DETAIL') }
  const equipExercise = (ex: Exercise) => { setSelectedExercise(ex); setView('HUB'); toast.info(`Loaded: ${ex.name}`, { duration: 1500 }) }
  const toggleFavorite = (id: string) => {
    setFavorites(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Music embed URL ──
  const embedUrl = useMemo(() => {
    if (!musicUrl) return ''
    if (musicUrl.includes('soundcloud.com'))
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(musicUrl)}&color=%2310b981&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true`
    if (musicUrl.includes('youtube.com') || musicUrl.includes('youtu.be'))
      return `https://www.youtube.com/embed/${musicUrl.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1] || ''}?autoplay=1`
    if (musicUrl.includes('spotify.com'))
      return musicUrl.replace('open.spotify.com', 'open.spotify.com/embed')
    return musicUrl
  }, [musicUrl])

  // Lock body scroll when on the Solo Trainer to ensure a fixed app-like layout
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [])

  // ══════════════════════
  // ██  RENDER
  // ══════════════════════
  return (
    <>
      <Helmet><title>Solo Trainer — AbiliFit</title></Helmet>

      <div className="h-[calc(100vh-90px)] overflow-hidden bg-bg-primary text-text-primary -mt-2 md:-mt-4">
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════════ */}
          {/*  HUB VIEW                           */}
          {/* ═══════════════════════════════════ */}
          {view === 'HUB' && (
            <motion.div key="hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="max-w-[1600px] mx-auto px-4 md:px-6 pt-0 pb-4 h-full flex flex-col"
            >
              {/* Top Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 md:mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-purple flex items-center justify-center shadow-lg">
                    <Activity className="text-white" size={20} />
                  </div>
                  <div>
                    <h1 className="text-lg font-extrabold text-text-primary tracking-tight">Solo Training Hub</h1>
                    <p className="text-[11px] text-text-secondary">Your personal performance companion</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3 bg-bg-card rounded-xl px-4 py-2.5 border border-border-color">
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Volume</p>
                      <p className="text-base font-extrabold text-text-primary tabular-nums">{totalVolume.toLocaleString()}<span className="text-[10px] text-text-secondary ml-0.5">kg</span></p>
                    </div>
                    <div className="text-xl">{milestone.emoji}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setView('BESTIARY')} leftIcon={<BookOpen size={16} />}
                    className="!rounded-xl"
                  >
                    <span className="hidden sm:inline">Exercise Bestiary</span>
                    <span className="sm:hidden">Bestiary</span>
                  </Button>
                </div>
              </div>

              {/* Main Grid - responsive */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">

                {/* LEFT: Training Panel */}
                <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1 h-full overflow-y-auto no-scrollbar">
                  <Card className="!p-5 !rounded-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Active Exercise</span>
                      <button onClick={toggleVoice}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${voiceActive
                          ? 'bg-accent-purple text-white shadow-md animate-pulse' : 'bg-bg-card-hover text-text-secondary hover:text-text-primary'}`}
                      >
                        {voiceActive ? <Mic size={14} /> : <MicOff size={14} />}
                      </button>
                    </div>

                    <button onClick={() => openDetail(selectedExercise)} className="text-left group">
                      <h2 className="text-base font-extrabold text-text-primary group-hover:text-accent-purple transition-colors leading-tight">{selectedExercise.name}</h2>
                      <p className="text-[11px] text-text-secondary mt-0.5">{selectedExercise.bodyPart} · {selectedExercise.equipment}</p>
                    </button>

                    {/* Rep Counter — editable input */}
                    <div className="text-center py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setReps(r => Math.max(1, r - 1))}
                          className="w-8 h-8 rounded-lg bg-bg-card-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"><Minus size={14} /></button>
                        <input
                          type="number"
                          value={reps}
                          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setReps(v) }}
                          min={1}
                          className="w-24 text-center text-5xl font-black text-text-primary tabular-nums leading-none bg-transparent outline-none border-b-2 border-border-color focus:border-accent-purple transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button onClick={() => setReps(r => r + 1)}
                          className="w-8 h-8 rounded-lg bg-bg-card-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"><Plus size={14} /></button>
                      </div>
                      <p className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.3em] mt-1.5">Reps</p>
                    </div>

                    {/* Weight */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setWeight(w => Math.max(0, w - 5))}
                        className="w-9 h-9 rounded-lg bg-bg-card-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"><Minus size={14} /></button>
                      <div className="flex-1 bg-bg-card-hover rounded-lg px-3 py-2 flex items-center justify-center gap-1 border border-border-color">
                        <input type="number" value={weight} onChange={e => setWeight(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-14 bg-transparent text-center text-lg font-extrabold text-text-primary outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        <span className="text-[10px] font-bold text-text-secondary">kg</span>
                      </div>
                      <button onClick={() => setWeight(w => w + 5)}
                        className="w-9 h-9 rounded-lg bg-bg-card-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"><Plus size={14} /></button>
                    </div>

                    {/* Quick rep presets */}
                    <div className="flex gap-1.5">
                      {[1, 3, 5, 6, 8, 10, 12, 15, 20].map(r => (
                        <button key={r} onClick={() => setReps(r)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${reps === r
                            ? 'bg-accent-purple text-white shadow' : 'bg-bg-card-hover text-text-secondary hover:text-text-primary'}`}
                        >{r}</button>
                      ))}
                    </div>

                    <Button size="md" fullWidth onClick={logSet} leftIcon={<Zap size={16} />} className="!rounded-xl">
                      Log Set · {reps} × {weight}kg
                    </Button>

                    {sessionActive && (
                      <Button size="md" fullWidth onClick={finishWorkout} variant="secondary" className="!rounded-xl !mt-3 !border-green-500/30 !text-green-400 hover:!bg-green-500/10">
                        <StopCircle size={16} className="mr-2" /> Finish Workout
                      </Button>
                    )}
                  </Card>

                  {/* Timer */}
                  <Card className="!p-5 !rounded-2xl flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 w-full">
                      <Timer size={14} className="text-accent-purple" />
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex-1">Rest Timer</span>
                      {timerActive && <button onClick={() => { setTimerActive(false); setTimeLeft(0) }} className="text-text-secondary hover:text-red-500"><RotateCcw size={12} /></button>}
                    </div>
                    <div className="relative">
                      <svg className="w-24 h-24" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border-color)" strokeWidth="5" />
                        <motion.circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent-purple)" strokeWidth="5"
                          strokeLinecap="round" strokeDasharray={276.46}
                          animate={{ strokeDashoffset: timerActive ? 276.46 * (1 - timeLeft / timerDuration) : 276.46 }}
                          transform="rotate(-90 50 50)" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-extrabold tabular-nums text-text-primary">{timerActive ? fmt(timeLeft) : fmt(timerDuration)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 w-full">
                      {[30, 60, 90, 120].map(s => (
                        <button key={s} onClick={() => startTimer(s)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${timerActive && timerDuration === s
                            ? 'bg-accent-purple text-white' : 'bg-bg-card-hover text-text-secondary hover:text-accent-purple'}`}
                        >{s}s</button>
                      ))}
                    </div>
                  </Card>
                </div>

                {/* CENTER: Video + Session */}
                <div className="lg:col-span-6 flex flex-col gap-4 order-1 lg:order-2 h-full min-h-0">
                  <div className="relative bg-bg-card rounded-2xl overflow-hidden shadow-lg border border-border-color flex-1 min-h-0">
                    <video key={selectedExercise.id} src={selectedExercise.videoUrl}
                      autoPlay loop muted playsInline className="w-full h-full object-contain" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight">{selectedExercise.name}</h2>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-white/15 backdrop-blur rounded-md text-[10px] font-bold text-white/80">{selectedExercise.bodyPart}</span>
                            <span className="px-2 py-0.5 bg-white/15 backdrop-blur rounded-md text-[10px] font-bold text-white/80">{selectedExercise.equipment}</span>
                            <div className="flex gap-px ml-1">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star key={i} size={11} className={i <= selectedExercise.effectiveness ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => openDetail(selectedExercise)}
                          className="hidden sm:flex px-3 py-1.5 bg-white/15 hover:bg-white/25 backdrop-blur rounded-lg text-white text-[11px] font-bold transition-all items-center gap-1.5 flex-shrink-0">
                          <Info size={12} /> Details
                        </button>
                      </div>
                    </div>
                    {/* Hype border */}
                    {hypeLevel > 20 && (
                      <motion.div animate={{ opacity: hypeLevel / 200 }}
                        className="absolute inset-0 pointer-events-none rounded-2xl"
                        style={{ boxShadow: `inset 0 0 ${hypeLevel * 0.8}px rgba(16,185,129,${hypeLevel / 300})`, border: `1px solid rgba(16,185,129,${hypeLevel / 200})` }}
                      />
                    )}
                  </div>

                  {/* Session Log */}
                  <Card className="!p-4 !rounded-2xl shrink-0 h-[220px] overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Flame size={14} className="text-orange-500" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Session Log</span>
                      </div>
                      <span className="text-[10px] font-bold text-text-secondary">{totalSets} sets · {totalVolume.toLocaleString()}kg</span>
                    </div>
                    {sessionLogs.length === 0 ? (
                      <div className="text-center py-5 text-text-secondary opacity-50">
                        <Dumbbell size={24} className="mx-auto mb-1.5" />
                        <p className="text-[11px] font-medium">Log your first set to start</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sessionLogs.map(log => {
                          const ex = EXERCISES.find(e => e.id === log.exerciseId)!
                          const vol = log.sets.reduce((a, s) => a + s.reps * s.weight, 0)
                          return (
                            <div key={log.exerciseId} className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-card-hover border border-border-color">
                              <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center text-accent-purple flex-shrink-0">
                                <Dumbbell size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-bold text-text-primary truncate">{ex.name}</p>
                                <div className="flex gap-1 mt-0.5 flex-wrap">
                                  {log.sets.map((s, i) => (
                                    <span key={i} className="px-1.5 py-px bg-bg-primary rounded text-[9px] font-bold text-text-secondary border border-border-color">{s.reps}×{s.weight}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[12px] font-extrabold text-accent-purple tabular-nums">{vol.toLocaleString()}</p>
                                <p className="text-[8px] font-bold text-text-secondary uppercase">kg</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </Card>
                </div>

                {/* RIGHT: Anatomy + Milestone + Music */}
                <div className="lg:col-span-3 flex flex-col gap-4 order-3 h-full overflow-y-auto no-scrollbar">
                  {/* Anatomy */}
                  <Card className="!p-4 !rounded-2xl relative overflow-hidden flex-1 flex flex-col min-h-[220px]">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={12} className="text-accent-purple" />
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Muscle Map</span>
                    </div>
                    
                    <div className="h-6 mb-2 flex items-center justify-center shrink-0">
                      {hoveredMuscle ? (
                        <div className="px-2 py-0.5 bg-accent-purple/10 rounded-md text-center animate-in fade-in zoom-in duration-200">
                          <span className="text-[10px] font-bold text-accent-purple capitalize">{hoveredMuscle.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-[8px] text-text-secondary ml-1">
                            {selectedExercise.muscleGroups.primary.some(p => MUSCLE_MAP[p.toLowerCase()] === hoveredMuscle) ? '(Primary)' : '(Secondary)'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-text-secondary/50 font-medium tracking-wide">Hover over a muscle</span>
                      )}
                    </div>

                    <div className="flex gap-2 flex-1 min-h-0">
                      <div className="flex-1"><AnatomyFront getColor={m => getMuscleFill(selectedExercise, m)} hoveredMuscle={hoveredMuscle} setHoveredMuscle={setHoveredMuscle} /></div>
                      <div className="flex-1"><AnatomyBack getColor={m => getMuscleFill(selectedExercise, m)} hoveredMuscle={hoveredMuscle} setHoveredMuscle={setHoveredMuscle} /></div>
                    </div>

                    <div className="flex gap-3 mt-2 justify-center shrink-0">
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-accent-purple" /><span className="text-[8px] font-bold text-text-secondary">Primary</span></div>
                      <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: 'rgba(16,185,129,0.3)' }} /><span className="text-[8px] font-bold text-text-secondary">Secondary</span></div>
                    </div>
                  </Card>

                  {/* Milestone */}
                  <Card className="!p-4 !rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy size={12} className="text-yellow-500" />
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Weight Milestone</span>
                    </div>
                    <div className="text-center py-2">
                      <div className="text-3xl mb-0.5">{milestone.emoji}</div>
                      <p className="text-sm font-extrabold" style={{ color: milestone.color }}>{milestone.label}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">You've lifted the weight of {milestone.label.toLowerCase()}!</p>
                    </div>
                    {nextMilestone && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[9px] font-bold text-text-secondary mb-1">
                          <span>Next: {nextMilestone.label}</span>
                          <span>{Math.round((totalVolume / nextMilestone.threshold) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-bg-card-hover rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${Math.min(100, (totalVolume / nextMilestone.threshold) * 100)}%` }}
                            className="h-full rounded-full" style={{ backgroundColor: nextMilestone.color }} />
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Music */}
                  <Card className="!p-4 !rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                      <Music size={12} className="text-accent-purple" />
                      <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Music Player</span>
                    </div>
                    <p className="text-[10px] text-text-secondary mb-2">Paste a SoundCloud, YouTube, or Spotify URL to play while training.</p>
                    <input type="text" value={musicUrl} onChange={e => setMusicUrl(e.target.value)}
                      placeholder="Paste music URL..."
                      className="w-full bg-bg-card-hover border border-border-color rounded-lg px-3 py-2 text-[11px] text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-accent-purple/50 transition-colors" />
                    {embedUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-border-color">
                        <iframe src={embedUrl} className="w-full" height="100" allow="autoplay; encrypted-media" frameBorder="0" title="Music" />
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════ */}
          {/*  BESTIARY VIEW (moved to portal below) */}
          {/* ═══════════════════════════════════ */}


          {/* ═══════════════════════════════════ */}
          {/*  EXERCISE DETAIL VIEW (moved to portal below) */}
          {/* ═══════════════════════════════════ */}


        </AnimatePresence>

        {/* Post-Workout Summary Modal */}
        <AnimatePresence>
          {showSummary && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setShowSummary(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-bg-card border border-border-color rounded-3xl w-full max-w-lg overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="bg-gradient-to-br from-green-500/20 to-accent-teal/10 p-6 border-b border-border-color">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
                      <Trophy size={24} className="text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-text-primary">Workout Complete!</h2>
                      <p className="text-xs text-text-secondary">Great session, keep pushing! 🔥</p>
                    </div>
                  </div>

                  {lastFinishedWorkout && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-bg-primary/60 rounded-xl p-3 text-center border border-border-color">
                        <p className="text-lg font-black text-text-primary">{lastFinishedWorkout.totalSets}</p>
                        <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Sets</p>
                      </div>
                      <div className="bg-bg-primary/60 rounded-xl p-3 text-center border border-border-color">
                        <p className="text-lg font-black text-text-primary">{lastFinishedWorkout.totalVolume.toLocaleString()}<span className="text-[10px] text-text-secondary">kg</span></p>
                        <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Volume</p>
                      </div>
                      <div className="bg-bg-primary/60 rounded-xl p-3 text-center border border-border-color">
                        <p className="text-lg font-black text-text-primary">{lastFinishedWorkout.durationMinutes}<span className="text-[10px] text-text-secondary">min</span></p>
                        <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">Duration</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-accent-purple" />
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">AI Coach Insights</h3>
                  </div>
                  {summaryLoading ? (
                    <div className="flex items-center gap-3 py-8">
                      <div className="w-5 h-5 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
                      <span className="text-sm text-text-secondary">Analyzing your workout...</span>
                    </div>
                  ) : (
                    <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap bg-bg-primary rounded-xl p-4 border border-border-color max-h-48 overflow-y-auto">
                      {aiSummary}
                    </div>
                  )}

                  {lastFinishedWorkout && lastFinishedWorkout.musclesWorked.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2">Muscles Trained</p>
                      <div className="flex flex-wrap gap-1.5">
                        {lastFinishedWorkout.musclesWorked.map((m: string) => (
                          <span key={m} className="px-2 py-1 bg-accent-purple/10 text-accent-purple rounded-lg text-[10px] font-bold capitalize">{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button size="md" fullWidth onClick={() => setShowSummary(false)} className="!rounded-xl !mt-5">
                    Done
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Portals appended to body */}
      {createPortal(
        <AnimatePresence>
          {view === 'BESTIARY' && (
            <motion.div key="bestiary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col"
            >
              {/* Header */}
              <div className="bg-bg-card border-b border-border-color px-4 md:px-8 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-bg-card-hover border border-border-color flex items-center justify-center">
                    <BookOpen size={16} className="text-text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-text-primary">Exercise Bestiary</h2>
                    <p className="text-[10px] text-text-secondary">{filteredExercises.length} exercises</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                    <input type="text" placeholder="Search exercises, muscles, equipment..."
                      value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      className="w-64 md:w-80 bg-bg-primary rounded-lg py-2.5 pl-9 pr-4 text-[12px] font-medium outline-none border border-border-color focus:border-accent-purple/50 transition-all text-text-primary placeholder:text-text-secondary/50" />
                  </div>
                  <button onClick={() => { setView('HUB'); setSearchQuery(''); setActiveBodyPart('All') }}
                    className="w-9 h-9 rounded-lg bg-bg-card-hover hover:bg-bg-primary flex items-center justify-center transition-colors border border-border-color">
                    <X size={18} className="text-text-secondary" />
                  </button>
                </div>
              </div>

              {/* Mobile search */}
              <div className="sm:hidden px-4 pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={14} />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-bg-card rounded-lg py-2.5 pl-9 pr-4 text-[12px] font-medium outline-none border border-border-color focus:border-accent-purple/50 text-text-primary placeholder:text-text-secondary/50" />
                </div>
              </div>

              {/* Filters */}
              <div className="px-4 md:px-8 py-3 flex gap-1.5 overflow-x-auto no-scrollbar">
                {['All', 'Favorites', ...BODY_PART_FILTERS.filter(f => f !== 'All')].map(f => (
                  <button key={f} onClick={() => setActiveBodyPart(f)}
                    className={`px-4 py-2 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${activeBodyPart === f
                      ? 'bg-accent-purple text-white shadow' : 'bg-bg-card text-text-secondary border border-border-color hover:border-accent-purple/30 hover:text-text-primary'}`}
                  >{f === 'Favorites' ? <span className="flex items-center gap-1.5"><Star size={12} className="fill-current" /> Favorites</span> : f}</button>
                ))}
              </div>

              {/* Grid - static thumbnails, no autoplay */}
              <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                  {filteredExercises.map(ex => (
                    <ExerciseThumb
                      key={ex.id}
                      exercise={ex}
                      onClick={() => openDetail(ex)}
                      isFav={favorites.has(ex.id)}
                      onFav={() => toggleFavorite(ex.id)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'EXERCISE_DETAIL' && detailExercise && (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-bg-primary flex flex-col overflow-y-auto"
            >
              {/* Nav */}
              <div className="bg-bg-card border-b border-border-color px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-10">
                <button onClick={() => setView('BESTIARY')}
                  className="flex items-center gap-1.5 text-text-secondary hover:text-accent-purple transition-colors">
                  <ChevronLeft size={16} /> <span className="text-[11px] font-bold uppercase tracking-wider">Back</span>
                </button>
                <div className="flex gap-2">
                  <button onClick={() => toggleFavorite(detailExercise.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border ${favorites.has(detailExercise.id) ? 'bg-accent-purple/10 text-accent-purple border-accent-purple/30' : 'bg-bg-card-hover text-text-secondary border-border-color hover:text-text-primary'}`}>
                    <Bookmark size={12} className={favorites.has(detailExercise.id) ? 'fill-current' : ''} />
                    {favorites.has(detailExercise.id) ? 'Saved' : 'Save'}
                  </button>
                  <Button size="sm" onClick={() => equipExercise(detailExercise)} leftIcon={<Play size={14} />} className="!rounded-lg">
                    Start Training
                  </Button>
                </div>
              </div>

              <div className="max-w-5xl mx-auto w-full px-4 md:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Video + info */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="aspect-video bg-bg-card rounded-2xl overflow-hidden shadow-lg border border-border-color">
                      <video src={detailExercise.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                    </div>

                    <div>
                      <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">{detailExercise.name}</h1>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-2.5 py-1 bg-accent-purple/10 text-accent-purple rounded-lg text-[11px] font-bold">{detailExercise.bodyPart}</span>
                        <span className="px-2.5 py-1 bg-bg-card-hover text-text-secondary rounded-lg text-[11px] font-bold border border-border-color">{detailExercise.equipment}</span>
                        <span className="px-2.5 py-1 bg-bg-card-hover text-text-secondary rounded-lg text-[11px] font-bold border border-border-color">{detailExercise.category}</span>
                        <div className="flex gap-px ml-auto items-center">
                          {[1, 2, 3, 4, 5].map(i => {
                            const rd = exerciseRatings[detailExercise.id]
                            const userR = rd?.userRating || 0
                            const avgR = rd?.avg || detailExercise.effectiveness
                            const filled = userR ? i <= userR : i <= Math.round(avgR)
                            return (
                              <button key={i} onClick={() => handleRateExercise(detailExercise.id, i)}
                                className={`p-0.5 transition-all hover:scale-125 ${filled ? '' : 'opacity-40'}`}
                                title={`Rate ${i}/5`}
                              >
                                <Star size={16} className={filled ? 'text-yellow-400 fill-yellow-400 star-pop' : 'text-text-secondary/40'} />
                              </button>
                            )
                          })}
                          {exerciseRatings[detailExercise.id] && (
                            <span className="text-[10px] text-text-secondary ml-1.5">
                              {exerciseRatings[detailExercise.id].avg.toFixed(1)} ({exerciseRatings[detailExercise.id].count})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Card className="!p-5 !rounded-2xl">
                      <h3 className="text-sm font-bold text-text-primary mb-2">About This Exercise</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{detailExercise.description}</p>
                    </Card>

                    <Card className="!p-5 !rounded-2xl">
                      <h3 className="text-sm font-bold text-text-primary mb-3">Step-by-Step Guide</h3>
                      <div className="space-y-2.5">
                        {detailExercise.steps.map((step, i) => (
                          <div key={i} className="flex gap-3">
                            <div className="w-6 h-6 rounded-md bg-accent-purple/10 text-accent-purple flex items-center justify-center text-[11px] font-bold flex-shrink-0">{i + 1}</div>
                            <p className="text-sm text-text-secondary pt-0.5">{step}</p>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="!p-5 !rounded-2xl">
                      <h3 className="text-sm font-bold text-text-primary mb-2">Pro Tips</h3>
                      <div className="space-y-2">
                        {detailExercise.tips.map((tip, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <CheckCircle size={13} className="text-accent-purple mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-text-secondary">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Sidebar */}
                  <div className="lg:col-span-5 space-y-5">
                    <Card className="!p-5 !rounded-2xl">
                      <h3 className="text-sm font-bold text-text-primary mb-3">Exercise Profile</h3>
                      <div className="space-y-3">
                        <PRow label="Body Part" value={detailExercise.bodyPart} />
                        <PRow label="Equipment" value={detailExercise.equipment} />
                        <PRow label="Category" value={detailExercise.category} />
                        <PRow label="Primary Muscles" value={detailExercise.muscleGroups.primary.join(', ')} />
                        <PRow label="Secondary Muscles" value={detailExercise.muscleGroups.secondary.join(', ') || 'None'} />
                        <PRow label="Effectiveness" value={`${detailExercise.effectiveness}/5`} />
                      </div>
                    </Card>

                    <Card className="!p-5 !rounded-2xl">
                      <h3 className="text-sm font-bold text-text-primary mb-3">Muscles Targeted</h3>
                      <div className="h-8 mb-2 flex items-center justify-center">
                        {hoveredMuscle ? (
                          <div className="px-3 py-1 bg-accent-purple/10 rounded-lg text-center animate-in fade-in zoom-in duration-200">
                            <span className="text-[11px] font-bold text-accent-purple capitalize">{hoveredMuscle.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="text-[9px] text-text-secondary ml-1">
                              {detailExercise.muscleGroups.primary.some(p => MUSCLE_MAP[p.toLowerCase()] === hoveredMuscle) ? '(Primary)' : '(Secondary)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-text-secondary/50 font-medium tracking-wide">Hover over a muscle</span>
                        )}
                      </div>
                      <div className="flex gap-4 justify-center">
                        <div className="w-28">
                          <AnatomyFront getColor={m => getMuscleFill(detailExercise, m)} hoveredMuscle={hoveredMuscle} setHoveredMuscle={setHoveredMuscle} />
                          <p className="text-[9px] font-bold text-text-secondary text-center mt-1.5 uppercase tracking-wider">Front</p>
                        </div>
                        <div className="w-28">
                          <AnatomyBack getColor={m => getMuscleFill(detailExercise, m)} hoveredMuscle={hoveredMuscle} setHoveredMuscle={setHoveredMuscle} />
                          <p className="text-[9px] font-bold text-text-secondary text-center mt-1.5 uppercase tracking-wider">Back</p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-center mt-3 pt-3 border-t border-border-color">
                        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-accent-purple" /><span className="text-[9px] font-bold text-text-secondary">Primary</span></div>
                        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(16,185,129,0.3)' }} /><span className="text-[9px] font-bold text-text-secondary">Secondary</span></div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

function PRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border-color last:border-0">
      <span className="text-[11px] font-bold text-text-secondary">{label}</span>
      <span className="text-[12px] font-bold text-text-primary text-right">{value}</span>
    </div>
  )
}
