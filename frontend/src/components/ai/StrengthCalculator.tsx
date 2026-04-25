import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Dumbbell, Info, TrendingUp, Zap, Trophy, Heart } from 'lucide-react'
import Button from '../common/Button'
import Card from '../common/Card'

interface StrengthCalculatorProps {
  isOpen: boolean
  onClose: () => void
}

type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core'

interface Exercise {
  name: string
  weight: number
  reps: number
  muscle: MuscleGroup
}

const MUSCLE_PATHS: Record<MuscleGroup, string> = {
  chest: "M 45 42 Q 50 40 55 42 Q 55 52 50 55 Q 45 52 45 42",
  back: "M 45 40 Q 50 38 55 40 Q 60 45 58 60 Q 50 65 42 60 Q 40 45 45 40",
  shoulders: "M 40 40 Q 35 45 40 50 M 60 40 Q 65 45 60 50",
  legs: "M 42 65 Q 40 85 45 100 M 58 65 Q 60 85 55 100",
  arms: "M 38 45 Q 30 60 35 70 M 62 45 Q 70 60 65 70",
  core: "M 48 55 Q 50 54 52 55 Q 54 65 50 68 Q 46 65 48 55",
}

export default function StrengthCalculator({ isOpen, onClose }: StrengthCalculatorProps) {
  const [exercises, setExercises] = useState<Exercise[]>([
    { name: 'Bench Press', weight: 60, reps: 8, muscle: 'chest' },
    { name: 'Deadlift', weight: 100, reps: 5, muscle: 'back' },
    { name: 'Squat', weight: 80, reps: 5, muscle: 'legs' },
  ])
  const [bodyWeight, setBodyWeight] = useState(75)

  const calculate1RM = (weight: number, reps: number) => weight * (1 + reps / 30)

  const stats = useMemo(() => {
    const muscleStrength: Record<MuscleGroup, number> = {
      chest: 0, back: 0, shoulders: 0, legs: 0, arms: 0, core: 0
    }
    
    exercises.forEach(ex => {
      const oneRM = calculate1RM(ex.weight, ex.reps)
      muscleStrength[ex.muscle] = Math.max(muscleStrength[ex.muscle], oneRM / bodyWeight)
    })

    return muscleStrength
  }, [exercises, bodyWeight])

  const getRank = (ratio: number) => {
    if (ratio >= 2.5) return { label: 'Elite Circle', color: 'text-yellow-400', bg: 'fill-yellow-400/80', glow: 'drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' }
    if (ratio >= 1.8) return { label: 'Iron Vanguard', color: 'text-accent-teal', bg: 'fill-accent-teal/80', glow: 'drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]' }
    if (ratio >= 1.2) return { label: 'Adept', color: 'text-blue-400', bg: 'fill-blue-400/80', glow: 'drop-shadow-[0_0_4px_rgba(96,165,250,0.6)]' }
    return { label: 'Novice', color: 'text-gray-400', bg: 'fill-gray-400/40', glow: '' }
  }

  const overallRank = useMemo(() => {
    const avg = Object.values(stats).reduce((a, b) => a + b, 0) / 6
    return getRank(avg * 2) // Simplified overall multiplier
  }, [stats])

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
          
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-bg-primary w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-border-color flex flex-col md:flex-row">
            
            {/* Left: Visualization */}
            <div className="flex-1 bg-gradient-to-br from-bg-card to-bg-primary p-8 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,var(--accent-purple)_0%,transparent_70%)]" />
              </div>

              <div className="relative z-10 text-center mb-8">
                <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}
                  className={`text-4xl font-black italic uppercase tracking-tighter mb-2 ${overallRank.color} ${overallRank.glow}`}>
                  {overallRank.label}
                </motion.div>
                <p className="text-text-secondary text-sm font-medium">Strength Assessment Model</p>
              </div>

              <svg viewBox="0 0 100 120" className="w-full max-w-xs h-auto drop-shadow-2xl">
                {/* Background Shadow Person */}
                <path d="M 50 15 C 45 15 42 20 42 25 C 42 30 45 35 50 35 C 55 35 58 30 58 25 C 58 20 55 15 50 15 M 40 40 L 60 40 L 65 70 L 55 100 L 45 100 L 35 70 Z" 
                  className="fill-bg-card-hover" />
                
                {/* Muscle Groups */}
                {Object.entries(MUSCLE_PATHS).map(([group, path]) => {
                  const rank = getRank(stats[group as MuscleGroup])
                  return (
                    <motion.path
                      key={group}
                      d={path}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: stats[group as MuscleGroup] > 0 ? 1 : 0.2,
                        fill: stats[group as MuscleGroup] > 0 ? undefined : '' 
                      }}
                      className={`${rank.bg} transition-colors duration-500 stroke-bg-primary stroke-[0.5]`}
                    />
                  )
                })}
              </svg>

              <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
                {Object.entries(stats).map(([group, ratio]) => {
                  const rank = getRank(ratio)
                  return (
                    <div key={group} className="flex flex-col items-center p-2 rounded-xl bg-bg-card/50 border border-border-color/50">
                      <span className="text-[10px] uppercase font-bold text-text-secondary mb-1">{group}</span>
                      <span className={`text-xs font-black ${rank.color}`}>{rank.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: Controls */}
            <div className="w-full md:w-[400px] bg-bg-card border-l border-border-color p-6 flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-text-primary flex items-center gap-2">
                  <Dumbbell className="text-accent-purple" /> Metrics
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-bg-primary rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-text-secondary uppercase">Body Weight (kg)</label>
                  <input type="number" value={bodyWeight} onChange={(e) => setBodyWeight(Number(e.target.value))}
                    className="w-full bg-bg-primary border border-border-color rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-accent-purple outline-none" />
                </div>

                <div className="pt-4 border-t border-border-color">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-text-primary">Exercises</h4>
                    <Button size="sm" variant="ghost" onClick={() => setExercises([...exercises, { name: 'New PR', weight: 0, reps: 1, muscle: 'chest' }])}>
                      Add New
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {exercises.map((ex, idx) => (
                      <Card key={idx} className="!p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <input value={ex.name} onChange={(e) => {
                            const newEx = [...exercises]; newEx[idx].name = e.target.value; setExercises(newEx)
                          }} className="bg-transparent font-bold text-sm text-text-primary outline-none focus:text-accent-purple" />
                          <button onClick={() => setExercises(exercises.filter((_, i) => i !== idx))}
                            className="text-text-secondary hover:text-red-400 transition-colors"><X size={14} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-text-secondary font-bold truncate">WEIGHT (KG)</span>
                            <input type="number" value={ex.weight} onChange={(e) => {
                              const newEx = [...exercises]; newEx[idx].weight = Number(e.target.value); setExercises(newEx)
                            }} className="w-full bg-bg-primary rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-accent-purple" />
                          </div>
                          <div>
                            <span className="text-[10px] text-text-secondary font-bold truncate">REPS</span>
                            <input type="number" value={ex.reps} onChange={(e) => {
                              const newEx = [...exercises]; newEx[idx].reps = Number(e.target.value); setExercises(newEx)
                            }} className="w-full bg-bg-primary rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-accent-purple" />
                          </div>
                        </div>
                        <select value={ex.muscle} onChange={(e) => {
                          const newEx = [...exercises]; newEx[idx].muscle = e.target.value as any; setExercises(newEx)
                        }} className="w-full bg-bg-primary rounded-lg px-3 py-2 text-xs outline-none border-none">
                          <option value="chest">Chest</option>
                          <option value="back">Back</option>
                          <option value="shoulders">Shoulders</option>
                          <option value="legs">Legs</option>
                          <option value="arms">Arms</option>
                          <option value="core">Core</option>
                        </select>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border-color space-y-3">
                <div className="flex items-center gap-2 text-xs text-accent-teal font-bold bg-accent-teal/10 p-3 rounded-xl border border-accent-teal/20">
                  <Trophy size={14} />
                  <span>Calculated 1RM: {Math.round(exercises.reduce((acc, ex) => acc + calculate1RM(ex.weight, ex.reps), 0))}kg Power Total</span>
                </div>
                <Button fullWidth size="lg" className="shadow-lg shadow-accent-purple/20" onClick={() => {
                   onClose();
                   // Here we could emit an event to the AI chat to discuss results
                }}>
                  Analyze Performance
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
