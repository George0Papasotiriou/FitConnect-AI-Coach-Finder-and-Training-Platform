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
 * File: RecoveryDashboard.tsx
 * Created: 2026-05-14
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Heart, Zap, Clock, Activity, AlertCircle, Dumbbell, ChevronRight, Sparkles, Moon, Droplets, Apple, Brain } from 'lucide-react'
import Card from '../../components/common/Card'
import { useStrengthStore } from '../../store/strengthStore'
import { useWorkoutStore, RECOVERY_HOURS } from '../../store/workoutStore'
import { AnatomyFront, AnatomyBack } from '../../components/ai/AnatomyModel'
import { MuscleGroup } from '../../components/ai/StrengthCalculator'
import { aiApi } from '../../api/ai'

const MUSCLE_NAMES: Record<MuscleGroup, string> = {
  chest: 'Pectorals',
  upperBack: 'Lats & Traps',
  lowerBack: 'Erector Spinae',
  deltoids: 'Deltoids',
  biceps: 'Biceps Brachii',
  triceps: 'Triceps Brachii',
  forearms: 'Brachioradialis',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Gluteus Maximus',
  calves: 'Gastrocnemius',
  core: 'Abdominals'
}

const RECOVERY_TIPS_MAP: Record<string, string[]> = {
  chest: ['Pec stretches with doorway stretch', 'Foam roll pectorals gently', 'Apply heat pack for blood flow'],
  upperBack: ['Cat-cow stretches', 'Lat stretches with band', 'Deep tissue massage on lats'],
  lowerBack: ['Child\u2019s pose hold 30s', 'Supine twist stretches', 'Avoid heavy lifting today'],
  deltoids: ['Arm-across-body stretch', 'Shoulder circles', 'Ice if inflammation present'],
  biceps: ['Straight arm stretches', 'Light band curls for blood flow', 'Gentle massage'],
  triceps: ['Overhead tricep stretch', 'Light pushdowns', 'Static stretches 20s each'],
  forearms: ['Wrist flexor/extensor stretches', 'Hand grip squeezes', 'Contrast bath therapy'],
  quads: ['Couch stretch hold 30s/side', 'Foam roll quads', 'Gentle walking for circulation'],
  hamstrings: ['Standing hamstring stretch', 'Foam roll posterior chain', 'Light nordic curls'],
  glutes: ['Pigeon pose', 'Figure-4 stretch', 'Glute foam rolling'],
  calves: ['Wall calf stretch', 'Downward dog holds', 'Ankle mobility circles'],
  core: ['Gentle yoga flow', 'Dead hang from bar', 'Diaphragmatic breathing']
}

