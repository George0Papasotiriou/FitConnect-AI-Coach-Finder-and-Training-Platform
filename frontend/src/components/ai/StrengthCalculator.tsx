/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Dumbbell, Trophy, Target, Flame, Search, Plus, Trash2, Info, Zap, Users, Download, RotateCcw } from 'lucide-react'
import Button from '../common/Button'
import { AnatomyFront, AnatomyBack } from './AnatomyModel'
import { useWorkoutStore } from '../../store/workoutStore'
import { toast } from 'sonner'

interface StrengthCalculatorProps {
  isOpen: boolean
  onClose: () => void
}

export type MuscleGroup = 'chest' | 'upperBack' | 'lowerBack' | 'deltoids' | 'biceps' | 'triceps' | 'forearms' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';

interface PresetExercise {
  id: string
  name: string
  weight: number
  reps: number
  primary: MuscleGroup[]
  secondary?: MuscleGroup[]
  isBodyweight: boolean
  bwMultiplier: number
}

const BENCHMARKS: Record<MuscleGroup, { iron: number; bronze: number; silver: number; gold: number; platinum: number; emerald: number; diamond: number; spartan: number }> = {
  chest: { iron: 0.4, bronze: 0.7, silver: 1.0, gold: 1.3, platinum: 1.6, emerald: 1.9, diamond: 2.2, spartan: 2.5 },
  upperBack: { iron: 0.5, bronze: 0.8, silver: 1.2, gold: 1.5, platinum: 1.8, emerald: 2.1, diamond: 2.5, spartan: 2.8 },
  lowerBack: { iron: 0.4, bronze: 0.7, silver: 1.1, gold: 1.4, platinum: 1.7, emerald: 2.0, diamond: 2.3, spartan: 2.6 },
  deltoids: { iron: 0.3, bronze: 0.5, silver: 0.8, gold: 1.0, platinum: 1.3, emerald: 1.5, diamond: 1.8, spartan: 2.0 },
  biceps: { iron: 0.2, bronze: 0.3, silver: 0.5, gold: 0.7, platinum: 0.9, emerald: 1.1, diamond: 1.3, spartan: 1.5 },
  triceps: { iron: 0.2, bronze: 0.3, silver: 0.5, gold: 0.7, platinum: 0.9, emerald: 1.1, diamond: 1.3, spartan: 1.5 },
  forearms: { iron: 0.15, bronze: 0.25, silver: 0.4, gold: 0.55, platinum: 0.7, emerald: 0.85, diamond: 1.0, spartan: 1.2 },
  quads: { iron: 0.6, bronze: 1.0, silver: 1.4, gold: 1.8, platinum: 2.1, emerald: 2.4, diamond: 2.7, spartan: 3.0 },
  hamstrings: { iron: 0.4, bronze: 0.6, silver: 0.9, gold: 1.2, platinum: 1.5, emerald: 1.8, diamond: 2.1, spartan: 2.4 },
  glutes: { iron: 0.5, bronze: 0.8, silver: 1.2, gold: 1.6, platinum: 1.9, emerald: 2.2, diamond: 2.6, spartan: 3.0 },
  calves: { iron: 0.3, bronze: 0.5, silver: 0.8, gold: 1.1, platinum: 1.4, emerald: 1.7, diamond: 2.0, spartan: 2.3 },
  core: { iron: 0.2, bronze: 0.4, silver: 0.6, gold: 0.8, platinum: 1.0, emerald: 1.2, diamond: 1.4, spartan: 1.6 },
}

interface ExerciseDef {
  id: string
  name: string
  category: 'Weightlifting' | 'Calisthenics' | 'Yoga'
  primary: MuscleGroup[]
  secondary?: MuscleGroup[]
  isBodyweight: boolean
  bwMultiplier: number
  description: string
}

