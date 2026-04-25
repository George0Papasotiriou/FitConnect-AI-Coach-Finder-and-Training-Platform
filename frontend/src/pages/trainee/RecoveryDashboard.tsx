import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Heart, Zap, Clock, Activity, AlertCircle, Dumbbell, ChevronRight } from 'lucide-react'
import Card from '../../components/common/Card'
import { useStrengthStore } from '../../store/strengthStore'

type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core'

const MUSCLE_PATHS: Record<MuscleGroup, string> = {
  chest: "M 45 42 Q 50 40 55 42 Q 55 52 50 55 Q 45 52 45 42",
  back: "M 45 40 Q 50 38 55 40 Q 60 45 58 60 Q 50 65 42 60 Q 40 45 45 40",
  shoulders: "M 40 40 Q 35 45 40 50 M 60 40 Q 65 45 60 50",
  legs: "M 42 65 Q 40 85 45 100 M 58 65 Q 60 85 55 100",
  arms: "M 38 45 Q 30 60 35 70 M 62 45 Q 70 60 65 70",
  core: "M 48 55 Q 50 54 52 55 Q 54 65 50 68 Q 46 65 48 55",
}

const MUSCLE_NAMES: Record<MuscleGroup, string> = {
  chest: 'Chest / Pectorals',
  back: 'Back / Lats & Traps',
  shoulders: 'Shoulders / Delts',
  legs: 'Legs / Quads & Glutes',
  arms: 'Arms / Biceps & Triceps',
  core: 'Core / Abs & Obliques'
}

