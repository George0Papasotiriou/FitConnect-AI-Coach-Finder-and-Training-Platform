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
 * File: TrainingPrograms.tsx
 * Created: 2026-05-14
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Trash2, GripVertical,
  Sparkles, Share2, X, Search, Edit3, Dumbbell, Save, ArrowLeft,
  CheckCircle, Clock, Flame, TrendingUp, Heart
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { programsApi, ProgramExercise, ProgramDay } from '../../api/programs'
import { aiApi } from '../../api/ai'
import Button from '../../components/common/Button'
import { toast } from 'sonner'
import { useWorkoutStore, RECOVERY_HOURS } from '../../store/workoutStore'

// Exercise library organized by category
const EXERCISE_LIBRARY: Record<string, { name: string; icon: string }[]> = {
  'Chest': [
    { name: 'Bench Press', icon: '🏋️' },
    { name: 'Incline Dumbbell Press', icon: '🏋️' },
    { name: 'Cable Flyes', icon: '🔗' },
    { name: 'Push-ups', icon: '💪' },
    { name: 'Dumbbell Flyes', icon: '🏋️' },
    { name: 'Chest Dips', icon: '💪' },
    { name: 'Machine Chest Press', icon: '🏋️' },
    { name: 'Incline Barbell Press', icon: '🏋️' },
  ],
  'Back': [
    { name: 'Pull-ups', icon: '💪' },
    { name: 'Barbell Row', icon: '🏋️' },
    { name: 'Deadlift', icon: '🏋️' },
    { name: 'Lat Pulldown', icon: '🔗' },
    { name: 'Seated Cable Row', icon: '🔗' },
    { name: 'T-Bar Row', icon: '🏋️' },
    { name: 'Face Pulls', icon: '🔗' },
    { name: 'Chin-ups', icon: '💪' },
  ],
  'Legs': [
    { name: 'Squats', icon: '🏋️' },
    { name: 'Romanian Deadlift', icon: '🏋️' },
    { name: 'Leg Press', icon: '🏋️' },
    { name: 'Lunges', icon: '🦵' },
    { name: 'Calf Raises', icon: '🦵' },
    { name: 'Leg Curl', icon: '🦵' },
    { name: 'Leg Extension', icon: '🦵' },
    { name: 'Bulgarian Split Squat', icon: '🦵' },
    { name: 'Hip Thrust', icon: '🏋️' },
  ],
  'Shoulders': [
    { name: 'Overhead Press', icon: '🏋️' },
    { name: 'Lateral Raises', icon: '🏋️' },
    { name: 'Front Raises', icon: '🏋️' },
    { name: 'Face Pulls', icon: '🔗' },
    { name: 'Arnold Press', icon: '🏋️' },
    { name: 'Rear Delt Flyes', icon: '🏋️' },
    { name: 'Upright Row', icon: '🏋️' },
  ],
  'Arms': [
    { name: 'Barbell Curl', icon: '💪' },
    { name: 'Hammer Curls', icon: '💪' },
    { name: 'Tricep Dips', icon: '💪' },
    { name: 'Skull Crushers', icon: '💪' },
    { name: 'Cable Curls', icon: '🔗' },
    { name: 'Tricep Pushdown', icon: '🔗' },
    { name: 'Preacher Curls', icon: '💪' },
    { name: 'Overhead Tricep Extension', icon: '💪' },
  ],
  'Core': [
    { name: 'Plank', icon: '🧘' },
    { name: 'Crunches', icon: '🧘' },
    { name: 'Russian Twists', icon: '🧘' },
    { name: 'Leg Raises', icon: '🧘' },
    { name: 'Dead Bug', icon: '🧘' },
    { name: 'Ab Wheel Rollout', icon: '🧘' },
    { name: 'Mountain Climbers', icon: '🧘' },
    { name: 'Bicycle Crunches', icon: '🧘' },
  ],
  'Cardio': [
    { name: 'Running', icon: '🏃' },
    { name: 'Cycling', icon: '🚴' },
    { name: 'Jump Rope', icon: '🤸' },
    { name: 'Rowing', icon: '🚣' },
    { name: 'Stair Climber', icon: '🧗' },
    { name: 'Burpees', icon: '🤸' },
    { name: 'Sprints', icon: '🏃' },
    { name: 'Boxing', icon: '🥊' },
  ],
  'Flexibility': [
    { name: 'Static Stretching', icon: '🧘' },
    { name: 'Dynamic Stretching', icon: '🧘' },
    { name: 'Foam Rolling', icon: '🧘' },
    { name: 'Yoga Flow', icon: '🧘' },
    { name: 'Mobility Drills', icon: '🧘' },
  ],
  'Sport': [
    { name: 'Agility Drills', icon: '⚡' },
    { name: 'Plyometrics', icon: '⚡' },
    { name: 'Speed Training', icon: '⚡' },
    { name: 'Sport-Specific Drills', icon: '⚽' },
    { name: 'Coordination Work', icon: '⚽' },
  ]
}

