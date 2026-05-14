/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Activity, Timer, Zap, MessageSquare, Plus, Minus, X, Copy, Check } from 'lucide-react'

const numberWords: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
}

interface CompletedSet {
  reps: number;
  durationSeconds: number;
}

interface ExerciseLog {
  name: string;
  sets: CompletedSet[];
}

interface AICallAssistantProps {
  onClose?: () => void
}

export default function AICallAssistant({ onClose }: AICallAssistantProps) {
  const [reps, setReps] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [timerMax, setTimerMax] = useState(0)
  const [aiMessage, setAiMessage] = useState('Voice assistant ready. Name your exercise and say numbers to count reps!')
  
  // Workout Tracker States
  const [currentExercise, setCurrentExercise] = useState('')
  const [workoutLog, setWorkoutLog] = useState<ExerciseLog[]>([])
  const [isCopied, setIsCopied] = useState(false)
  
  const recognitionRef = useRef<any>(null)
  const setStartTime = useRef<number | null>(null)
  
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      
      recognition.onresult = (event: any) => {
        let currentTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) currentTranscript += event.results[i][0].transcript
          else currentTranscript += event.results[i][0].transcript
        }
        
        currentTranscript = currentTranscript.toLowerCase()

        let foundNumber = false
        const words = currentTranscript.split(/\s+/)
        for (const word of words) {
          const numMatch = word.match(/\d+/)
          if (numMatch) {
            setReps(parseInt(numMatch[0]))
            foundNumber = true
          } else if (numberWords[word]) {
            setReps(numberWords[word])
            foundNumber = true
          }
        }

        if (foundNumber) {
          if (!setStartTime.current && reps > 0) {
            setStartTime.current = Date.now()
            setAiMessage("Great start! Keep pushing!")
          }
          
          // Verbal feedback every 5 reps
          if (reps > 0 && reps % 5 === 0 && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(`${reps} reps, well done!`)
            utterance.rate = 1.1
            window.speechSynthesis.speak(utterance)
          }
        }

        // Try to detect exercise name from speech
        if (!currentExercise && !foundNumber) {
          const exercises = ['bench press', 'squats', 'deadlift', 'pushups', 'pullups', 'plank', 'biceps', 'shoulder press']
          for (const ex of exercises) {
            if (currentTranscript.includes(ex)) {
              setCurrentExercise(ex.charAt(0).toUpperCase() + ex.slice(1))
              setAiMessage(`Starting ${ex} tracking. Ready for your first rep!`)
              break
            }
          }
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsListening(false)
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop()
    }
  }, [])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const startTimer = (seconds: number) => {
    setTimeLeft(seconds)
    setTimerMax(seconds)
  }

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft(l => l - 1), 1000)
      return () => clearInterval(timer)
    } else if (timeLeft === 0 && timerMax > 0) {
      const audio = new Audio('/ringtone.mp3')
      audio.volume = 0.5
      audio.play().catch(() => {})
      setTimerMax(0)
    }
  }, [timeLeft, timerMax])

  const finishSet = () => {
    if (!currentExercise.trim()) {
      setAiMessage("Please enter an exercise name before finishing the set!")
      return
    }

    const duration = setStartTime.current ? Math.round((Date.now() - setStartTime.current) / 1000) : 0
    
    setWorkoutLog(prev => {
      const existingIdx = prev.findIndex(e => e.name.toLowerCase() === currentExercise.trim().toLowerCase())
      if (existingIdx >= 0) {
        const newLog = [...prev]
        newLog[existingIdx].sets.push({ reps, durationSeconds: duration })
        return newLog
      } else {
        return [...prev, { name: currentExercise.trim(), sets: [{ reps, durationSeconds: duration }] }]
      }
    })

    setReps(0)
    setStartTime.current = null
    setAiMessage(`Logged ${reps} reps for ${currentExercise}! Time to rest.`)
    startTimer(60)
  }

  const adjustReps = (amount: number) => {
    if (!setStartTime.current && amount > 0) setStartTime.current = Date.now()
    setReps(Math.max(0, reps + amount))
  }

  const copyToClipboard = async () => {
    if (workoutLog.length === 0) return
    
    let text = '💪 Workout Summary\\n\\n'
    workoutLog.forEach(ex => {
      text += `🏋️ ${ex.name}\\n`
      ex.sets.forEach((set, i) => {
        text += `   - Set ${i + 1}: ${set.reps} reps (${set.durationSeconds}s)\\n`
      })
      text += '\\n'
    })

    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (e) {
      console.error('Failed to copy', e)
    }
  }

  const currentExTrackerInfo = workoutLog.find(e => e.name.toLowerCase() === currentExercise.trim().toLowerCase())
  const activeSetsDisplay = currentExTrackerInfo ? currentExTrackerInfo.sets.length : 0

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 md:top-4 md:right-4 md:left-auto md:bottom-auto md:w-80 max-h-[85vh] md:max-h-[90vh] overflow-y-auto bg-surface-dark border-t md:border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl p-5 pb-[calc(env(safe-area-inset-bottom,20px)+20px)] md:pb-5 flex flex-col gap-6 z-[120] backdrop-blur-xl custom-scrollbar"
    >
      <div className="flex items-center justify-between sticky top-0 bg-surface-dark/90 backdrop-blur-md z-10 pb-2 border-b border-border-color">
        <div className="flex items-center gap-2">
          <Zap className="text-accent-teal" size={20} />
          <h3 className="font-bold text-lg text-white">AI Tracker</h3>
        </div>
        <div className="flex items-center gap-2">
          {workoutLog.length > 0 && (
            <button onClick={copyToClipboard} className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors" title="Copy Session">
              {isCopied ? <Check size={18} className="text-accent-teal" /> : <Copy size={18} />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-white hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <input 
          type="text" 
          value={currentExercise}
          onChange={(e) => setCurrentExercise(e.target.value)}
          placeholder="Exercise (e.g. Bench Press)"
          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent-teal/50 focus:ring-1 focus:ring-accent-teal/50 transition-all font-medium placeholder:text-white/30"
        />
        
        <div className="flex flex-col items-center justify-center p-6 bg-black/20 rounded-2xl border border-white/5 relative">
          <motion.div
            animate={isListening ? { scale: [1, 1.1, 1], borderColor: ['rgba(34,211,238,0.2)', 'rgba(34,211,238,0.6)', 'rgba(34,211,238,0.2)'] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-32 h-32 rounded-full border-4 border-white/10 flex flex-col items-center justify-center relative cursor-pointer group"
            onClick={toggleListening}
          >
            <span className="text-4xl font-black text-accent-teal group-hover:scale-110 transition-transform">{reps}</span>
            <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">Reps</span>
            <button
              className={`absolute -bottom-3 p-2 rounded-full shadow-lg ${isListening ? 'bg-red-500 text-white' : 'bg-surface border border-border-color text-text-primary'}`}
            >
              <Mic size={16} />
            </button>
          </motion.div>
          
          <div className="flex w-full items-center justify-between mt-6 px-2">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-white">{activeSetsDisplay}</span>
              <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">Sets Done</span>
            </div>
            <button
              onClick={finishSet}
              className="px-4 py-2 bg-gradient-to-r from-accent-purple to-accent-teal hover:opacity-90 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-accent-purple/20"
            >
              Finish Set
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => adjustReps(-1)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white flex justify-center transition-colors"><Minus size={18} /></button>
          <button onClick={() => adjustReps(1)} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white flex justify-center transition-colors"><Plus size={18} /></button>
        </div>
      </div>

      <div className="space-y-3 relative p-4 bg-white/5 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="text-accent-purple" size={16} />
          <span className={`text-sm font-bold ${timeLeft > 0 ? 'text-accent-teal font-mono' : 'text-white'}`}>
            {timeLeft > 0 ? `Resting: 00:${timeLeft.toString().padStart(2, '0')}` : 'Rest Timers'}
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => startTimer(60)} className="flex-1 py-1.5 border border-white/10 bg-black/20 rounded-lg text-xs font-semibold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-all">60s</button>
          <button onClick={() => startTimer(90)} className="flex-1 py-1.5 border border-white/10 bg-black/20 rounded-lg text-xs font-semibold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-all">90s</button>
          <button onClick={() => startTimer(120)} className="flex-1 py-1.5 border border-white/10 bg-black/20 rounded-lg text-xs font-semibold text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-all">120s</button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-3 bg-accent-teal/10 border border-accent-teal/20 rounded-xl">
        <MessageSquare className="text-accent-teal mt-0.5 flex-shrink-0" size={16} />
        <div>
          <p className="text-xs text-accent-teal/80 font-bold mb-0.5 uppercase tracking-wide">Coach AI:</p>
          <p className="text-sm text-text-primary leading-snug">{aiMessage}</p>
        </div>
      </div>

      {workoutLog.length > 0 && (
        <div className="mt-2 space-y-4 pt-4 border-t border-white/10">
          <h4 className="font-bold text-white text-sm flex items-center justify-between">
            Workout Log
            <span className="text-xs font-normal text-text-secondary">{workoutLog.length} Exercises</span>
          </h4>
          <div className="space-y-3">
            {workoutLog.map((log, idx) => (
              <div key={idx} className="bg-black/30 rounded-xl p-3 border border-white/5">
                <p className="font-semibold text-accent-teal text-sm flex items-center justify-between mb-2">
                  {log.name}
                </p>
                <div className="space-y-1.5 pl-2 border-l-2 border-white/10 text-xs">
                  {log.sets.map((set, sIdx) => (
                    <div key={sIdx} className="flex items-center justify-between text-text-secondary">
                      <span>Set {sIdx + 1}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{set.reps} reps</span>
                        <span className="opacity-50 w-8 text-right">{set.durationSeconds}s</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
