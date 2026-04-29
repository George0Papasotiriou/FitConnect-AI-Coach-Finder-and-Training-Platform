import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { 
  Box, Play, Pause, RotateCcw, Square, ChevronRight, Monitor, Zap, 
  Timer, Dumbbell, User, Volume2, VolumeX, Clock, Flame, Award,
  Target, Wind, Music, CheckCircle, X, Brain
} from 'lucide-react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { toast } from 'sonner'

type Environment = 'neon' | 'zen' | 'void'
type AmbienceMode = 'intense' | 'calm' | 'silent'

interface ExerciseStation {
  id: string
  name: string
  icon: React.ReactNode
  reps: number
  sets: number
  currentSet: number
  formTip: string
  caloriesPerRep: number
  muscleGroup: string
}

const ENV_THEMES: Record<Environment, { 
  name: string; subtitle: string; gradient: string; accent: string; 
  bgFrom: string; bgTo: string; vibe: string; image: string
}> = {
  neon: { 
    name: 'Neon Powerhouse', subtitle: 'High intensity zone',
    gradient: 'from-purple-900/80 via-black/80 to-pink-900/60',
    accent: '#a855f7', bgFrom: '#1a0533', bgTo: '#0a0a0f',
    vibe: '⚡ Peaking',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop'
  },
  zen: { 
    name: 'Zen Sky-Garden', subtitle: 'Mindful movement space',
    gradient: 'from-emerald-900/80 via-black/80 to-teal-900/60',
    accent: '#10b981', bgFrom: '#0a1f1a', bgTo: '#0a0a0f',
    vibe: '🧘 Restful',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200&auto=format&fit=crop'
  },
  void: { 
    name: 'The Void Studio', subtitle: 'Zero-distraction focus',
    gradient: 'from-gray-900/90 via-black/95 to-slate-900/80',
    accent: '#64748b', bgFrom: '#0f0f14', bgTo: '#0a0a0f',
    vibe: '🎯 Focused',
    image: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1200&auto=format&fit=crop'
  },
}

const INITIAL_STATIONS: ExerciseStation[] = [
  { id: 'bench', name: 'Bench Press', icon: <Dumbbell size={20} />, reps: 0, sets: 4, currentSet: 0, formTip: 'Keep shoulder blades retracted. Touch chest at nipple line.', caloriesPerRep: 0.8, muscleGroup: 'Chest' },
  { id: 'squat', name: 'Squat Rack', icon: <Target size={20} />, reps: 0, sets: 4, currentSet: 0, formTip: 'Break at hips first. Keep knees tracking over toes.', caloriesPerRep: 1.2, muscleGroup: 'Legs' },
  { id: 'pullup', name: 'Pull-up Bar', icon: <Zap size={20} />, reps: 0, sets: 3, currentSet: 0, formTip: 'Pull elbows to hips. Chin above bar for full rep.', caloriesPerRep: 1.0, muscleGroup: 'Back' },
  { id: 'treadmill', name: 'Treadmill', icon: <Wind size={20} />, reps: 0, sets: 1, currentSet: 0, formTip: 'Maintain upright posture. Land midfoot.', caloriesPerRep: 2.0, muscleGroup: 'Cardio' },
  { id: 'yoga', name: 'Yoga Mat', icon: <Award size={20} />, reps: 0, sets: 3, currentSet: 0, formTip: 'Focus on breath. Hold each pose for 30s.', caloriesPerRep: 0.3, muscleGroup: 'Flexibility' },
  { id: 'freeweights', name: 'Free Weights', icon: <Flame size={20} />, reps: 0, sets: 4, currentSet: 0, formTip: 'Controlled eccentric phase. Full range of motion.', caloriesPerRep: 0.6, muscleGroup: 'Arms' },
]

const RADIO_STATIONS: Record<AmbienceMode, { name: string, icon: any, track: string, bpm: number }> = {
  intense: { name: 'Power FM', icon: Volume2, track: 'Phonk / Aggressive Bass', bpm: 156 },
  calm: { name: 'Flow Radio', icon: Music, track: 'Lo-Fi / Binaural Beats', bpm: 82 },
  silent: { name: 'Focus Freq', icon: VolumeX, track: 'White Noise / Ambience', bpm: 0 }
}

