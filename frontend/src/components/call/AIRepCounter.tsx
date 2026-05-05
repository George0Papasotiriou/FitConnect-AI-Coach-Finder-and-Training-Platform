import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Mic, Play, Square, RefreshCcw, Save, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import Badge from '../common/Badge'

interface Set {
    reps: number
    timestamp: number
    duration: number
}

interface AIRepCounterProps {
    onClose: () => void
    initialExercise?: string
}

export default function AIRepCounter({ onClose, initialExercise = '' }: AIRepCounterProps) {
    const [exercise, setExercise] = useState(initialExercise)
    const [reps, setReps] = useState(0)
    const [isCounting, setIsCounting] = useState(false)
    const [sets, setSets] = useState<Set[]>([])
    const [isMinimized, setIsMinimized] = useState(false)
    
    const recognitionRef = useRef<any>(null)
    const setStartTime = useRef<number | null>(null)
    const lastProcessedResultIndex = useRef(-1)

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) {
            toast.error('Speech recognition not supported in this browser')
            return
        }

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'en-US'

        recognition.onresult = (event: any) => {
            if (!isCounting) return

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (i <= lastProcessedResultIndex.current) continue
                
                const transcript = event.results[i][0].transcript.toLowerCase().trim()
                
                // Detection logic
                // 1. Spoken numbers (one, two, three...)
                const numberWords: Record<string, number> = {
                    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
                }
                
                let detectedNum = -1
                if (/^\d+$/.test(transcript)) {
                    detectedNum = parseInt(transcript)
                } else if (numberWords[transcript]) {
                    detectedNum = numberWords[transcript]
                }

                if (detectedNum > 0) {
                    setReps(detectedNum)
                    if (!setStartTime.current && detectedNum > 0) setStartTime.current = Date.now()
                    
                    // Simple voice feedback
                    if (detectedNum % 5 === 0) {
                        speak(`${detectedNum} reps`)
                    }
                }

                // 2. Progressive keywords ("another", "next", "rep")
                if (transcript.includes('another') || transcript.includes('next') || transcript.includes('rep')) {
                    setReps(prev => prev + 1)
                    if (!setStartTime.current) setStartTime.current = Date.now()
                }

                // 3. Command keywords
                if (transcript.includes('finish set') || transcript.includes('set done') || transcript.includes('set finished')) {
                    handleFinishSet()
                }

                if (event.results[i].isFinal) {
                    lastProcessedResultIndex.current = i
                }
            }
        }

        recognition.onend = () => {
            if (isCounting) recognition.start()
        }

        recognitionRef.current = recognition

        return () => {
            recognition.stop()
        }
    }, [isCounting])

    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.rate = 1.2
            window.speechSynthesis.speak(utterance)
        }
    }

    const toggleCounting = () => {
        if (isCounting) {
            recognitionRef.current?.stop()
            setIsCounting(false)
        } else {
            if (!exercise.trim()) {
                toast.warning('Please name the exercise first')
                return
            }
            recognitionRef.current?.start()
            setIsCounting(true)
            toast.success('Rep counter active. Start your set!')
        }
    }

    const handleFinishSet = () => {
        if (reps === 0) return
        
        const duration = setStartTime.current ? Math.round((Date.now() - setStartTime.current) / 1000) : 0
        const newSet = { reps, duration, timestamp: Date.now() }
        
        setSets(prev => [...prev, newSet])
        setReps(0)
        setStartTime.current = null
        speak(`Set finished. ${reps} reps documented.`)
        toast.info(`Set of ${reps} reps recorded`)
    }

    const resetSets = () => {
        if (confirm('Clear all sets for this exercise?')) {
            setSets([])
            setReps(0)
            setStartTime.current = null
        }
    }

    if (isMinimized) {
        return (
            <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="fixed bottom-24 right-6 z-50 bg-accent-teal text-white p-3 rounded-2xl shadow-2xl flex items-center gap-3 cursor-pointer"
                onClick={() => setIsMinimized(false)}
            >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Zap size={18} />
                </div>
                <div>
                    <span className="text-xs font-bold block leading-none">Reps</span>
                    <span className="text-xl font-black leading-none">{reps}</span>
                </div>
                <ChevronUp size={16} className="ml-2 opacity-50" />
            </motion.div>
        )
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed bottom-24 right-6 z-50 w-72 bg-surface-dark border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl"
        >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-accent-teal/20 to-accent-purple/20 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-accent-teal/20 flex items-center justify-center text-accent-teal">
                        <Zap size={20} />
                    </div>
                    <span className="font-black text-white text-sm tracking-tight">AI REP COUNTER</span>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMinimized(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                        <ChevronDown size={18} />
                    </button>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-500 transition-colors">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Main Display */}
            <div className="p-5 space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Exercise</label>
                    <input 
                        value={exercise}
                        onChange={(e) => setExercise(e.target.value)}
                        placeholder="e.g. Bench Press"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-accent-teal transition-all font-medium"
                    />
                </div>

                <div className="relative group">
                    <div className="bg-black/30 rounded-2xl p-8 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
                        {/* Pulse effect */}
                        <AnimatePresence>
                            {isCounting && (
                                <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1.5, opacity: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="absolute inset-0 rounded-full border border-accent-teal/30 pointer-events-none"
                                />
                            )}
                        </AnimatePresence>
                        
                        <span className="text-[10px] font-bold text-accent-teal mb-1 uppercase tracking-widest">Active Reps</span>
                        <motion.span 
                            key={reps}
                            initial={{ scale: 1.2, color: '#10b981' }}
                            animate={{ scale: 1, color: '#fff' }}
                            className="text-6xl font-black text-white leading-none mb-2"
                        >
                            {reps}
                        </motion.span>
                        <Badge variant={isCounting ? 'teal' : 'gray'} className="animate-pulse">
                            {isCounting ? 'LISTENING...' : 'PAUSED'}
                        </Badge>
                    </div>
                </div>

                {/* Controls */}
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={toggleCounting}
                        className={`py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                            isCounting 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                            : 'bg-accent-teal text-black shadow-lg shadow-accent-teal/20'
                        }`}
                    >
                        {isCounting ? <Square size={18} /> : <Play size={18} />}
                        {isCounting ? 'Stop' : 'Start'}
                    </button>
                    <button 
                        onClick={handleFinishSet}
                        disabled={reps === 0}
                        className="py-3 bg-white/5 border border-white/10 rounded-2xl font-bold text-sm text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                        <Save size={18} /> Finish
                    </button>
                </div>

                {/* History */}
                {sets.length > 0 && (
                    <div className="pt-4 border-t border-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest pl-1">Sets History</span>
                            <button onClick={resetSets} className="p-1 text-red-500/50 hover:text-red-500 transition-colors">
                                <Trash2 size={12} />
                            </button>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            {sets.map((set, i) => (
                                <div key={i} className="flex items-center justify-between p-2.5 bg-black/20 rounded-xl border border-white/5 text-xs text-text-secondary group">
                                    <span className="font-bold text-white/50">SET {i + 1}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-white font-bold">{set.reps} REPS</span>
                                        <span className="text-[10px] opacity-40">{set.duration}s</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