export default function RecoveryDashboard() {
  const { getRecoveryProgress, fatigue } = useStrengthStore()
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null)

  const muscleStats = useMemo(() => {
    return (Object.keys(MUSCLE_PATHS) as MuscleGroup[]).map(m => ({
      id: m,
      name: MUSCLE_NAMES[m],
      progress: getRecoveryProgress(m),
      fatigueObj: fatigue[m]
    }))
  }, [getRecoveryProgress, fatigue])

  const overallRecovery = useMemo(() => {
     const sum = muscleStats.reduce((acc, m) => acc + m.progress, 0)
     return Math.round(sum / muscleStats.length)
  }, [muscleStats])

  const getHeatColor = (progress: number) => {
    if (progress >= 90) return 'fill-accent-teal/60'
    if (progress >= 60) return 'fill-yellow-400/60'
    if (progress >= 30) return 'fill-orange-400/60'
    return 'fill-red-500/60'
  }

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
                  {overallRecovery > 80 ? 'You are peaked! Perfect day for a heavy PR session.' : 'Moderate fatigue detected. Consider a hypertrophy or zone 2 session.'}
                </p>
             </Card>

             <Card className="p-4 space-y-4">
                <h3 className="text-xs font-black text-text-secondary uppercase tracking-widest flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" /> Bio-Markers
                </h3>
                <div className="space-y-3">
                   <div className="flex justify-between items-center bg-bg-primary p-3 rounded-xl border border-border-color">
                      <span className="text-xs font-medium text-text-secondary">CNS Fatigue</span>
                      <span className="text-xs font-black text-accent-teal">Low</span>
                   </div>
                   <div className="flex justify-between items-center bg-bg-primary p-3 rounded-xl border border-border-color">
                      <span className="text-xs font-medium text-text-secondary">HRV Score</span>
                      <span className="text-xs font-black text-text-primary">78 ms</span>
                   </div>
                   <div className="flex justify-between items-center bg-bg-primary p-3 rounded-xl border border-border-color">
                      <span className="text-xs font-medium text-text-secondary">Sleep Quality</span>
                      <span className="text-xs font-black text-purple-400">Restorative</span>
                   </div>
                </div>
             </Card>
          </div>

          {/* Muscle Heatmap */}
          <div className="lg:col-span-2">
             <Card className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-bg-card to-bg-primary">
                <div className="absolute top-6 left-6">
                   <h2 className="font-black text-text-primary italic uppercase tracking-tighter text-xl">Muscle Saturation</h2>
                   <p className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Estimated Recovery Model</p>
                </div>
                
                <div className="w-full max-w-sm aspect-[5/6] relative z-10 py-12">
                   <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-2xl">
                    <path d="M 50 15 C 45 15 42 20 42 25 C 42 30 45 35 50 35 C 55 35 58 30 58 25 C 58 20 55 15 50 15 M 40 40 L 60 40 L 65 70 L 55 100 L 45 100 L 35 70 Z" 
                      className="fill-bg-card-hover" />
                    
                    {muscleStats.map(m => (
                      <motion.path
                        key={m.id}
                        d={MUSCLE_PATHS[m.id]}
                        whileHover={{ scale: 1.05 }}
                        className={`${getHeatColor(m.progress)} transition-colors duration-700 stroke-bg-primary stroke-[0.5] cursor-pointer`}
                        onClick={() => setSelectedMuscle(m.id)}
                      />
                    ))}
                   </svg>
                </div>

                <div className="flex gap-2 mb-8">
                   {['Recovered', 'Recovering', 'Fatigued'].map((label, idx) => (
                     <div key={label} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-bg-primary border border-border-color shadow-sm">
                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-accent-teal' : idx === 1 ? 'bg-yellow-400' : 'bg-red-500'}`} />
                        <span className="text-[9px] font-black uppercase text-text-secondary">{label}</span>
                     </div>
                   ))}
                </div>
             </Card>
          </div>

          {/* Action / Recommendations Sidebar */}
          <div className="lg:col-span-1 space-y-6">
             <Card className="h-full">
                <h3 className="font-black text-text-primary text-sm mb-6 flex items-center gap-2 italic uppercase">
                  <Activity size={18} className="text-accent-teal" /> AI Protocol
                </h3>
                
                <div className="space-y-6">
                   {selectedMuscle ? (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <div className="p-3 bg-accent-teal/5 border border-accent-teal/20 rounded-2xl text-center">
                           <p className="text-[10px] font-black text-accent-teal uppercase mb-1">{MUSCLE_NAMES[selectedMuscle]}</p>
                           <p className="text-sm font-bold text-text-primary">Status: {fatigue[selectedMuscle] ? `${getRecoveryProgress(selectedMuscle)}% Recovered` : 'Fresh'}</p>
                        </div>
                        <div className="space-y-3">
                           <p className="text-xs font-bold text-text-secondary uppercase">Recommended Stretching</p>
                           <div className="space-y-2">
                             <div className="p-3 bg-bg-primary rounded-xl border border-border-color flex items-center justify-between group cursor-pointer hover:border-accent-teal transition-colors">
                                <span className="text-xs font-medium">Deep Tissue Release</span>
                                <ChevronRight size={14} className="text-text-secondary group-hover:text-accent-teal" />
                             </div>
                             <div className="p-3 bg-bg-primary rounded-xl border border-border-color flex items-center justify-between group cursor-pointer hover:border-accent-teal transition-colors">
                                <span className="text-xs font-medium">Dynamic Range Prep</span>
                                <ChevronRight size={14} className="text-text-secondary group-hover:text-accent-teal" />
                             </div>
                           </div>
                        </div>
                     </motion.div>
                   ) : (
                     <div className="text-center py-12 opacity-30">
                        <AlertCircle size={32} className="mx-auto mb-3" />
                        <p className="text-[11px] font-bold">Select a muscle to view tailored recovery protocols</p>
                     </div>
                   )}

                   <div className="pt-6 border-t border-border-color space-y-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center flex-shrink-0">
                           <Clock className="text-orange-400" size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-orange-400 uppercase">Est. Rest Remaining</p>
                           <p className="text-sm font-bold text-text-primary">14h 22m</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                           <Dumbbell className="text-accent-purple" size={20} />
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-accent-purple uppercase">Next Session Suggestion</p>
                           <p className="text-sm font-bold text-text-primary">Active Mobility</p>
                        </div>
                      </div>
                   </div>
                </div>
             </Card>
          </div>
        </div>
      </div>
    </>
  )
}
