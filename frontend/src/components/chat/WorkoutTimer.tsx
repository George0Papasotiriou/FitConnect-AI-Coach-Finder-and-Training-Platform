import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, RotateCcw, X, Bell, Zap, Timer as TimerIcon } from 'lucide-react'
import Button from '../common/Button'

interface WorkoutTimerProps {
  onClose?: () => void
}

export default function WorkoutTimer({ onClose }: WorkoutTimerProps) {
  const [workTime, setWorkTime] = useState(45)
  const [restTime, setRestTime] = useState(15)
  const [rounds, setRounds] = useState(8)
  
  const [isActive, setIsActive] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [mode, setMode] = useState<'work' | 'rest'>('work')
  const [timeLeft, setTimeLeft] = useState(workTime)

  const reset = useCallback(() => {
    setIsActive(false)
    setCurrentRound(1)
    setMode('work')
    setTimeLeft(workTime)
  }, [workTime])

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout>
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000)
    } else if (isActive && timeLeft === 0) {
      if (mode === 'work') {
        setMode('rest')
        setTimeLeft(restTime)
      } else {
        if (currentRound < rounds) {
          setCurrentRound(r => r + 1)
          setMode('work')
          setTimeLeft(workTime)
        } else {
          setIsActive(false)
          // Play sound or notification
        }
      }
    }
    return () => clearInterval(interval)
  }, [isActive, timeLeft, mode, currentRound, rounds, workTime, restTime])

  const progress = (timeLeft / (mode === 'work' ? workTime : restTime)) * 100

  return (
    <Card className="!p-4 bg-bg-card border-border-color shadow-xl overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-accent-purple/10 rounded-lg text-accent-purple">
            <TimerIcon size={18} />
          </div>
          <h4 className="font-bold text-text-primary text-sm uppercase tracking-wider">Interval Timer</h4>
        </div>
        {onClose && <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X size={16} /></button>}
      </div>

      <div className="flex flex-col items-center justify-center py-6">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-bg-primary" />
            <motion.circle 
              cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" 
              strokeDasharray={377}
              animate={{ strokeDashoffset: 377 - (377 * progress) / 100 }}
              className={mode === 'work' ? 'text-accent-purple' : 'text-accent-teal'}
            />
          </svg>
          <div className="text-center z-10">
            <span className="text-3xl font-black text-text-primary tabular-nums">{timeLeft}</span>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${mode === 'work' ? 'text-accent-purple' : 'text-accent-teal'}`}>
              {mode}
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-bold text-text-secondary">Round {currentRound} / {rounds}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-secondary uppercase">Work (s)</label>
          <input type="number" value={workTime} onChange={e => setWorkTime(Number(e.target.value))} 
            disabled={isActive} className="w-full bg-bg-primary rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent-purple" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-text-secondary uppercase">Rest (s)</label>
          <input type="number" value={restTime} onChange={e => setRestTime(Number(e.target.value))} 
            disabled={isActive} className="w-full bg-bg-primary rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent-teal" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button fullWidth size="sm" onClick={() => setIsActive(!isActive)} leftIcon={isActive ? <Pause size={14} /> : <Play size={14} />}>
          {isActive ? 'Pause' : 'Start'}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} className="p-2"><RotateCcw size={14} /></Button>
      </div>
    </Card>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-bg-card rounded-2xl border border-border-color p-6 ${className}`}>{children}</div>
}