export const EXERCISE_LIBRARY: ExerciseDef[] = [
  // Upper Push
  { id: 'bench', name: 'Bench Press', category: 'Weightlifting', primary: ['chest'], secondary: ['deltoids', 'triceps'], isBodyweight: false, bwMultiplier: 0, description: 'Flat barbell chest press' },
  { id: 'incline-bench', name: 'Incline Bench', category: 'Weightlifting', primary: ['chest', 'deltoids'], secondary: ['triceps'], isBodyweight: false, bwMultiplier: 0, description: 'Upper chest focus press' },
  { id: 'ohp', name: 'Overhead Press', category: 'Weightlifting', primary: ['deltoids'], secondary: ['triceps', 'upperBack'], isBodyweight: false, bwMultiplier: 0, description: 'Standing barbell press' },
  { id: 'lat-raise', name: 'Lateral Raise', category: 'Weightlifting', primary: ['deltoids'], secondary: ['upperBack'], isBodyweight: false, bwMultiplier: 0, description: 'Dumbbell side raises' },
  { id: 'arnold-press', name: 'Arnold Press', category: 'Weightlifting', primary: ['deltoids'], secondary: ['triceps'], isBodyweight: false, bwMultiplier: 0, description: 'Rotational shoulder press' },
  { id: 'shrugs', name: 'Barbell Shrugs', category: 'Weightlifting', primary: ['upperBack'], secondary: ['forearms'], isBodyweight: false, bwMultiplier: 0, description: 'Trapezius isolation' },
  { id: 'pushup', name: 'Push Up', category: 'Calisthenics', primary: ['chest'], secondary: ['triceps', 'deltoids', 'core'], isBodyweight: true, bwMultiplier: 0.64, description: 'Standard bodyweight pushup' },
  { id: 'dip', name: 'Chest Dip', category: 'Calisthenics', primary: ['chest', 'triceps'], secondary: ['deltoids'], isBodyweight: true, bwMultiplier: 0.9, description: 'Parallel bar dips' },
  { id: 'hspu', name: 'Handstand Pushup', category: 'Calisthenics', primary: ['deltoids', 'triceps'], secondary: ['upperBack', 'core'], isBodyweight: true, bwMultiplier: 1.0, description: 'Vertical calisthenics push' },
  
  // Upper Pull
  { id: 'deadlift', name: 'Deadlift', category: 'Weightlifting', primary: ['lowerBack', 'glutes'], secondary: ['hamstrings', 'upperBack', 'forearms'], isBodyweight: false, bwMultiplier: 0, description: 'Barbell deadlift' },
  { id: 'rack-pull', name: 'Rack Pulls', category: 'Weightlifting', primary: ['upperBack', 'lowerBack'], secondary: ['forearms'], isBodyweight: false, bwMultiplier: 0, description: 'Partial range deadlift' },
  { id: 'god-mornings', name: 'Good Mornings', category: 'Weightlifting', primary: ['lowerBack'], secondary: ['hamstrings', 'glutes'], isBodyweight: false, bwMultiplier: 0, description: 'Barbell hinge' },
  { id: 'facepull', name: 'Face Pull', category: 'Weightlifting', primary: ['deltoids', 'upperBack'], isBodyweight: false, bwMultiplier: 0, description: 'Cable pull for rear delts' },
  { id: 'pullup', name: 'Pull Up', category: 'Calisthenics', primary: ['upperBack'], secondary: ['biceps', 'forearms', 'core'], isBodyweight: true, bwMultiplier: 1.0, description: 'Standard overhand pullup' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'Weightlifting', primary: ['upperBack'], secondary: ['biceps', 'forearms'], isBodyweight: false, bwMultiplier: 0, description: 'Cable lat pulldown' },
  { id: 'chinup', name: 'Chin Up', category: 'Calisthenics', primary: ['upperBack', 'biceps'], secondary: ['forearms', 'core'], isBodyweight: true, bwMultiplier: 1.0, description: 'Underhand pullup for biceps' },
  { id: 'muscleup', name: 'Muscle Up', category: 'Calisthenics', primary: ['upperBack', 'chest'], secondary: ['triceps', 'biceps', 'core'], isBodyweight: true, bwMultiplier: 1.0, description: 'Explosive transition' },
  { id: 'barbell-row', name: 'Barbell Row', category: 'Weightlifting', primary: ['upperBack'], secondary: ['biceps', 'forearms', 'lowerBack'], isBodyweight: false, bwMultiplier: 0, description: 'Bent over barbell row' },
  { id: 'back-ext', name: 'Back Extension', category: 'Weightlifting', primary: ['lowerBack'], secondary: ['glutes', 'hamstrings'], isBodyweight: true, bwMultiplier: 0.5, description: 'Hyperextension' },

  // Arms / Forearms
  { id: 'skulcrusher', name: 'Skull Crusher', category: 'Weightlifting', primary: ['triceps'], isBodyweight: false, bwMultiplier: 0, description: 'EZ-bar tricep extension' },
  { id: 'bb-curl', name: 'Barbell Curl', category: 'Weightlifting', primary: ['biceps'], secondary: ['forearms'], isBodyweight: false, bwMultiplier: 0, description: 'Standing barbell curls' },
  { id: 'hammer-curl', name: 'Hammer Curl', category: 'Weightlifting', primary: ['biceps', 'forearms'], isBodyweight: false, bwMultiplier: 0, description: 'Neutral grip' },
  { id: 'wrist-curl', name: 'Wrist Curl', category: 'Weightlifting', primary: ['forearms'], isBodyweight: false, bwMultiplier: 0, description: 'Forearm isolation' },
  { id: 'farmer-walk', name: 'Farmer Walk', category: 'Weightlifting', primary: ['forearms', 'core', 'upperBack'], secondary: ['lowerBack'], isBodyweight: false, bwMultiplier: 0, description: 'Heavy carry' },

  // Legs
  { id: 'squat', name: 'Back Squat', category: 'Weightlifting', primary: ['quads', 'glutes'], secondary: ['hamstrings', 'lowerBack', 'core'], isBodyweight: false, bwMultiplier: 0, description: 'High-bar barbell squat' },
  { id: 'front-squat', name: 'Front Squat', category: 'Weightlifting', primary: ['quads', 'core'], secondary: ['upperBack', 'glutes'], isBodyweight: false, bwMultiplier: 0, description: 'Quad dominant squat' },
  { id: 'leg-press', name: 'Leg Press', category: 'Weightlifting', primary: ['quads'], secondary: ['glutes'], isBodyweight: false, bwMultiplier: 0, description: 'Machine leg press' },
  { id: 'rdl', name: 'Romanian Deadlift', category: 'Weightlifting', primary: ['hamstrings', 'glutes'], secondary: ['lowerBack'], isBodyweight: false, bwMultiplier: 0, description: 'Stiff leg deadlift' },
  { id: 'lunges', name: 'Barbell Lunges', category: 'Weightlifting', primary: ['quads', 'glutes'], secondary: ['hamstrings', 'core'], isBodyweight: false, bwMultiplier: 0, description: 'Unilateral quad work' },
  { id: 'calf-raise', name: 'Calf Raise', category: 'Weightlifting', primary: ['calves'], isBodyweight: false, bwMultiplier: 0, description: 'Standing calf raises' },

  // Core
  { id: 'v-up', name: 'V-Ups', category: 'Calisthenics', primary: ['core'], secondary: ['quads'], isBodyweight: true, bwMultiplier: 0.1, description: 'Explosive ab move' },
  { id: 'leg-raise', name: 'Hanging Leg Raise', category: 'Calisthenics', primary: ['core'], secondary: ['forearms', 'quads'], isBodyweight: true, bwMultiplier: 0.2, description: 'Hanging abdominal work' },

  // Yoga / Mastery-Based
  { id: 'superman', name: 'Superman Hold', category: 'Yoga', primary: ['lowerBack'], secondary: ['glutes', 'upperBack'], isBodyweight: true, bwMultiplier: 0, description: 'Lower back hold' },
  { id: 'plank', name: 'Forearm Plank', category: 'Yoga', primary: ['core'], secondary: ['deltoids'], isBodyweight: true, bwMultiplier: 0, description: 'Core stabilization' },
  { id: 'down-dog', name: 'Downward Dog', category: 'Yoga', primary: ['hamstrings', 'upperBack'], secondary: ['calves'], isBodyweight: true, bwMultiplier: 0, description: 'Active stretch' },
  { id: 'warrior', name: 'Warrior II', category: 'Yoga', primary: ['quads', 'glutes'], secondary: ['deltoids'], isBodyweight: true, bwMultiplier: 0, description: 'Stability pose' }
]