const MusicVisualizer = ({ bpm, color }: { bpm: number, color: string }) => {
  const bars = Array.from({ length: 42 })
  return (
    <div className="flex items-end gap-[2px] h-12 px-4 opacity-50">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            height: bpm > 0 ? [
              Math.random() * 40 + 10 + '%', 
              Math.random() * 80 + 20 + '%', 
              Math.random() * 40 + 10 + '%'
            ] : '10%'
          }}
          transition={{ 
            duration: bpm > 0 ? (60 / bpm) * (i % 2 ? 1 : 1.5) : 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}


const MOTIVATIONS = [
  "You're crushing it! Keep the tempo steady.",
  "That's it! Push through the burn, you've got this.",
  "Form looks great. Breathe on the concentric phase.",
  "Excellent pace. One rep at a time.",
  "Stay focused. You're building iron right now.",
  "Don't stop now! Your future self will thank you."
]

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function VirtualGym() {
  const [environment, setEnvironment] = useState<Environment>('neon')
  const [ambience, setAmbience] = useState<AmbienceMode>('intense')
  const [stations, setStations] = useState<ExerciseStation[]>(INITIAL_STATIONS)
  const [activeStation, setActiveStation] = useState<string | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [laps, setLaps] = useState<number[]>([])
  const [showSummary, setShowSummary] = useState(false)
  const [neuralFlow, setNeuralFlow] = useState(0)
  const [isFlowState, setIsFlowState] = useState(false)
  const [coachMessage, setCoachMessage] = useState("Ready to begin. Select a station.")
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const motivationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const env = ENV_THEMES[environment]
  const radio = RADIO_STATIONS[ambience]
  const selectedStation = stations.find(s => s.id === activeStation)

  // Contextual AI Coach Intelligence
  const updateCoachIntelligence = useCallback(() => {
    if (!sessionActive) return
    
    if (!activeStation) {
      // Analyze muscle groups already worked
      const workedGroups = new Set(stations.filter(s => s.reps > 0).map(s => s.muscleGroup))
      if (workedGroups.has('Chest') && !workedGroups.has('Back')) {
        setCoachMessage("Great chest pump! I suggest the Pull-up Bar to balance your antagonist muscles.")
      } else if (workedGroups.has('Legs') && workedGroups.size === 1) {
        setCoachMessage("Legs are primed. Move to a cardio station to keep the heart rate elevated.")
      } else {
        setCoachMessage("I recommend hitting a high-output station like Squats or Bench next.")
      }
    } else {
      setCoachMessage(MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)])
    }
  }, [sessionActive, activeStation, stations])

  // Timer & AI Live Coach logic
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1)
      }, 1000)
      
      motivationIntervalRef.current = setInterval(updateCoachIntelligence, 12000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (motivationIntervalRef.current) clearInterval(motivationIntervalRef.current)
    }
    return () => { 
      if (timerRef.current) clearInterval(timerRef.current)
      if (motivationIntervalRef.current) clearInterval(motivationIntervalRef.current)
    }
  }, [timerRunning, updateCoachIntelligence])


  const startSession = () => {
    setSessionActive(true)
    setTimerRunning(true)
    setElapsedTime(0)
    setLaps([])
    setStations(INITIAL_STATIONS)
    setShowSummary(false)
    setNeuralFlow(0)
    setIsFlowState(false)
    setCoachMessage("Great start! Head over to your first station.")
    toast.success('Session started! Choose your first station.')
  }

  const endSession = () => {
    setTimerRunning(false)
    setSessionActive(false)
    setActiveStation(null)
    setShowSummary(true)
  }

  const addRep = useCallback(() => {
    if (!activeStation) return
    setStations(prev => prev.map(s => {
      if (s.id !== activeStation) return s
      const newReps = s.reps + 1
      const hitSetTarget = newReps % 10 === 0
      
      setNeuralFlow(prev => {
        const next = Math.min(100, prev + 4)
        if (next === 100 && !isFlowState) {
          setIsFlowState(true)
          toast.success('NEURAL FLOW ACHIEVED! Sensory focus at 100%.', {
            icon: <Zap className="text-accent-teal" size={16} />
          })
          setCoachMessage("You're in the zone! Unstoppable momentum.")
        }
        return next
      })

      return { ...s, reps: newReps, currentSet: hitSetTarget ? s.currentSet + 1 : s.currentSet }
    }))
  }, [activeStation, isFlowState])

  const totalCalories = stations.reduce((acc, s) => acc + s.reps * s.caloriesPerRep, 0)
  const totalReps = stations.reduce((acc, s) => acc + s.reps, 0)
  const exercisesUsed = stations.filter(s => s.reps > 0).length

  return (
    <>
      <Helmet><title>Virtual Gym Studio — Insta Coach</title></Helmet>
      
      <div className="max-w-6xl mx-auto flex flex-col relative" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Immersive HUD Overlay if Flow State is active */}
        <AnimatePresence>
          {isFlowState && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none z-[100] border-[16px] border-accent-teal/10 shadow-[inset_0_0_150px_rgba(16,185,129,0.15)] flex items-center justify-center"
            >
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] scale-[5]">
                 <Zap size={200} />
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="mb-4 flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-2xl font-black text-text-primary flex items-center gap-3 tracking-tight">
              <div className="w-9 h-9 bg-gradient-to-br from-accent-purple to-purple-400 rounded-xl flex items-center justify-center shadow-lg">
                <Box size={18} className="text-white" />
              </div>
              Virtual Gym Studio
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">Immersive training environment for performance.</p>
          </div>
          <div className="flex items-center gap-2">
            {!sessionActive ? (
              <Button size="md" onClick={startSession} leftIcon={<Play size={16} />}>
                Start Session
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setTimerRunning(!timerRunning)} leftIcon={timerRunning ? <Pause size={14} /> : <Play size={14} />}>
                  {timerRunning ? 'Pause' : 'Resume'}
                </Button>
                <Button variant="danger" size="sm" onClick={endSession} leftIcon={<Square size={14} />}>
                  End Session
                </Button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
          {/* Main Viewport */}
          <div className="lg:col-span-3 relative overflow-hidden rounded-2xl border border-border-color shadow-2xl bg-black">
            {/* Environment Background Image */}
            <motion.div 
              key={environment}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute inset-0 bg-cover bg-center mix-blend-luminosity opacity-40"
              style={{ backgroundImage: `url('${env.image}')` }}
            />
            {/* Environment Gradient Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${env.gradient} transition-all duration-1000`} />
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${env.accent} 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
            
            {/* HUD Overlay */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 pointer-events-none">
              {/* Top HUD */}
              <div className="flex justify-between items-start pointer-events-auto">
                <div className="space-y-3">
                  <div className="px-4 py-2 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 inline-flex items-center gap-2 shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]" style={{ backgroundColor: env.accent, color: env.accent }} />
                    <span className="text-xs font-black uppercase tracking-widest text-white">{env.name}</span>
                  </div>
                  {sessionActive && (
                    <div className="flex gap-2">
                      <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/5 inline-flex items-center gap-2">
                        <Flame size={14} className="text-orange-400" />
                        <span className="text-xs font-bold text-orange-400 tabular-nums">{totalCalories.toFixed(0)} kcal</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="text-right flex flex-col items-end">
                  <div className="px-5 py-3 bg-black/50 backdrop-blur-xl rounded-3xl border border-white/10 shadow-xl mb-2">
                    <p className={`text-4xl font-black text-white tabular-nums tracking-tighter ${timerRunning ? 'opacity-100' : 'opacity-50'}`}>
                      {formatTime(elapsedTime)}
                    </p>
                  </div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest bg-black/40 px-3 py-1 rounded-full border border-white/5">
                    {sessionActive ? `${exercisesUsed} stations visited` : 'Session Idle'}
                  </p>
                </div>
              </div>

              {/* AI Live Coach Ticker */}
              {sessionActive && (
                <div className="absolute top-[4.5rem] left-6 pointer-events-auto max-w-sm">
                  <motion.div 
                    key={coachMessage}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-gradient-to-r from-accent-teal/20 to-transparent border-l-2 border-accent-teal backdrop-blur-sm rounded-r-xl"
                  >
                    <p className="text-[10px] font-black text-accent-teal uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Brain size={12} /> AI Live Coach
                    </p>
                    <p className="text-xs text-white font-medium leading-relaxed italic">
                      "{coachMessage}"
                    </p>
                  </motion.div>
                </div>
              )}

              {/* Bottom HUD */}
              <div className="flex items-end justify-between w-full pb-2">
                {/* Active Station Info */}
                <div className="flex-1 pointer-events-auto">
                  {selectedStation ? (
                    <motion.div
                      key={selectedStation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-end gap-8"
                    >
                      {/* Left side: Station Details */}
                      <div className="space-y-4 max-w-sm">
                        <div>
                          <h2 className="text-3xl font-black text-white uppercase tracking-tight leading-none drop-shadow-md">
                            {selectedStation.name}
                          </h2>
                          <p className="text-sm text-accent-teal font-black uppercase tracking-widest mt-1">{selectedStation.muscleGroup}</p>
                        </div>
                        
                        <div className="p-3 bg-black/60 backdrop-blur-xl rounded-xl border border-white/10 shadow-lg">
                          <p className="text-xs text-white/80 font-medium leading-relaxed">
                            💡 {selectedStation.formTip}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="lg" onClick={addRep} className="shadow-xl px-8" leftIcon={<Zap size={18} />}>
                            Log Rep
                          </Button>
                          <Button size="md" variant="ghost" className="bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-lg"
                            onClick={() => { setLaps(l => [...l, elapsedTime]); toast.success('Lap recorded!') }}>
                            Lap
                          </Button>
                        </div>
                      </div>

                      {/* Right side element representing big REP COUNTER */}
                      <div className="flex-1 flex justify-center mb-4">
                        <motion.div 
                          key={selectedStation.reps}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center bg-black/40 backdrop-blur-lg px-8 py-4 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                        >
                          <span className="text-[72px] font-black text-white tabular-nums leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                            {selectedStation.reps}
                          </span>
                          <span className="text-sm font-black text-white/50 uppercase tracking-widest mt-1">Total Reps</span>
                        </motion.div>
                      </div>

                    </motion.div>
                  ) : (
                    <div className="space-y-4 max-w-md">
                      <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none drop-shadow-lg">
                        {sessionActive ? 'Select a Station' : env.name}
                      </h2>
                      <p className="text-base text-white/60 font-medium">
                        {sessionActive ? 'Choose an exercise station from the sidebar to begin logging reps.' : env.subtitle}
                      </p>
                      {!sessionActive && (
                        <Button size="lg" onClick={startSession} className="shadow-xl shadow-accent-purple/20 px-8" leftIcon={<Play size={18} />}>Begin Workout</Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Participant Avatars & Radio Station */}
                {/* Participant Avatars & Radio Station */}
                <div className="flex flex-col items-end gap-3 pointer-events-auto ml-4">
                  
                  {/* Neural Flow Visualization */}
                  {sessionActive && selectedStation && (
                    <div className="p-3 bg-black/50 backdrop-blur-3xl rounded-[28px] border border-white/10 w-52 mb-2 shadow-2xl relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-accent-teal/5 to-transparent pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                            <Brain size={12} className={isFlowState ? 'text-accent-teal' : 'text-white/40'} /> Neural Flow
                          </span>
                          <span className={`text-xs font-black ${isFlowState ? 'text-accent-teal' : 'text-emerald-400'} tabular-nums`}>{Math.round(neuralFlow)}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden shadow-inner p-[1px]">
                          <motion.div 
                            animate={{ width: `${neuralFlow}%` }}
                            className={`h-full transition-all duration-300 rounded-full ${isFlowState ? 'bg-accent-teal shadow-[0_0_15px_rgba(16,184,166,1)]' : 'bg-emerald-400/80'}`}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-black/60 backdrop-blur-3xl rounded-[32px] border border-white/10 text-center shadow-2xl">
                    <p className="text-[9px] font-black text-white/40 uppercase mb-3 tracking-widest leading-none">Trainee Presence</p>
                    <div className="flex -space-x-3 justify-center drop-shadow-2xl">
                      {[1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
                          className="w-9 h-9 rounded-full border-2 border-black flex items-center justify-center overflow-hidden shadow-xl"
                        >
                          <img src={`https://i.pravatar.cc/100?u=${i+10}`} alt="participant" className="w-full h-full object-cover" />
                        </motion.div>
                      ))}
                      <div className="w-9 h-9 rounded-full border-2 border-black bg-white/10 backdrop-blur-md flex items-center justify-center text-[10px] font-black text-white shadow-xl italic">
                        +12
                      </div>
                    </div>
                  </div>
                  
                  {/* Premium Multi-Mode Command Bridge for Audio */}
                  <div className="p-2 bg-black/60 backdrop-blur-3xl rounded-[35px] border border-white/10 shadow-3xl flex flex-col items-center gap-2">
                    <div className="flex items-center p-1">
                      {(Object.keys(RADIO_STATIONS) as AmbienceMode[]).map(mode => {
                        const isActive = ambience === mode;
                        const Icon = RADIO_STATIONS[mode].icon;
                        return (
                          <button
                            key={mode}
                            onClick={() => setAmbience(mode)}
                            className={`relative px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all overflow-hidden ${
                              isActive ? 'text-white' : 'text-white/30 hover:text-white/80'
                            }`}
                          >
                            {isActive && (
                              <motion.div layoutId="radio-bg" className="absolute inset-0 bg-white/10 rounded-2xl" />
                            )}
                            <div className="relative z-10 flex flex-col items-center gap-1.5 ">
                              <Icon size={16} className={isActive ? 'text-accent-teal drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]' : ''} />
                              {mode}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <MusicVisualizer bpm={radio.bpm} color={env.accent} />
                  </div>

                  {/* Contextual Track Info */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-black/50 backdrop-blur-xl rounded-full border border-white/10 shadow-lg">
                    <div className="flex gap-1 items-center">
                      {[1, 2, 3].map(i => (
                        <motion.div key={i} animate={{ height: [4, 10, 4] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }} className="w-[1.5px] bg-accent-teal" />
                      ))}
                    </div>
                    <span className="text-[9px] font-black text-white/80 uppercase tracking-[0.25em]">
                      Live <span className="text-white/40">::</span> {radio.track}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Inner shadow for depth */}
            <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.9)]" />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 overflow-y-auto scrollbar-thin pr-1">
            {/* Environment Selector */}
            <Card className="!p-4">
              <h3 className="font-black text-text-primary text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Monitor size={14} className="text-accent-teal" /> Environment
              </h3>
              <div className="space-y-2">
                {(Object.keys(ENV_THEMES) as Environment[]).map(key => {
                  const e = ENV_THEMES[key]
                  const isActive = environment === key
                  return (
                    <button
                      key={key}
                      onClick={() => setEnvironment(key)}
                      className={`w-full p-3 rounded-xl border transition-all text-left ${
                        isActive 
                          ? 'bg-accent-teal/5 border-accent-teal/40 shadow-sm' 
                          : 'bg-bg-primary border-border-color hover:border-text-secondary'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <p className={`text-xs font-black ${isActive ? 'text-accent-teal' : 'text-text-primary'}`}>{e.name}</p>
                        <ChevronRight size={12} className={isActive ? 'text-accent-teal' : 'text-text-secondary'} />
                      </div>
                      <p className="text-[9px] font-bold text-text-secondary mt-0.5">{e.vibe}</p>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Exercise Stations */}
            <Card className="!p-4">
              <h3 className="font-black text-text-primary text-[11px] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Dumbbell size={14} className="text-accent-purple" /> Stations
              </h3>
              <div className="space-y-1.5">
                {stations.map(station => {
                  const isActive = activeStation === station.id
                  return (
                    <button
                      key={station.id}
                      onClick={() => { if (sessionActive) setActiveStation(station.id) }}
                      disabled={!sessionActive}
                      className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-center gap-2.5 ${
                        isActive
                          ? 'bg-accent-purple/10 border-accent-purple/40'
                          : sessionActive
                            ? 'bg-bg-primary border-border-color hover:border-accent-purple/20 cursor-pointer'
                            : 'bg-bg-primary/50 border-border-color/50 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-accent-purple/20 text-accent-purple' : 'bg-bg-card-hover text-text-secondary'
                      }`}>
                        {station.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-bold truncate ${isActive ? 'text-accent-purple' : 'text-text-primary'}`}>
                          {station.name}
                        </p>
                        <p className="text-[9px] text-text-secondary">{station.muscleGroup}</p>
                      </div>
                      {station.reps > 0 && (
                        <span className="text-[10px] font-black text-accent-teal bg-accent-teal/10 px-1.5 py-0.5 rounded-md">{station.reps}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Laps */}
            {laps.length > 0 && (
              <Card className="!p-4">
                <h3 className="font-black text-text-primary text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Clock size={14} className="text-orange-400" /> Laps
                </h3>
                <div className="space-y-1">
                  {laps.map((lap, i) => (
                    <div key={i} className="flex justify-between text-[10px] px-2 py-1 bg-bg-primary rounded-lg">
                      <span className="font-bold text-text-secondary">Lap {i + 1}</span>
                      <span className="font-black text-text-primary tabular-nums">{formatTime(lap)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Performance Tip */}
            <div className="p-3 bg-orange-400/5 border border-orange-400/20 rounded-xl flex items-start gap-2.5">
              <Zap size={14} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-orange-400 font-medium leading-normal italic">
                Performance Boost: Compound movements burn up to 3× more calories than isolation exercises.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-md"
              onClick={() => setShowSummary(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 bg-bg-card border border-border-color rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <button onClick={() => setShowSummary(false)} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
              
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                  className="w-16 h-16 bg-gradient-to-br from-accent-teal to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent-teal/30"
                >
                  <CheckCircle size={32} className="text-white" />
                </motion.div>
                <h2 className="text-2xl font-black text-text-primary">Session Complete! 🎉</h2>
                <p className="text-text-secondary text-sm mt-1">Here's your workout summary</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-bg-primary rounded-xl border border-border-color">
                  <Timer size={18} className="text-accent-purple mx-auto mb-1" />
                  <p className="text-lg font-black text-text-primary tabular-nums">{formatTime(elapsedTime)}</p>
                  <p className="text-[9px] text-text-secondary uppercase font-bold">Duration</p>
                </div>
                <div className="text-center p-3 bg-bg-primary rounded-xl border border-border-color">
                  <Flame size={18} className="text-orange-400 mx-auto mb-1" />
                  <p className="text-lg font-black text-text-primary">{totalCalories.toFixed(0)}</p>
                  <p className="text-[9px] text-text-secondary uppercase font-bold">Calories</p>
                </div>
                <div className="text-center p-3 bg-bg-primary rounded-xl border border-border-color">
                  <Dumbbell size={18} className="text-accent-teal mx-auto mb-1" />
                  <p className="text-lg font-black text-text-primary">{totalReps}</p>
                  <p className="text-[9px] text-text-secondary uppercase font-bold">Total Reps</p>
                </div>
              </div>

              {/* Per-station breakdown */}
              <div className="space-y-2 mb-6">
                <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Station Breakdown</h4>
                {stations.filter(s => s.reps > 0).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 bg-bg-primary rounded-xl border border-border-color">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                        {s.icon}
                      </div>
                      <span className="text-xs font-bold text-text-primary">{s.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-accent-teal">{s.reps} reps</span>
                      <span className="text-[9px] text-text-secondary ml-2">{(s.reps * s.caloriesPerRep).toFixed(0)} cal</span>
                    </div>
                  </div>
                ))}
                {stations.filter(s => s.reps > 0).length === 0 && (
                  <p className="text-xs text-text-secondary text-center py-4 opacity-60">No exercises logged this session</p>
                )}
              </div>

              <Button fullWidth size="lg" onClick={() => setShowSummary(false)}>
                Done
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
