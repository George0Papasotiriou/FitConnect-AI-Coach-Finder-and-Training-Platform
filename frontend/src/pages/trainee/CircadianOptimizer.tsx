import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Sun, Moon, Zap, Clock, Activity, Sparkles, Brain, Info, Coffee, Utensils, Copy, Check, ChevronDown, Trophy } from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { toast } from 'sonner'

type Chronotype = 'early' | 'balanced' | 'night'

const CHRONO_SHIFT: Record<Chronotype, number> = { early: -1.5, balanced: 0, night: 1.5 }
const CHRONO_LABELS: Record<Chronotype, { label: string; emoji: string; desc: string }> = {
  early: { label: 'Early Bird', emoji: '🐦', desc: 'Natural morning riser, peaks early afternoon' },
  balanced: { label: 'Balanced', emoji: '⚖️', desc: 'Standard rhythm, peaks late afternoon' },
  night: { label: 'Night Owl', emoji: '🦉', desc: 'Later riser, peaks in the evening' },
}

function formatHourMin(decimalHours: number): string {
  const h = ((Math.floor(decimalHours) % 24) + 24) % 24
  const m = Math.round((decimalHours - Math.floor(decimalHours)) * 60) % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export default function CircadianOptimizer() {
  const [wakeHour, setWakeHour] = useState(7) // 7 AM default
  const [sleepDuration, setSleepDuration] = useState(8) // hours
  const [chronotype, setChronotype] = useState<Chronotype>('balanced')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [copied, setCopied] = useState(false)

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  const shift = CHRONO_SHIFT[chronotype]

  // Core calculations based on wake time + chronotype
  const calculations = useMemo(() => {
    const wake = wakeHour + shift
    const sleep = wake + (24 - sleepDuration)
    
    // Metabolic peak: 9-12 hours after waking
    const peakStart = wake + 9
    const peakEnd = wake + 12.5
    
    // Cortisol spike: 30-60 min after waking
    const cortisolStart = wake
    const cortisolEnd = wake + 1.5
    
    // Adrenal recovery: 2 hours before sleep
    const recoveryStart = sleep - 2
    
    // Meal timing
    const breakfast = wake + 1 // 1 hour after waking
    const preWorkout = peakStart - 1.5 // 1.5h before peak
    const postWorkout = peakEnd + 0.5 // 30min after peak
    const lastMeal = sleep - 3 // 3h before sleep

    return {
      peakStart, peakEnd, cortisolStart, cortisolEnd,
      recoveryStart, sleep, breakfast, preWorkout, postWorkout, lastMeal
    }
  }, [wakeHour, sleepDuration, shift])

  // Generate 24 data points for the metabolic curve
  const dataPoints = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = (wakeHour + i) % 24
      const hoursFromWake = i
      // Metabolic curve: low in morning, peak 9-12h after wake, drops before sleep
      const baseCurve = Math.sin((hoursFromWake - 3) * Math.PI / 12) * 40 + 50
      // Chronotype adjustment
      const chronoAdjust = chronotype === 'early' ? (hoursFromWake < 10 ? 8 : -5) : 
                           chronotype === 'night' ? (hoursFromWake > 10 ? 8 : -5) : 0
      const metabolicRate = Math.max(5, Math.min(95, baseCurve + chronoAdjust + (Math.sin(hoursFromWake * 0.5) * 5)))
      
      const isPeak = hoursFromWake >= 9 && hoursFromWake <= 12.5
      const isCortisol = hoursFromWake <= 1.5
      const isSleep = hoursFromWake >= (24 - sleepDuration)
      
      return { hour, metabolicRate, isPeak, isCortisol, isSleep, hoursFromWake }
    })
  }, [wakeHour, sleepDuration, chronotype, shift])

  // Current time position on chart
  const currentHourDecimal = currentTime.getHours() + currentTime.getMinutes() / 60
  const currentIndexApprox = useMemo(() => {
    const hoursFromWake = ((currentHourDecimal - wakeHour) % 24 + 24) % 24
    return (hoursFromWake / 24) * 100
  }, [currentHourDecimal, wakeHour])

  // AI Insights that update based on inputs
  const insights = useMemo(() => {
    const items = []
    
    items.push({
      icon: <Clock size={14} className="text-accent-teal" />,
      title: 'PRIME HYPERTROPHY',
      color: 'text-accent-teal',
      text: `Your protein synthesis markers peak between ${formatHourMin(calculations.peakStart)} and ${formatHourMin(calculations.peakEnd)}. Save heavy compound lifts for this window.`
    })
    
    items.push({
      icon: <Info size={14} className="text-orange-400" />,
      title: 'CORTISOL WINDOW',
      color: 'text-orange-400',
      text: chronotype === 'early'
        ? `Morning cortisol spikes early at ${formatHourMin(calculations.cortisolStart)}. Use this energy for light cardio, but avoid heavy CNS loading.`
        : `Cortisol peaks around ${formatHourMin(calculations.cortisolEnd)}. ${chronotype === 'night' ? 'Night owls benefit from delaying intense exercise.' : 'Moderate activity is okay after the spike fades.'}`
    })
    
    items.push({
      icon: <Coffee size={14} className="text-amber-400" />,
      title: 'CAFFEINE CUTOFF',
      color: 'text-amber-400',
      text: `Stop caffeine by ${formatHourMin(calculations.recoveryStart - 4)} (6h before sleep onset at ${formatHourMin(calculations.sleep)}) for optimal CNS recovery.`
    })

    return items
  }, [calculations, chronotype])

  const copySchedule = () => {
    const schedule = `🏋️ My Optimized Training Schedule

⏰ Wake: ${formatHourMin(wakeHour + shift)}
🧬 Chronotype: ${CHRONO_LABELS[chronotype].label}

🔥 Peak Training Window: ${formatHourMin(calculations.peakStart)} — ${formatHourMin(calculations.peakEnd)}
🍳 Breakfast: ${formatHourMin(calculations.breakfast)}
🥤 Pre-Workout Meal: ${formatHourMin(calculations.preWorkout)}
🥗 Post-Workout Meal: ${formatHourMin(calculations.postWorkout)}
🍽️ Last Meal: ${formatHourMin(calculations.lastMeal)}
☕ Caffeine Cutoff: ${formatHourMin(calculations.recoveryStart - 4)}
😴 Adrenal Recovery: ${formatHourMin(calculations.recoveryStart)}
💤 Sleep: ${formatHourMin(calculations.sleep)}

Generated by Insta Coach — Body Rhythm AI`

    navigator.clipboard.writeText(schedule)
    setCopied(true)
    toast.success('Schedule copied to clipboard!')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <>
      <Helmet><title>Body Rhythm — Insta Coach</title></Helmet>
      
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-border-color/10">
          <div>
            <h1 className="text-4xl font-black text-text-primary flex items-center gap-4 italic tracking-tight">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-400/30">
                <Sun size={24} className="text-white" />
              </div>
              Body Rhythm
            </h1>
            <p className="text-text-secondary mt-2 font-medium">Metabolic intensity & training window optimization.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-accent-teal/10 border border-accent-teal/20 rounded-full flex items-center gap-2">
              <Sparkles size={14} className="text-accent-teal animate-pulse" />
              <span className="text-[10px] font-black text-accent-teal uppercase tracking-widest">AI Sync Active</span>
            </div>
            <Button size="sm" variant="ghost" className="bg-bg-card hover:bg-bg-card-hover border border-border-color" onClick={copySchedule} leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}>
              {copied ? 'Copied!' : 'Copy Schedule'}
            </Button>
          </div>
        </header>

        {/* Dynamic Status Card */}
        {(() => {
          const hoursFromWake = ((currentHourDecimal - (wakeHour + shift)) % 24 + 24) % 24
          let statusLabel = 'Analyzing...'
          let statusDesc = 'Calculating your current metabolic state.'
          let StatusIcon = Activity
          let statusColor = 'text-accent-teal'

          if (hoursFromWake < 1.5) {
            statusLabel = 'Cortisol Spike'
            statusDesc = 'Natural morning energy rising. Best for light movement or planning.'
            StatusIcon = Zap
            statusColor = 'text-orange-400'
          } else if (hoursFromWake >= 9 && hoursFromWake <= 12.5) {
            statusLabel = 'Peak Intensity'
            statusDesc = 'Maximum strength and performance. Enter the gym now.'
            StatusIcon = Trophy
            statusColor = 'text-accent-teal'
          } else if (hoursFromWake >= (24 - sleepDuration - 2) && hoursFromWake < (24 - sleepDuration)) {
            statusLabel = 'Winding Down'
            statusDesc = 'Preparing for adrenal recovery. Phase out caffeine and screens.'
            StatusIcon = Moon
            statusColor = 'text-accent-purple'
          } else if (hoursFromWake >= (24 - sleepDuration)) {
            statusLabel = 'Deep Recovery'
            statusDesc = 'System reset. Growth hormone and tissue repair active.'
            StatusIcon = Brain
            statusColor = 'text-indigo-400'
          } else {
            statusLabel = 'Standard Metabolic Activity'
            statusDesc = 'Maintain hydration and consistent nutrient flow.'
            StatusIcon = Activity
            statusColor = 'text-text-secondary'
          }

          return (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-bg-card to-bg-card-hover border border-border-color rounded-2xl p-5 flex items-center gap-6 shadow-sm"
            >
              <div className={`p-4 rounded-xl bg-bg-primary border border-border-color/10 flex-shrink-0 ${statusColor} shadow-inner`}>
                <StatusIcon size={32} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${statusColor}`}>{statusLabel}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${statusColor} animate-pulse`} />
                </div>
                <h3 className="text-xl font-black text-text-primary uppercase italic">{statusDesc}</h3>
              </div>
              <div className="hidden md:block text-right">
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block mb-1">Current Focus</span>
                <span className="text-sm font-black text-text-primary px-3 py-1 bg-bg-primary rounded-lg border border-border-color">
                  {hoursFromWake >= 9 && hoursFromWake <= 12.5 ? 'HYPERTROPHY' : hoursFromWake < 8 ? 'COGNITIVE' : 'RECOVERY'}
                </span>
              </div>
            </motion.div>
          )
        })()}

        {/* Controls Row - More handles/compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Wake Time */}
          <Card className="!p-4 bg-bg-card/50 hover:bg-bg-card transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Wake-Up Time</label>
              <Sun size={14} className="text-orange-400 opacity-50" />
            </div>
            <select
              value={wakeHour}
              onChange={e => setWakeHour(Number(e.target.value))}
              className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm font-bold text-text-primary outline-none focus:ring-2 focus:ring-accent-purple/20 transition-all cursor-pointer"
            >
              {Array.from({ length: 14 }, (_, i) => i + 4).map(h => (
                <option key={h} value={h}>{formatHourMin(h)}</option>
              ))}
            </select>
          </Card>

          {/* Sleep Duration */}
          <Card className="!p-4 bg-bg-card/50 hover:bg-bg-card transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Sleep Target</label>
              <Moon size={14} className="text-accent-purple opacity-50" />
            </div>
            <div className="flex-1">
              <input
                type="range" min="5" max="10" step="0.5" value={sleepDuration}
                onChange={e => setSleepDuration(Number(e.target.value))}
                className="w-full h-1.5 bg-bg-primary rounded-lg appearance-none cursor-pointer accent-accent-purple"
              />
              <div className="flex justify-between text-[10px] text-text-secondary font-black mt-2">
                <span>5H</span>
                <span className="text-accent-purple bg-accent-purple/10 px-1.5 rounded">{sleepDuration}H</span>
                <span>10H</span>
              </div>
            </div>
          </Card>

          {/* Chronotype */}
          <Card className="!p-4 bg-bg-card/50 hover:bg-bg-card transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Chronotype</label>
              <Zap size={14} className="text-accent-teal opacity-50" />
            </div>
            <div className="flex gap-2">
              {(Object.keys(CHRONO_LABELS) as Chronotype[]).map(type => (
                <button
                  key={type}
                  onClick={() => setChronotype(type)}
                  className={`flex-1 py-1.5 px-1 rounded-xl text-[9px] font-black transition-all border uppercase tracking-tighter ${
                    chronotype === type
                      ? 'bg-accent-teal text-white border-accent-teal shadow-lg shadow-accent-teal/20' 
                      : 'bg-bg-primary border-border-color text-text-secondary hover:border-accent-teal/40'
                  }`}
                  title={CHRONO_LABELS[type].desc}
                >
                  <div className="text-base">{CHRONO_LABELS[type].emoji}</div>
                  <div className="mt-0.5">{CHRONO_LABELS[type].label.split(' ')[0]}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>


        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="h-[380px] flex flex-col pt-12 relative overflow-hidden">
              <div className="absolute top-4 left-6 flex items-center gap-2">
                <Activity size={16} className="text-accent-purple" />
                <h2 className="font-black text-text-primary uppercase text-xs">Metabolic Intensity Curve</h2>
              </div>

              {/* Legend */}
              <div className="absolute top-4 right-6 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent-teal" />
                  <span className="text-[9px] font-bold text-text-secondary">Peak Zone</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-[9px] font-bold text-text-secondary">Cortisol</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent-purple/50" />
                  <span className="text-[9px] font-bold text-text-secondary">Sleep</span>
                </div>
              </div>

              <div className="flex-1 flex items-end justify-between gap-[2px] px-6 pb-10 relative">
                {/* Current Time Marker */}
                {currentIndexApprox >= 0 && currentIndexApprox <= 100 && (
                  <div 
                    className="absolute bottom-0 top-0 z-20 pointer-events-none"
                    style={{ left: `calc(${currentIndexApprox}% + 24px)` }}
                  >
                    <div className="h-full w-[2px] bg-red-400/60 relative">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-red-400 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md whitespace-nowrap">
                        NOW
                      </div>
                    </div>
                  </div>
                )}

                {dataPoints.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group relative">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${d.metabolicRate}%` }}
                      transition={{ delay: i * 0.02, duration: 0.8 }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        d.isPeak 
                          ? 'bg-gradient-to-t from-accent-teal to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]' 
                          : d.isCortisol
                            ? 'bg-gradient-to-t from-orange-400 to-amber-500 shadow-[0_0_10px_rgba(251,146,60,0.3)]'
                            : d.isSleep 
                              ? 'bg-accent-purple/40 dark:bg-accent-purple/20'
                              : 'bg-slate-300 dark:bg-bg-card-hover'
                      }`}
                    />
                    {i % 4 === 0 && (
                      <span className="absolute -bottom-7 text-[9px] font-bold text-text-secondary tabular-nums">
                        {d.hour}:00
                      </span>
                    )}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-bg-card border border-border-color p-2 rounded-lg text-[10px] font-black z-30 whitespace-nowrap shadow-lg">
                      {d.hour}:00 — {Math.round(d.metabolicRate)}%
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Peak & Recovery Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="!p-5 border-accent-teal/20 bg-gradient-to-br from-accent-teal/5 to-transparent relative overflow-hidden">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent-teal rounded-2xl shadow-lg shadow-accent-teal/20">
                    <Zap className="text-white" size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-accent-teal uppercase tracking-widest mb-1">Peak Strength Window</p>
                    <h3 className="text-xl font-black text-text-primary tabular-nums">
                      {formatHourMin(calculations.peakStart)} — {formatHourMin(calculations.peakEnd)}
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-1">Core body temperature and testosterone peak detected.</p>
                  </div>
                </div>
                <Sparkles className="absolute -bottom-3 -right-3 opacity-5" size={80} />
              </Card>

              <Card className="!p-5">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent-purple/10 rounded-2xl">
                    <Moon className="text-accent-purple" size={22} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Adrenal Recovery Start</p>
                    <h3 className="text-xl font-black text-text-primary tabular-nums">{formatHourMin(calculations.recoveryStart)}</h3>
                    <p className="text-[11px] text-text-secondary mt-1">Phase out stimulants for optimal CNS resetting.</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Meal Timing */}
            <Card className="!p-5">
              <h3 className="font-black text-text-primary text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <Utensils size={16} className="text-accent-teal" /> Optimized Meal Windows
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Breakfast', time: calculations.breakfast, icon: '🍳', color: 'text-orange-400' },
                  { label: 'Pre-Workout', time: calculations.preWorkout, icon: '🥤', color: 'text-blue-400' },
                  { label: 'Post-Workout', time: calculations.postWorkout, icon: '🥗', color: 'text-accent-teal' },
                  { label: 'Last Meal', time: calculations.lastMeal, icon: '🍽️', color: 'text-accent-purple' },
                ].map((meal, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3 bg-bg-primary rounded-xl border border-border-color text-center group hover:border-accent-teal/20 transition-all"
                  >
                    <span className="text-lg">{meal.icon}</span>
                    <p className={`text-lg font-black ${meal.color} tabular-nums mt-1`}>{formatHourMin(meal.time)}</p>
                    <p className="text-[9px] font-bold text-text-secondary uppercase tracking-wider">{meal.label}</p>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>

          {/* Insights Sidebar */}
          <div className="space-y-4">
            <Card className="h-fit">
              <h2 className="font-black text-text-primary flex items-center gap-2 mb-5">
                <Brain className="text-accent-teal" size={18} /> AI Rhythm Insights
              </h2>
              <div className="space-y-3">
                {insights.map((item, i) => (
                  <motion.div
                    key={`${chronotype}-${wakeHour}-${i}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="p-3.5 bg-bg-primary rounded-xl border border-border-color space-y-2 group hover:border-accent-teal/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[10px] font-black text-text-primary uppercase tracking-wider">
                      {item.icon} {item.title}
                    </div>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      {item.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Recommended Protocol */}
            <Card className="!p-5">
              <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-4">Today's Protocol</h3>
              <div className="space-y-2.5">
                {[
                  { time: formatHourMin(wakeHour + shift), label: 'Wake + Sunlight', done: currentHourDecimal > wakeHour + shift },
                  { time: formatHourMin(calculations.breakfast), label: 'Protein-rich breakfast', done: currentHourDecimal > calculations.breakfast },
                  { time: formatHourMin(calculations.preWorkout), label: 'Pre-workout nutrition', done: currentHourDecimal > calculations.preWorkout },
                  { time: formatHourMin(calculations.peakStart), label: 'Heavy training begins', done: currentHourDecimal > calculations.peakStart },
                  { time: formatHourMin(calculations.postWorkout), label: 'Post-workout recovery', done: currentHourDecimal > calculations.postWorkout },
                  { time: formatHourMin(calculations.recoveryStart), label: 'Begin wind down', done: currentHourDecimal > calculations.recoveryStart },
                  { time: formatHourMin(calculations.sleep), label: 'Lights out', done: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 group">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      step.done ? 'border-accent-teal bg-accent-teal' : 'border-border-color'
                    }`}>
                      {step.done && <Check size={10} className="text-white" />}
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className={`text-[11px] font-medium ${step.done ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
                        {step.label}
                      </span>
                      <span className="text-[10px] font-bold text-text-secondary tabular-nums">{step.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Chrono Info */}
            <div className="p-3.5 bg-accent-teal/5 border border-accent-teal/20 rounded-xl flex items-start gap-3">
              <Sparkles size={16} className="text-accent-teal flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-accent-teal">{CHRONO_LABELS[chronotype].emoji} {CHRONO_LABELS[chronotype].label}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">{CHRONO_LABELS[chronotype].desc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