const DEFAULT_EXERCISES: PresetExercise[] = [
  { id: 'bench', name: 'Bench Press', weight: 60, reps: 8, primary: ['chest'], secondary: ['deltoids', 'triceps'], isBodyweight: false, bwMultiplier: 0 },
  { id: 'squat', name: 'Squat', weight: 80, reps: 5, primary: ['quads', 'glutes'], secondary: ['hamstrings'], isBodyweight: false, bwMultiplier: 0 },
]

export default function StrengthCalculator({ isOpen, onClose }: StrengthCalculatorProps) {
  const [userExercises, setUserExercises] = useState<PresetExercise[]>(DEFAULT_EXERCISES)
  const [bodyWeight, setBodyWeight] = useState(75)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hasImportedLastWorkout, setHasImportedLastWorkout] = useState(false)

  const { completedWorkouts } = useWorkoutStore()

  // Map Solo Trainer exercise names to Strength Vault library entries
  const EXERCISE_NAME_MAP: Record<string, string> = useMemo(() => ({
    'bench press': 'bench',
    'incline bench press': 'incline-bench',
    'dumbbell bench press': 'bench',
    'overhead press': 'ohp',
    'lateral raise': 'lat-raise',
    'face pull': 'facepull',
    'barbell curl': 'bb-curl',
    'hammer curl': 'hammer-curl',
    'incline dumbbell curl': 'bb-curl',
    'triceps pushdown': 'skulcrusher',
    'skull crusher': 'skulcrusher',
    'lat pulldown': 'lat-pulldown',
    'bent over row': 'barbell-row',
    'one arm dumbbell row': 'barbell-row',
    'seated cable row': 'barbell-row',
    'conventional deadlift': 'deadlift',
    'barbell back squat': 'squat',
    'leg extension': 'leg-press',
    'seated leg curl': 'rdl',
    'romanian deadlift': 'rdl',
    'barbell hip thrust': 'rdl',
    'standing calf raise': 'calf-raise',
    'dumbbell lunge': 'lunges',
    'cable crunch': 'v-up',
    'plank': 'plank',
    'push-up': 'pushup',
    'lever seated fly': 'bench',
    'cable standing fly': 'bench',
  }), [])

  // Auto-import last workout when opening (once per open)
  const importLastWorkout = useCallback(async () => {
    let workouts = completedWorkouts;
    
    if (workouts.length === 0) {
      toast.error("No completed solo workouts found.")
      return
    }

    const lastWorkout = workouts[0]
    const imported: PresetExercise[] = []

    for (const exLog of lastWorkout.exercises) {
      const matchKey = exLog.exerciseName.toLowerCase()
      const libraryId = EXERCISE_NAME_MAP[matchKey]
      const libEntry = libraryId ? EXERCISE_LIBRARY.find(e => e.id === libraryId) : null

      if (libEntry && !imported.find(i => i.id === libEntry.id)) {
        // Use the heaviest set from the workout
        const heaviestSet = exLog.sets.reduce((best, s) => s.weight > best.weight ? s : best, exLog.sets[0])
        imported.push({
          id: libEntry.id,
          name: libEntry.name,
          weight: heaviestSet.weight,
          reps: heaviestSet.reps,
          primary: libEntry.primary,
          secondary: libEntry.secondary,
          isBodyweight: libEntry.isBodyweight,
          bwMultiplier: libEntry.bwMultiplier,
        })
      }
    }

    if (imported.length > 0) {
      setUserExercises(imported)
      setHasImportedLastWorkout(true)
    }
  }, [completedWorkouts, EXERCISE_NAME_MAP])

  // Auto-import on first open if there's a recent workout
  useEffect(() => {
    if (isOpen && !hasImportedLastWorkout && completedWorkouts.length > 0) {
      importLastWorkout()
    }
  }, [isOpen, hasImportedLastWorkout, completedWorkouts.length, importLastWorkout])

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }

  const calculateScore = (ex: PresetExercise, bw: number) => {
    if (EXERCISE_LIBRARY.find(l => l.id === ex.id)?.category === 'Yoga') return (ex.weight / 10) * 2;
    let effectiveWeight = ex.weight + (ex.isBodyweight ? (bw * ex.bwMultiplier) : 0);
    return (effectiveWeight * (1 + ex.reps / 30)) / bw;
  }

  const stats = useMemo(() => {
    const muscleStrength: Record<MuscleGroup, number> = {
      chest: 0, upperBack: 0, lowerBack: 0, deltoids: 0, biceps: 0, triceps: 0, forearms: 0, quads: 0, hamstrings: 0, glutes: 0, calves: 0, core: 0
    }
    userExercises.forEach(ex => {
      const ratio = calculateScore(ex, bodyWeight)
      ex.primary.forEach(m => muscleStrength[m] = Math.max(muscleStrength[m], ratio))
      ex.secondary?.forEach(m => muscleStrength[m] = Math.max(muscleStrength[m], ratio * 0.4))
    })
    return muscleStrength
  }, [userExercises, bodyWeight])

  const getRank = (ratio: number, group?: MuscleGroup) => {
    let benchmarks = { iron: 0.5, bronze: 0.8, silver: 1.1, gold: 1.4, platinum: 1.7, emerald: 2.0, diamond: 2.3, spartan: 2.6 }
    if (group) benchmarks = BENCHMARKS[group]
    
    if (ratio >= benchmarks.spartan) return { label: 'Spartan', color: '#ef4444', glow: '0 0 25px rgba(239,68,68,0.6)' }
    if (ratio >= benchmarks.diamond) return { label: 'Diamond', color: '#8b5cf6', glow: '0 0 20px rgba(139,92,246,0.5)' }
    if (ratio >= benchmarks.emerald) return { label: 'Emerald', color: '#10b981', glow: '0 0 16px rgba(16,185,129,0.4)' }
    if (ratio >= benchmarks.platinum) return { label: 'Platinum', color: '#38bdf8', glow: '0 0 14px rgba(56,189,248,0.4)' }
    if (ratio >= benchmarks.gold) return { label: 'Gold', color: '#fbbf24', glow: '0 0 12px rgba(251,191,36,0.3)' }
    if (ratio >= benchmarks.silver) return { label: 'Silver', color: '#cbd5e1', glow: '0 0 10px rgba(203,213,225,0.2)' }
    if (ratio >= benchmarks.bronze) return { label: 'Bronze', color: '#b45309', glow: 'none' }
    if (ratio >= benchmarks.iron) return { label: 'Iron', color: '#71717a', glow: 'none' }
    return { label: 'Unranked', color: '#3f3f46', glow: 'none' }
  }

  const analysis = useMemo(() => {
    const pushGroups: MuscleGroup[] = ['chest', 'deltoids', 'triceps', 'quads'];
    const pullGroups: MuscleGroup[] = ['upperBack', 'lowerBack', 'biceps', 'forearms', 'hamstrings', 'glutes'];
    const topGroups: MuscleGroup[] = ['chest', 'upperBack', 'deltoids', 'biceps', 'triceps', 'forearms'];
    const baseGroups: MuscleGroup[] = ['quads', 'hamstrings', 'glutes', 'calves'];

    const getAvg = (groups: MuscleGroup[]) => groups.reduce((a, b) => a + stats[b], 0) / groups.length;
    
    const push = getAvg(pushGroups);
    const pull = getAvg(pullGroups);
    const top = getAvg(topGroups);
    const base = getAvg(baseGroups);

    const balanceScore = Math.max(0, Math.min(100, Math.round(100 - Math.abs(push - pull) * 40)));
    const topBaseRatio = base > 0 ? top / base : 0;
    
    let foundation = 'Proportional';
    if (topBaseRatio > 1.2) foundation = 'Imbalance (Top Heavy)';
    else if (topBaseRatio < 0.8 && topBaseRatio > 0) foundation = 'Imbalance (Base Heavy)';

    // Radar Points (0-1 scale vs Spartan benchmark)
    const getRatio = (m: MuscleGroup) => Math.min(1, stats[m] / BENCHMARKS[m].spartan);
    const radarAxes = [
      getRatio('chest'),
      (getRatio('upperBack') + getRatio('lowerBack')) / 2,
      getRatio('deltoids'),
      (getRatio('biceps') + getRatio('triceps') + getRatio('forearms')) / 3,
      (getRatio('quads') + getRatio('hamstrings') + getRatio('glutes') + getRatio('calves')) / 4,
      getRatio('core')
    ];

    return { push, pull, top, base, balanceScore, topBaseRatio, foundation, radarAxes };
  }, [stats]);

  const overallRank = useMemo(() => {
    const activeGroups = Object.values(stats).filter(v => v > 0)
    if (activeGroups.length === 0) return getRank(0)
    const avg = activeGroups.reduce((a, b) => a + b, 0) / activeGroups.length
    return getRank(avg)
  }, [stats])

  const filteredLibrary = EXERCISE_LIBRARY.filter(ex => 
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !userExercises.find(ue => ue.id === ex.id)
  )

  const addExercise = (ex: ExerciseDef) => {
    setUserExercises(prev => [...prev, {
      id: ex.id,
      name: ex.name,
      weight: 0,
      reps: ex.category === 'Weightlifting' ? 5 : 8,
      primary: ex.primary,
      secondary: ex.secondary,
      isBodyweight: ex.isBodyweight,
      bwMultiplier: ex.bwMultiplier
    }])
    setShowLibrary(false)
    setSearchQuery('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] pointer-events-auto"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
          
          <div className="absolute inset-y-0 left-0 lg:left-[260px] right-0 flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20, pointerEvents: 'none' }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="bg-bg-primary mt-16 w-full max-w-[1450px] h-[88vh] max-h-[900px] rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-border-color flex flex-col md:flex-row pointer-events-auto">
            
            {/* Left: AI Anatomy Model Viewport */}
            <div 
              className="flex-1 bg-gradient-to-br from-bg-primary via-bg-card to-bg-primary p-6 flex flex-col items-center relative overflow-y-auto scrollbar-thin h-full border-b md:border-b-0"
              onMouseMove={handleMouseMove}
            >
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 blur-[100px]"
                  style={{ backgroundColor: overallRank.color }} />
              </div>

              {/* Cursor-Following Text Label */}
              <AnimatePresence>
                {hoveredMuscle && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      x: mousePos.x - (window.innerWidth < 1024 ? 0 : 380),
                      y: mousePos.y - 180
                    }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.5 }}
                    className="fixed pointer-events-none z-[110] px-4 py-2 bg-bg-card/90 backdrop-blur-xl rounded-2xl border border-border-color shadow-2xl flex flex-col items-center"
                    style={{ left: 0, top: 0, pointerEvents: 'none' }}
                  >
                    <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em] mb-1">Target Identified</span>
                    <span className="text-sm font-black italic uppercase tracking-wider" style={{ color: getRank(stats[hoveredMuscle], hoveredMuscle).color }}>
                      {hoveredMuscle === 'upperBack' ? 'Lats / Upper Back' : hoveredMuscle.replace(/([A-Z])/g, ' $1').trim()} — {getRank(stats[hoveredMuscle], hoveredMuscle).label}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative z-10 text-center w-full mb-8 pt-4">
                <motion.div
                  key={overallRank.label}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-black italic uppercase tracking-tighter"
                  style={{ color: overallRank.color, textShadow: overallRank.glow }}
                >
                  {overallRank.label}
                </motion.div>
                <div className="flex items-center justify-center gap-2 mt-1 relative">
                   <p className="text-text-secondary opacity-50 text-[10px] font-black tracking-widest uppercase">Performance Analysis</p>
                   {overallRank.label === 'Spartan' && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />}
                </div>
              </div>



              <div className="relative z-10 flex-1 w-full flex items-center justify-center min-h-0 py-4 lg:py-8">
                 <div className="h-full flex gap-4 md:gap-16 items-center justify-center">
                    <div className="h-full max-h-[600px] drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] transform transition-all duration-700 hover:scale-110">
                      <AnatomyFront getColor={(m) => getRank(stats[m], m).color} setHoveredMuscle={setHoveredMuscle} hoveredMuscle={hoveredMuscle} />
                    </div>
                    <div className="h-full max-h-[600px] drop-shadow-[0_0_30px_rgba(255,255,255,0.05)] transform transition-all duration-700 hover:scale-110">
                      <AnatomyBack getColor={(m) => getRank(stats[m], m).color} setHoveredMuscle={setHoveredMuscle} hoveredMuscle={hoveredMuscle} />
                    </div>
                 </div>
              </div>

               <div className="flex-shrink-0 w-full grid grid-cols-3 gap-3 pb-4 z-10 px-6">
                 {/* Top Row: Analytical Metrics */}
                  <div className="bg-bg-card backdrop-blur-sm border border-border-color rounded-3xl p-2 flex flex-col group relative overflow-hidden transition-all hover:bg-bg-primary/40">
                    <div className="flex-grow flex items-center justify-center min-h-[140px] relative">
                      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none p-1">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-text-primary">
                          <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="none" stroke="currentColor" strokeWidth="1" />
                          <polygon points="50,25 75,40 75,60 50,75 25,60 25,40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="10" y1="30" x2="90" y2="70" stroke="currentColor" strokeWidth="0.5" />
                          <line x1="10" y1="70" x2="90" y2="30" stroke="currentColor" strokeWidth="0.5" />
                          
                          {/* Axis Labels */}
                          <text x="50" y="5" textAnchor="middle" className="fill-text-secondary text-[6px] font-black uppercase">Chest</text>
                          <text x="95" y="28" textAnchor="start" className="fill-text-secondary text-[6px] font-black uppercase">Back</text>
                          <text x="95" y="75" textAnchor="start" className="fill-text-secondary text-[6px] font-black uppercase">Delts</text>
                          <text x="50" y="98" textAnchor="middle" className="fill-text-secondary text-[6px] font-black uppercase">Arms</text>
                          <text x="5" y="75" textAnchor="end" className="fill-text-secondary text-[6px] font-black uppercase">Legs</text>
                          <text x="5" y="28" textAnchor="end" className="fill-text-secondary text-[6px] font-black uppercase">Core</text>

                          <polygon points={`
                            ${50 + Math.sin(0) * analysis.radarAxes[0] * 42},${50 - Math.cos(0) * analysis.radarAxes[0] * 42}
                            ${50 + Math.sin(Math.PI/3) * analysis.radarAxes[1] * 42},${50 - Math.cos(Math.PI/3) * analysis.radarAxes[1] * 42}
                            ${50 + Math.sin(2*Math.PI/3) * analysis.radarAxes[2] * 42},${50 - Math.cos(2*Math.PI/3) * analysis.radarAxes[2] * 42}
                            ${50 + Math.sin(Math.PI) * analysis.radarAxes[3] * 42},${50 - Math.cos(Math.PI) * analysis.radarAxes[3] * 42}
                            ${50 + Math.sin(4*Math.PI/3) * analysis.radarAxes[4] * 42},${50 - Math.cos(4*Math.PI/3) * analysis.radarAxes[4] * 42}
                            ${50 + Math.sin(5*Math.PI/3) * analysis.radarAxes[5] * 42},${50 - Math.cos(5*Math.PI/3) * analysis.radarAxes[5] * 42}
                          `} className="fill-accent-purple/40 stroke-text-primary" strokeWidth="2.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="relative z-10 text-center mt-1">
                       <p className="text-[9px] text-text-secondary font-black uppercase tracking-widest mb-0.5 leading-none">Morphology</p>
                       <p className="text-[9px] text-text-primary font-black uppercase tracking-tighter leading-none">Structure Mapping</p>
                    </div>
                  </div>

                  <div className="bg-bg-card backdrop-blur-sm border border-border-color rounded-3xl p-4 flex flex-col group transition-all hover:bg-bg-primary/40">
                    <div className="flex justify-between items-center mb-1">
                       <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest leading-none">Balance Score</p>
                       <div className="w-1.5 h-1.5 rounded-full bg-accent-orange shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                    </div>
                    <span className="text-3xl text-text-primary font-black italic leading-none mb-3">{analysis.balanceScore}%</span>
                    
                    <div className="mt-auto">
                       <div className="flex justify-between items-center mb-1 text-[9px] font-black uppercase tracking-tighter">
                          <span className="text-text-secondary">Sync</span>
                       </div>
                       <div className="h-1 bg-text-primary/10 rounded-full overflow-hidden flex">
                          <div className="h-full bg-accent-orange transition-all duration-1000" style={{ width: `${analysis.balanceScore}%` }} />
                       </div>
                    </div>
                  </div>

                  <div className="bg-bg-card backdrop-blur-sm border border-border-color rounded-3xl p-4 flex flex-col group transition-all hover:bg-bg-primary/40">
                    <div className="flex justify-between items-center mb-1">
                       <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest leading-none">Foundation</p>
                    </div>
                    <span className="text-[10px] text-accent-orange font-black uppercase leading-tight mb-3 tracking-tighter">
                      {analysis.foundation}
                    </span>
                    
                    <div className="mt-auto">
                       <div className="flex justify-between items-center mb-1 text-[9px] font-black uppercase tracking-tighter">
                          <span className="text-text-secondary">Top/Base</span>
                          <span className="text-text-primary">{analysis.topBaseRatio.toFixed(2)}</span>
                       </div>
                       <div className="h-1 bg-text-primary/10 rounded-full overflow-hidden flex">
                          <div className="h-full bg-accent-orange transition-all duration-1000" style={{ width: `${Math.min(100, analysis.topBaseRatio * 50)}%` }} />
                       </div>
                    </div>
                  </div>

                  {/* Bottom Row: Core Power Metrics (Legacy) */}
                  <div className="bg-bg-card backdrop-blur-sm border border-border-color rounded-3xl p-4 flex items-center gap-3 group transition-all hover:bg-bg-primary/40">
                    <div className="w-9 h-9 rounded-2xl bg-accent-purple/10 flex items-center justify-center text-accent-purple group-hover:scale-110 transition-transform">
                       <Target size={18} />
                    </div>
                    <div>
                       <p className="text-[9px] text-text-secondary font-black uppercase tracking-wider leading-none mb-1">Avg Power</p>
                       <span className="text-xl text-text-primary font-black italic leading-none">
                         {(Object.values(stats).filter(v => v > 0).reduce((a, b) => a + b, 0) / Math.max(Object.values(stats).filter(v => v > 0).length, 1)).toFixed(2)}x
                       </span>
                    </div>
                  </div>

                  <div className="bg-bg-card backdrop-blur-sm border border-border-color rounded-3xl p-4 flex items-center gap-3 group transition-all hover:bg-bg-primary/40">
                    <div className="w-9 h-9 rounded-2xl bg-accent-teal/10 flex items-center justify-center text-accent-teal group-hover:scale-110 transition-transform">
                       <Zap size={18} />
                    </div>
                    <div>
                       <p className="text-[9px] text-text-secondary font-black uppercase tracking-wider leading-none mb-1">Active Clusters</p>
                       <span className="text-xl text-text-primary font-black italic leading-none">
                         {Object.values(stats).filter(v => v > 0).length}/12
                       </span>
                    </div>
                  </div>

                  <div className="bg-bg-card backdrop-blur-sm border border-border-color rounded-3xl p-4 flex items-center gap-3 group transition-all hover:bg-bg-primary/40">
                    <div className="w-9 h-9 rounded-2xl bg-accent-orange/10 flex items-center justify-center text-accent-orange group-hover:scale-110 transition-transform">
                       <Dumbbell size={18} />
                    </div>
                    <div>
                       <p className="text-[9px] text-text-secondary font-black uppercase tracking-wider leading-none mb-1">Engaged Units</p>
                       <span className="text-xl text-text-primary font-black italic leading-none">
                         {userExercises.length}
                       </span>
                    </div>
                  </div>
              </div>
            </div>

            {/* Right: Library & Selection Side */}
            <div className="w-full md:w-[420px] bg-bg-card border-l border-border-color flex flex-col h-full overflow-hidden">
              <div className="p-6 border-b border-border-color bg-bg-primary/50">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-text-primary uppercase flex items-center gap-2">
                       <Dumbbell className="text-accent-purple" size={20} /> Strength Vault
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-bg-primary rounded-full transition-colors text-text-secondary"><X size={20} /></button>
                 </div>
                 
                 <div className="bg-bg-card rounded-2xl border border-border-color p-4 mb-4 shadow-inner">
                    <label className="text-[10px] font-black text-accent-purple uppercase tracking-widest mb-1 block">Body Weight (kg)</label>
                    <input type="number" value={bodyWeight} onChange={e => setBodyWeight(Number(e.target.value))}
                      className="w-full bg-transparent text-2xl font-black outline-none text-text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                 </div>

                 {/* Import from last workout button always shows */}
                 <button
                   onClick={importLastWorkout}
                   className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-teal/10 border border-accent-teal/20 rounded-2xl text-accent-teal hover:bg-accent-teal/20 transition-all group"
                 >
                   <Download size={14} className="group-hover:animate-bounce" />
                   <span className="text-[11px] font-bold uppercase tracking-wider">Import Last Solo Workout</span>
                 </button>

                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                    <input 
                      placeholder="Search for an exercise..." 
                      value={searchQuery}
                      onFocus={() => setShowLibrary(true)}
                      onChange={e => { setSearchQuery(e.target.value); setShowLibrary(true); }}
                      className="w-full bg-bg-card border border-border-color rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:ring-2 focus:ring-accent-purple outline-none transition-all"
                    />
                    
                    {/* Library Dropdown Overlay */}
                    <AnimatePresence>
                      {showLibrary && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowLibrary(false)} />
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="absolute left-0 right-0 top-full mt-2 bg-white/95 dark:bg-[#0a0a0b]/95 backdrop-blur-3xl border border-border-color rounded-2xl shadow-2xl z-50 max-h-[400px] overflow-y-auto scrollbar-thin divide-y divide-border-color"
                          >
                            {filteredLibrary.length === 0 ? (
                              <div className="p-8 text-center text-text-secondary text-xs font-bold">No results found.</div>
                            ) : (
                              filteredLibrary.map(ex => (
                                <button key={ex.id} onClick={() => addExercise(ex)}
                                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-bg-primary transition-colors text-left group"
                                >
                                   <div>
                                      <p className="text-sm font-black text-text-primary">{ex.name}</p>
                                      <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">{ex.category} • {ex.primary.join(', ')}</p>
                                   </div>
                                  <Plus size={16} className="text-accent-teal opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))
                            )}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                 <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Active Tracker</p>
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">{userExercises.length} Units</p>
                 </div>

                 {userExercises.map((ex, idx) => {
                    const exScore = calculateScore(ex, bodyWeight)
                    const exRank = getRank(exScore, ex.primary[0])
                    const isYoga = EXERCISE_LIBRARY.find(l => l.id === ex.id)?.category === 'Yoga'
                    
                    return (
                      <motion.div key={`${ex.id}-${idx}`} layout
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="bg-bg-primary rounded-3xl border border-border-color overflow-hidden group hover:border-accent-purple/40 transition-all border-l-4"
                        style={{ borderLeftColor: exRank.color }}
                      >
                         <div className="p-5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                               <div>
                                  <h4 className="font-black text-sm text-text-primary uppercase tracking-wide flex items-center gap-2">
                                     {ex.name}
                                     {ex.isBodyweight && <span className="text-[9px] px-2 py-0.5 bg-accent-teal/10 text-accent-teal rounded-md font-black">BW</span>}
                                  </h4>
                                  <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-60">{ex.primary.join(' + ')}</span>
                               </div>
                               <button onClick={() => setUserExercises(userExercises.filter((_, i) => i !== idx))} 
                                 className="text-text-secondary hover:text-red-400 p-2 transition-colors"><Trash2 size={16} /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                               <div className="bg-bg-card rounded-2xl p-3 border border-transparent group-hover:border-border-color transition-all">
                                  <label className="text-[9px] font-black text-text-secondary uppercase mb-1 block">
                                    {isYoga ? 'Control Rating (1-10)' : ex.isBodyweight ? 'Added Load' : 'Load (kg)'}
                                  </label>
                                  <input type="number" value={ex.weight || ''} placeholder="0" 
                                    onChange={e => {
                                      const n = [...userExercises]; n[idx].weight = Number(e.target.value); setUserExercises(n)
                                    }} className="bg-transparent text-lg font-black w-full outline-none text-text-primary" />
                               </div>
                               <div className={`bg-bg-card rounded-2xl p-3 border border-transparent group-hover:border-border-color transition-all ${isYoga ? 'opacity-20 pointer-events-none' : ''}`}>
                                  <label className="text-[9px] font-black text-text-secondary uppercase mb-1 block">Reps</label>
                                  <input type="number" value={ex.reps || ''} placeholder="0"
                                    onChange={e => {
                                      const n = [...userExercises]; n[idx].reps = Number(e.target.value); setUserExercises(n)
                                    }} className="bg-transparent text-lg font-black w-full outline-none text-text-primary" />
                               </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-white/5">
                               <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: exRank.color, boxShadow: `0 0 10px ${exRank.color}50` }} />
                                  <span className="font-black italic uppercase text-xs" style={{ color: exRank.color }}>{exRank.label}</span>
                               </div>
                               <div className="flex items-center gap-1 text-text-secondary opacity-60">
                                  <Info size={12} />
                                  <span className="text-[9px] font-bold uppercase">{isYoga ? 'Yoga Logic' : `${exScore.toFixed(2)}x Rel. Strength`}</span>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )
                 })}
              </div>

              <div className="p-6 border-t border-border-color bg-bg-card/50">
                 <Button fullWidth size="lg" onClick={onClose} className="shadow-2xl shadow-accent-purple/20 py-4 h-auto font-black italic uppercase tracking-tighter">
                    Lock Analysis
                 </Button>
              </div>
            </div>
          </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