const CATEGORIES = Object.keys(EXERCISE_LIBRARY)

export default function TrainingPrograms() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [programs, setPrograms] = useState<Record<string, ProgramExercise[]>>({})
  const [showExercisePicker, setShowExercisePicker] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [selectedExCategory, setSelectedExCategory] = useState('Chest')
  const [customExerciseName, setCustomExerciseName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [programName, setProgramName] = useState('My Training Program')
  const [programId, setProgramId] = useState<string | null>(null)

  // Calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad with empty days for alignment to Monday start
  const startDayOfWeek = monthStart.getDay()
  const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedExercises = selectedDateKey ? (programs[selectedDateKey] || []) : []

  // Load program on mount
  useEffect(() => {
    programsApi.getPrograms().then(data => {
      if (data.length > 0) {
        const prog = data[0]
        setProgramId(prog.id)
        setProgramName(prog.name)
        const map: Record<string, ProgramExercise[]> = {}
        prog.days?.forEach(day => {
          map[day.dayDate] = day.exercises || []
        })
        setPrograms(map)
      }
    }).catch(() => {})
  }, [])

  // Workout store integration
  const { completedWorkouts, getWorkoutsForDate } = useWorkoutStore()

  // Get completed workout dates for this month
  const completedDates = useMemo(() => {
    const set = new Set<string>()
    completedWorkouts.forEach(w => set.add(w.date))
    return set
  }, [completedWorkouts])

  // Get days that have exercises
  const daysWithExercises = useMemo(() => new Set(Object.keys(programs).filter(k => programs[k].length > 0)), [programs])

  const addExercise = (name: string, category: string, isCustom = false) => {
    if (!selectedDateKey) return
    const exercise: ProgramExercise = {
      exerciseName: name,
      exerciseCategory: category,
      sets: 3,
      reps: 10,
      sortOrder: selectedExercises.length,
      isCustom,
    }
    setPrograms(prev => ({
      ...prev,
      [selectedDateKey]: [...(prev[selectedDateKey] || []), exercise]
    }))
    setShowExercisePicker(false)
    setCustomExerciseName('')
  }

  const removeExercise = (index: number) => {
    if (!selectedDateKey) return
    setPrograms(prev => ({
      ...prev,
      [selectedDateKey]: prev[selectedDateKey].filter((_, i) => i !== index)
    }))
  }

  const updateExercise = (index: number, field: string, value: any) => {
    if (!selectedDateKey) return
    setPrograms(prev => ({
      ...prev,
      [selectedDateKey]: prev[selectedDateKey].map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex
      )
    }))
  }

  const saveProgram = async () => {
    try {
      const days = Object.entries(programs).filter(([_, exs]) => exs.length > 0).map(([date, exercises]) => ({
        dayDate: date,
        exercises
      }))

      if (programId) {
        await programsApi.updateProgram(programId, { name: programName, days } as any)
      } else {
        const prog = await programsApi.createProgram({ name: programName })
        setProgramId(prog.id)
        // Save days
        for (const day of days) {
          await programsApi.saveDay(prog.id, day)
        }
      }
      toast.success('Program saved successfully!')
    } catch {
      toast.error('Failed to save program')
    }
  }

  const generateWithAI = async () => {
    setIsGenerating(true)
    try {
      const result = await aiApi.generateProgram({
        goals: ['general fitness'],
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
      })

      // Map generated program to calendar (starting from next Monday)
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const today = new Date()
      const newPrograms: Record<string, ProgramExercise[]> = { ...programs }

      result.days?.forEach(day => {
        const dayIndex = dayNames.indexOf(day.dayOfWeek)
        if (dayIndex === -1) return

        // Find next occurrence of this day
        const target = new Date(today)
        const diff = (dayIndex - today.getDay() + 7) % 7
        target.setDate(today.getDate() + (diff === 0 ? 7 : diff))
        const key = format(target, 'yyyy-MM-dd')

        newPrograms[key] = day.exercises.map((ex, i) => ({
          exerciseName: ex.name,
          exerciseCategory: ex.category,
          sets: ex.sets,
          reps: ex.reps,
          duration: ex.duration,
          notes: ex.notes || '',
          sortOrder: i,
        }))
      })

      setProgramName(result.name || 'AI Generated Program')
      setPrograms(newPrograms)
      toast.success('AI program generated! Review and save when ready.')
    } catch {
      toast.error('Failed to generate program. Try again.')
    }
    setIsGenerating(false)
  }

  const filteredExercises = useMemo(() => {
    const exercises = EXERCISE_LIBRARY[selectedExCategory] || []
    if (!exerciseSearch) return exercises
    return exercises.filter(e => e.name.toLowerCase().includes(exerciseSearch.toLowerCase()))
  }, [selectedExCategory, exerciseSearch])

  // Also search across all categories
  const globalSearchResults = useMemo(() => {
    if (!exerciseSearch) return []
    const results: { name: string; icon: string; category: string }[] = []
    for (const [cat, exercises] of Object.entries(EXERCISE_LIBRARY)) {
      for (const ex of exercises) {
        if (ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())) {
          results.push({ ...ex, category: cat })
        }
      }
    }
    return results.slice(0, 10)
  }, [exerciseSearch])

  return (
    <>
      <Helmet><title>My Programs — Insta Coach</title></Helmet>

      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text-primary">
              <span className="gradient-text">Training Programs</span>
            </h1>
            <p className="text-text-secondary text-sm mt-1">Build your custom workout program</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={generateWithAI} variant="secondary" size="sm" isLoading={isGenerating} leftIcon={<Sparkles size={16} />}>
              Generate with AI
            </Button>
            <Button onClick={saveProgram} size="sm" leftIcon={<Save size={16} />}>
              Save Program
            </Button>
          </div>
        </motion.div>

        {/* Program Name */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <input
            value={programName}
            onChange={e => setProgramName(e.target.value)}
            className="bg-transparent text-xl font-bold text-text-primary focus:outline-none border-b-2 border-transparent focus:border-accent-purple pb-1 w-full max-w-md"
            placeholder="Program name..."
          />
        </motion.div>

        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-bg-card border border-border-color rounded-2xl p-5"
          >
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-bg-card-hover transition-colors">
                <ChevronLeft size={20} className="text-text-secondary" />
              </button>
              <h3 className="text-lg font-bold text-text-primary">
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-bg-card-hover transition-colors">
                <ChevronRight size={20} className="text-text-secondary" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-text-secondary py-2">{day}</div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Padding */}
              {Array.from({ length: paddingDays }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}

            {calendarDays.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const hasExercises = daysWithExercises.has(dateKey)
                const hasCompleted = completedDates.has(dateKey)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const today = isToday(day)

                return (
                  <motion.button
                    key={dateKey}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all text-sm ${
                      isSelected
                        ? 'bg-accent-purple text-white ring-2 ring-accent-purple ring-offset-2 ring-offset-bg-card'
                        : today
                        ? 'bg-accent-teal/20 text-accent-teal border border-accent-teal/30'
                        : 'hover:bg-bg-card-hover text-text-primary'
                    }`}
                  >
                    <span className={`font-medium ${isSelected ? 'text-white' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="flex gap-0.5 mt-0.5">
                      {hasExercises && (
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-accent-purple'
                        }`} />
                      )}
                      {hasCompleted && (
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-green-400'
                        }`} />
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          {/* Day Detail Panel */}
          <AnimatePresence mode="wait">
            {selectedDate ? (
              <motion.div
                key={selectedDateKey}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-bg-card border border-border-color rounded-2xl p-5 flex flex-col"
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-text-primary">{format(selectedDate, 'EEEE')}</h3>
                    <p className="text-sm text-text-secondary">{format(selectedDate, 'MMMM d, yyyy')}</p>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-2 rounded-lg hover:bg-bg-card-hover transition-colors lg:hidden"
                  >
                    <X size={18} className="text-text-secondary" />
                  </button>
                </div>

                {/* Completed Workout Stats (if any) */}
                {(() => {
                  const dayWorkouts = getWorkoutsForDate(selectedDateKey!)
                  if (dayWorkouts.length === 0) return null
                  const totalVol = dayWorkouts.reduce((a, w) => a + w.totalVolume, 0)
                  const totalDur = dayWorkouts.reduce((a, w) => a + w.durationMinutes, 0)
                  const allMuscles = [...new Set(dayWorkouts.flatMap(w => w.musclesWorked))]
                  return (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle size={14} className="text-green-400" />
                        <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Completed Workout</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm font-black text-text-primary">{totalVol.toLocaleString()}<span className="text-[9px] text-text-secondary">kg</span></p>
                          <p className="text-[8px] text-text-secondary uppercase">Volume</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-text-primary">{totalDur}<span className="text-[9px] text-text-secondary">min</span></p>
                          <p className="text-[8px] text-text-secondary uppercase">Duration</p>
                        </div>
                        <div>
                          <p className="text-sm font-black text-text-primary">{dayWorkouts.reduce((a, w) => a + w.totalSets, 0)}</p>
                          <p className="text-[8px] text-text-secondary uppercase">Sets</p>
                        </div>
                      </div>
                      {allMuscles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {allMuscles.map(m => (
                            <span key={m} className="px-1.5 py-0.5 bg-green-500/10 text-green-400 rounded text-[8px] font-bold capitalize">{m}</span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )
                })()}

                {/* Exercise List */}
                <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin max-h-[50vh]">
                  {selectedExercises.length === 0 ? (
                    <div className="text-center py-8">
                      <Dumbbell size={32} className="mx-auto text-text-secondary mb-2" />
                      <p className="text-text-secondary text-sm font-medium">No exercises yet</p>
                      <p className="text-text-secondary text-xs mt-1">Add exercises to build your workout</p>
                    </div>
                  ) : (
                    selectedExercises.map((ex, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-bg-card-hover border border-border-color rounded-xl p-3 group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical size={14} className="text-text-secondary cursor-grab" />
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple font-medium">
                            {ex.exerciseCategory}
                          </span>
                          <span className="flex-1 text-sm font-semibold text-text-primary truncate">{ex.exerciseName}</span>
                          {ex.isCustom && <Edit3 size={12} className="text-accent-teal" />}
                          <button
                            onClick={() => removeExercise(i)}
                            className="p-1 rounded text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-text-secondary uppercase">Sets</label>
                            <input
                              type="number"
                              value={ex.sets}
                              onChange={e => updateExercise(i, 'sets', parseInt(e.target.value) || 0)}
                              className="w-full bg-bg-primary border border-border-color rounded-lg px-2 py-1 text-sm text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-accent-purple"
                              min={1}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-text-secondary uppercase">Reps</label>
                            <input
                              type="number"
                              value={ex.reps}
                              onChange={e => updateExercise(i, 'reps', parseInt(e.target.value) || 0)}
                              className="w-full bg-bg-primary border border-border-color rounded-lg px-2 py-1 text-sm text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-accent-purple"
                              min={1}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-text-secondary uppercase">Weight</label>
                            <input
                              type="number"
                              value={ex.weight || ''}
                              onChange={e => updateExercise(i, 'weight', parseFloat(e.target.value) || undefined)}
                              placeholder="kg"
                              className="w-full bg-bg-primary border border-border-color rounded-lg px-2 py-1 text-sm text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-accent-purple"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Add Exercise Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setShowExercisePicker(true)}
                  className="mt-4 w-full py-3 border-2 border-dashed border-accent-purple/40 rounded-xl text-accent-purple font-medium text-sm hover:bg-accent-purple/5 hover:border-accent-purple transition-all flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Add Exercise
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-bg-card border border-border-color rounded-2xl p-8 flex items-center justify-center"
              >
                <div className="text-center">
                  <Calendar size={40} className="mx-auto text-accent-purple/40 mb-3" />
                  <p className="text-text-secondary font-medium">Select a Day</p>
                  <p className="text-text-secondary text-xs mt-1">Click on a calendar day to build your workout</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Exercise Picker Modal */}
      <AnimatePresence>
        {showExercisePicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExercisePicker(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-bg-card border border-border-color rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-border-color flex items-center justify-between">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <Dumbbell size={18} className="text-accent-purple" />
                  Add Exercise
                </h3>
                <button onClick={() => setShowExercisePicker(false)} className="p-1.5 rounded-lg hover:bg-bg-card-hover">
                  <X size={18} className="text-text-secondary" />
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-border-color">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    value={exerciseSearch}
                    onChange={e => setExerciseSearch(e.target.value)}
                    placeholder="Search exercises..."
                    className="w-full bg-bg-primary border border-border-color rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple"
                    autoFocus
                  />
                </div>
              </div>

              {/* Global search results */}
              {exerciseSearch && globalSearchResults.length > 0 && (
                <div className="p-3 border-b border-border-color">
                  <p className="text-xs text-text-secondary mb-2 font-medium">Search Results</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {globalSearchResults.map((ex) => (
                      <button
                        key={`${ex.category}-${ex.name}`}
                        onClick={() => addExercise(ex.name, ex.category)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg-card-hover transition-colors text-left"
                      >
                        <span className="text-lg">{ex.icon}</span>
                        <span className="text-sm text-text-primary font-medium">{ex.name}</span>
                        <span className="text-xs text-text-secondary ml-auto">{ex.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Tabs */}
              <div className="flex overflow-x-auto gap-1 p-3 border-b border-border-color scrollbar-thin">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedExCategory(cat); setExerciseSearch('') }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedExCategory === cat
                        ? 'bg-accent-purple text-white'
                        : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Exercise List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {filteredExercises.map(ex => (
                  <motion.button
                    key={ex.name}
                    whileHover={{ x: 4 }}
                    onClick={() => addExercise(ex.name, selectedExCategory)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-card-hover transition-all text-left"
                  >
                    <span className="text-xl">{ex.icon}</span>
                    <span className="text-sm font-medium text-text-primary">{ex.name}</span>
                    <Plus size={16} className="text-text-secondary ml-auto" />
                  </motion.button>
                ))}
              </div>

              {/* Custom Exercise */}
              <div className="p-3 border-t border-border-color">
                <p className="text-xs text-text-secondary mb-2 font-medium">Custom Exercise</p>
                <div className="flex gap-2">
                  <input
                    value={customExerciseName}
                    onChange={e => setCustomExerciseName(e.target.value)}
                    placeholder="Enter custom exercise name..."
                    className="flex-1 bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && customExerciseName.trim()) {
                        addExercise(customExerciseName.trim(), selectedExCategory, true)
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    disabled={!customExerciseName.trim()}
                    onClick={() => {
                      if (customExerciseName.trim()) {
                        addExercise(customExerciseName.trim(), selectedExCategory, true)
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