export default function RecoveryDashboard() {
  const { getRecoveryProgress, fatigue } = useStrengthStore()
  const { getMuscleRecoveryStatus, completedWorkouts, getLastWorkoutForMuscle } = useWorkoutStore()
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null)
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null)
  const [aiRecoveryTip, setAiRecoveryTip] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const muscleStats = useMemo(() => {
    const groups: MuscleGroup[] = ['chest', 'upperBack', 'lowerBack', 'deltoids', 'biceps', 'triceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'calves', 'core']
    return groups.map(m => {
      const workoutRecovery = getMuscleRecoveryStatus(m)
      const storeRecovery = getRecoveryProgress(m)
      // Use the lower of the two recovery values for safety
      const combinedProgress = Math.min(workoutRecovery.percent, storeRecovery)
      const lastWorkout = getLastWorkoutForMuscle(m)
      return {
        id: m,
        name: MUSCLE_NAMES[m],
        progress: combinedProgress,
        hoursRemaining: workoutRecovery.hoursRemaining,
        totalRecoveryHours: RECOVERY_HOURS[m] || 48,
        lastWorked: lastWorkout ? `${Math.round(lastWorkout.hoursAgo)}h ago` : 'Not tracked',
        fatigueObj: fatigue[m]
      }
    })
  }, [getRecoveryProgress, getMuscleRecoveryStatus, getLastWorkoutForMuscle, fatigue])

  const overallRecovery = useMemo(() => {
    const sum = muscleStats.reduce((acc, m) => acc + m.progress, 0)
    return Math.round(sum / muscleStats.length)
  }, [muscleStats])

  const readyMuscles = muscleStats.filter(m => m.progress >= 90)
  const sorenMuscles = muscleStats.filter(m => m.progress < 70)

  // Fetch AI recovery tips when a muscle is selected
  const fetchAiTip = useCallback(async (muscle: MuscleGroup) => {
    setAiLoading(true)
    try {
      const status = getMuscleRecoveryStatus(muscle)
      const result = await aiApi.chat(
        `My ${MUSCLE_NAMES[muscle]} muscle group is currently ${status.percent}% recovered (${Math.round(status.hoursRemaining)} hours remaining). ` +
        `Give me 2-3 concise, actionable recovery tips specific to this muscle group including nutrition, sleep, and stretching advice. Keep it brief.`,
        []
      )
      setAiRecoveryTip(result.response)
    } catch {
      setAiRecoveryTip('Focus on hydration, adequate protein intake (1.6-2.2g/kg), and 7-9 hours of quality sleep for optimal recovery.')
    }
    setAiLoading(false)
  }, [getMuscleRecoveryStatus])

  useEffect(() => {
    if (selectedMuscle) fetchAiTip(selectedMuscle)
  }, [selectedMuscle, fetchAiTip])

  const getRecoveryColor = (m: MuscleGroup): string => {
    const stat = muscleStats.find(s => s.id === m)
    const progress = stat?.progress ?? 100
    if (progress >= 90) return '#10b981'
    if (progress >= 70) return '#fbbf24'
    if (progress >= 40) return '#f97316'
    return '#ef4444'
  }

  // Recommended next session
  const nextSessionRec = useMemo(() => {
    const ready = readyMuscles.map(m => m.id)
    if (ready.includes('chest') && ready.includes('triceps')) return 'Push Day (Chest + Triceps)'
    if (ready.includes('upperBack') && ready.includes('biceps')) return 'Pull Day (Back + Biceps)'
    if (ready.includes('quads') && ready.includes('hamstrings')) return 'Leg Day'
    if (ready.includes('deltoids')) return 'Shoulders + Core'
    if (ready.length > 3) return 'Full Body Light'
    return 'Active Recovery / Mobility'
  }, [readyMuscles])

  const lastWorkoutDate = completedWorkouts.length > 0 ? completedWorkouts[0] : null
  const hoursSinceLastWorkout = lastWorkoutDate
    ? Math.round((Date.now() - new Date(lastWorkoutDate.finishedAt).getTime()) / (1000 * 60 * 60))
    : null

  return (
    <>
      <Helmet><title>Recovery Dashboard — Insta Coach</title></Helmet>
      
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-black text-text-primary flex items-center gap-3">
             <Heart className="text-red-400" /> Recovery Dashboard
          </h1>
          <p className="text-text-secondary mt-1">AI-driven biometric analysis of your muscle fatigue and central nervous system recovery.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Statistics Overview */}
          <div className="lg:col-span-1 space-y-4">
             <Card className="text-center p-8 bg-gradient-to-br from-bg-card to-bg-primary border-accent-teal/20">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-bg-card-hover" />
                    <circle 
                      cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 * (1 - overallRecovery / 100)}
                      className="text-accent-teal transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-text-primary">{overallRecovery}%</span>
                    <span className="text-[10px] font-black uppercase text-text-secondary">Readiness</span>
                  </div>
                </div>
                <h3 className="font-bold text-text-primary">Daily Readiness</h3>
                <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                  {overallRecovery > 80 ? 'You are peaked! Perfect day for a heavy PR session.' : overallRecovery > 50 ? 'Moderate fatigue detected. Consider a hypertrophy or zone 2 session.' : 'High fatigue — prioritize active recovery, sleep and nutrition.'}
                </p>
             </Card>

             <Card className="p-4 space-y-4">
                <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" /> Bio-Markers
                </h3>
                <div className="space-y-3">
                   <div className="flex justify-between items-center bg-bg-primary p-3 rounded-xl border border-border-color">
                      <span className="text-xs font-medium text-text-secondary">CNS Fatigue</span>
                      <span className={`text-xs font-black ${overallRecovery > 70 ? 'text-accent-teal' : 'text-orange-400'}`}>{overallRecovery > 70 ? 'Low' : overallRecovery > 40 ? 'Moderate' : 'High'}</span>
                   </div>
                   <div className="flex justify-between items-center bg-bg-primary p-3 rounded-xl border border-border-color">
                      <span className="text-xs font-medium text-text-secondary">Last Workout</span>
                      <span className="text-xs font-black text-text-primary">{hoursSinceLastWorkout !== null ? `${hoursSinceLastWorkout}h ago` : 'No data'}</span>
                   </div>
                   <div className="flex justify-between items-center bg-bg-primary p-3 rounded-xl border border-border-color">
                      <span className="text-xs font-medium text-text-secondary">Ready Muscles</span>
                      <span className="text-xs font-black text-accent-teal">{readyMuscles.length}/12</span>
                   </div>
                   <div className="flex justify-between items-center bg-bg-primary p-3 rounded-xl border border-border-color">
                      <span className="text-xs font-medium text-text-secondary">Sore Muscles</span>
                      <span className={`text-xs font-black ${sorenMuscles.length > 0 ? 'text-red-400' : 'text-accent-teal'}`}>{sorenMuscles.length}</span>
                   </div>
                </div>
             </Card>
          </div>

          {/* Muscle Heatmap */}
          <div className="lg:col-span-2">
             <Card className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-bg-card to-bg-primary">
                <div className="absolute top-6 left-6">
                   <h2 className="font-black text-text-primary italic uppercase tracking-tighter text-xl">Muscle Saturation</h2>
                   <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Live Recovery Model</p>
                </div>
                
                <div className="w-full flex-1 flex items-center justify-center min-h-0 relative py-8 px-4">
                  <div className="h-full flex gap-4 md:gap-12 items-center justify-center">
                    <div className="h-full max-h-[380px] drop-shadow-2xl">
                      <AnatomyFront 
                        getColor={(m) => getRecoveryColor(m)} 
                        setHoveredMuscle={setHoveredMuscle} 
                        hoveredMuscle={hoveredMuscle}
                        onMuscleClick={(m) => setSelectedMuscle(m === selectedMuscle ? null : m)}
                        selectedMuscle={selectedMuscle}
                      />
                    </div>
                    <div className="h-full max-h-[380px] drop-shadow-2xl">
                      <AnatomyBack 
                        getColor={(m) => getRecoveryColor(m)} 
                        setHoveredMuscle={setHoveredMuscle} 
                        hoveredMuscle={hoveredMuscle}
                        onMuscleClick={(m) => setSelectedMuscle(m === selectedMuscle ? null : m)}
                        selectedMuscle={selectedMuscle}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 flex-wrap justify-center mb-8 px-6">
                   {[
                     { label: 'Fresh', color: '#10b981' },
                     { label: 'Recovering', color: '#fbbf24' },
                     { label: 'Sore', color: '#f97316' },
                     { label: 'Fatigued', color: '#ef4444' }
                   ].map((tier) => (
                     <div key={tier.label} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-primary border border-border-color shadow-sm">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tier.color, boxShadow: `0 0 8px ${tier.color}40` }} />
                        <span className="text-[10px] font-black uppercase text-text-secondary tracking-wider">{tier.label}</span>
                     </div>
                   ))}
                </div>
             </Card>
          </div>

          {/* Action / Recommendations Sidebar */}
          <div className="lg:col-span-1 space-y-4">
             <Card className="flex-1">
                <h3 className="font-black text-text-primary text-sm mb-4 flex items-center gap-2 italic uppercase">
                  <Activity size={18} className="text-accent-teal" /> AI Protocol
                </h3>
                
                <div className="space-y-4">
                   <AnimatePresence mode="wait">
                     {selectedMuscle ? (
                       <motion.div key={selectedMuscle} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                          <div className="p-3 bg-accent-teal/5 border border-accent-teal/20 rounded-2xl text-center">
                             <p className="text-[10px] font-black text-accent-teal uppercase mb-1">{MUSCLE_NAMES[selectedMuscle]}</p>
                             <p className="text-sm font-bold text-text-primary">
                               {muscleStats.find(m => m.id === selectedMuscle)?.progress}% Recovered
                             </p>
                             <p className="text-[10px] text-text-secondary mt-1">
                               {Math.round(muscleStats.find(m => m.id === selectedMuscle)?.hoursRemaining || 0)}h until full recovery
                             </p>
                          </div>

                          {/* AI Recovery Tips */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles size={12} className="text-accent-purple" />
                              <p className="text-xs font-bold text-text-secondary uppercase">AI Recovery Advice</p>
                            </div>
                            {aiLoading ? (
                              <div className="flex items-center gap-2 py-4">
                                <div className="w-4 h-4 border-2 border-accent-purple/30 border-t-accent-purple rounded-full animate-spin" />
                                <span className="text-[11px] text-text-secondary">Analyzing...</span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-text-secondary leading-relaxed bg-bg-primary p-3 rounded-xl border border-border-color">{aiRecoveryTip}</p>
                            )}
                          </div>

                          {/* Static recovery tips */}
                          <div className="space-y-3">
                             <p className="text-xs font-bold text-text-secondary uppercase">Recommended Stretching</p>
                             <div className="space-y-2">
                               {(RECOVERY_TIPS_MAP[selectedMuscle] || ['Deep tissue release', 'Dynamic range prep']).map((tip, i) => (
                                 <div key={i} className="p-3 bg-bg-primary rounded-xl border border-border-color flex items-center justify-between group cursor-pointer hover:border-accent-teal transition-colors">
                                    <span className="text-xs font-medium">{tip}</span>
                                    <ChevronRight size={14} className="text-text-secondary group-hover:text-accent-teal" />
                                 </div>
                               ))}
                             </div>
                          </div>
                       </motion.div>
                     ) : (
                       <div className="text-center py-8 opacity-30">
                          <AlertCircle size={32} className="mx-auto mb-3" />
                          <p className="text-[11px] font-bold">Select a muscle to view tailored recovery protocols</p>
                       </div>
                     )}
                   </AnimatePresence>

                   <div className="pt-4 border-t border-border-color space-y-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center flex-shrink-0">
                           <Clock className="text-orange-400" size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-orange-400 uppercase">Est. Full Recovery</p>
                           <p className="text-sm font-bold text-text-primary">
                             {sorenMuscles.length > 0
                               ? `${Math.round(Math.max(...sorenMuscles.map(m => m.hoursRemaining)))}h remaining`
                               : 'Fully recovered!'}
                           </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                           <Dumbbell className="text-accent-purple" size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-accent-purple uppercase">Next Session Suggestion</p>
                           <p className="text-sm font-bold text-text-primary">{nextSessionRec}</p>
                        </div>
                      </div>
                   </div>
                </div>
             </Card>

             {/* Recovery Nutrition Tips */}
             <Card className="p-4">
               <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2 mb-3">
                 <Apple size={14} className="text-green-400" /> Recovery Nutrition
               </h3>
               <div className="space-y-2">
                 <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-primary border border-border-color">
                   <Droplets size={14} className="text-blue-400 flex-shrink-0" />
                   <div>
                     <p className="text-[11px] font-bold text-text-primary">Hydration</p>
                     <p className="text-[9px] text-text-secondary">Aim for 3+ litres of water today</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-primary border border-border-color">
                   <Dumbbell size={14} className="text-red-400 flex-shrink-0" />
                   <div>
                     <p className="text-[11px] font-bold text-text-primary">Protein</p>
                     <p className="text-[9px] text-text-secondary">1.6-2.2g per kg bodyweight</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-3 p-2.5 rounded-xl bg-bg-primary border border-border-color">
                   <Moon size={14} className="text-indigo-400 flex-shrink-0" />
                   <div>
                     <p className="text-[11px] font-bold text-text-primary">Sleep</p>
                     <p className="text-[9px] text-text-secondary">7-9 hours for muscle repair</p>
                   </div>
                 </div>
               </div>
             </Card>
          </div>
        </div>

        {/* Muscle Recovery Detail Table */}
        <Card className="overflow-hidden">
          <h3 className="font-black text-text-primary text-sm mb-4 flex items-center gap-2 italic uppercase px-2 pt-2">
            <Brain size={18} className="text-accent-purple" /> Muscle Group Recovery Matrix
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-color">
                  <th className="text-left text-[10px] font-bold text-text-secondary uppercase tracking-wider p-3">Muscle Group</th>
                  <th className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-wider p-3">Recovery</th>
                  <th className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-wider p-3">Status</th>
                  <th className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-wider p-3">Time Left</th>
                  <th className="text-center text-[10px] font-bold text-text-secondary uppercase tracking-wider p-3">Last Worked</th>
                </tr>
              </thead>
              <tbody>
                {muscleStats.map(m => (
                  <tr key={m.id} className="border-b border-border-color hover:bg-bg-card-hover cursor-pointer transition-colors" onClick={() => setSelectedMuscle(m.id)}>
                    <td className="p-3">
                      <span className="text-xs font-bold text-text-primary">{m.name}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-1.5 bg-bg-card-hover rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${m.progress}%`,
                            backgroundColor: m.progress >= 90 ? '#10b981' : m.progress >= 70 ? '#fbbf24' : m.progress >= 40 ? '#f97316' : '#ef4444'
                          }} />
                        </div>
                        <span className="text-[10px] font-bold text-text-secondary w-8 text-right">{m.progress}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        m.progress >= 90 ? 'bg-green-500/10 text-green-400' :
                        m.progress >= 70 ? 'bg-yellow-500/10 text-yellow-400' :
                        m.progress >= 40 ? 'bg-orange-500/10 text-orange-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {m.progress >= 90 ? 'Ready' : m.progress >= 70 ? 'Recovering' : m.progress >= 40 ? 'Sore' : 'Fatigued'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-[11px] font-bold text-text-secondary">
                      {m.hoursRemaining > 0 ? `${Math.round(m.hoursRemaining)}h` : '—'}
                    </td>
                    <td className="p-3 text-center text-[11px] font-medium text-text-secondary">
                      {m.lastWorked}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
