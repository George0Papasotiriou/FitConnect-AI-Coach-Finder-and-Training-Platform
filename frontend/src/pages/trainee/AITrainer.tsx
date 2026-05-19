/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import {
  Send, Sparkles, Dumbbell, Apple, Heart, Zap, RotateCcw, ChevronDown,
  Command, LoaderIcon, Award, Timer, Plus, X, GripHorizontal
} from 'lucide-react'
import { aiApi, ChatMessage } from '../../api/ai'
import StrengthCalculator from '../../components/ai/StrengthCalculator'
import WorkoutTimer from '../../components/chat/WorkoutTimer'
import { toast } from 'sonner'
import { subscribeVoiceAction } from '../../lib/voiceActionBus'

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

interface ChatInstance {
  id: string
  messages: UIMessage[]
  input: string
  isLoading: boolean
  zIndex: number
  initialX: number | string
  initialY: number | string
}

const QUICK_PROMPTS = [
  { icon: <Dumbbell size={15} />, label: 'Workout Plan', prompt: 'Create a 4-week workout plan for building strength at home with no equipment.', prefix: '/workout' },
  { icon: <Apple size={15} />, label: 'Meal Plan', prompt: 'Give me a healthy 7-day meal plan for muscle gain and fat loss.', prefix: '/meal' },
  { icon: <Heart size={15} />, label: 'Recovery Tips', prompt: 'What are the best recovery strategies after an intense workout to reduce soreness?', prefix: '/recovery' },
  { icon: <Zap size={15} />, label: 'Boost Energy', prompt: 'What can I do before a workout to maximise my energy and performance?', prefix: '/energy' },
  { icon: <Sparkles size={15} />, label: 'Motivation', prompt: 'I\'ve been struggling to stay consistent with my fitness routine. How can I build the habit?', prefix: '/motivate' },
  { icon: <Dumbbell size={15} />, label: 'Form Check', prompt: 'Can you explain perfect form for the squat, deadlift, and bench press?', prefix: '/form' },
]

function formatContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-accent-teal mt-4 mb-2">{line.slice(4).replace(/\*\*/g, '')}</h3>
    if (line.startsWith('#### ')) return <h4 key={i} className="text-base font-bold text-text-primary mt-3 mb-1">{line.slice(5).replace(/\*\*/g, '')}</h4>
    if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="font-bold mt-2 first:mt-0">{line.replace(/\*\*/g, '')}</p>
    if (line.match(/^\*\*(.+?)\*\*/)) return <p key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>') }} className="mb-1" />
    if (line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')) return <div key={i} className="flex items-start text-sm mb-1"><span className="mr-2 opacity-60">•</span><span dangerouslySetInnerHTML={{ __html: line.replace(/^[-•*]\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>') }} /></div>
    if (line.match(/^\d+\.\s/)) return <div key={i} className="flex items-start text-sm mb-1"><span className="mr-2 opacity-60 font-medium">{line.match(/^(\d+)\.\s/)?.[1]}.</span><span dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '').replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary">$1</strong>') }} /></div>
    if (line.trim() === '') return <br key={i} />
    return <p key={i} className="mb-1 text-sm leading-relaxed">{line}</p>
  })
}

function TypingDots() {
  return (
    <div className="flex items-center ml-1">
      {[1, 2, 3].map((dot) => (
        <motion.div key={dot} className="w-1.5 h-1.5 bg-accent-purple rounded-full mx-0.5"
          animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.85, 1.1, 0.85] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.15, ease: "easeInOut" }}
          style={{ boxShadow: '0 0 4px rgba(16, 185, 129, 0.3)' }}
        />
      ))}
    </div>
  )
}


function ChatWindow({ chat, setChats, containerRef, bringToFront, highestZ, isSingleChat }: any) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [])

  useEffect(() => { scrollToBottom() }, [chat.messages, scrollToBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const h = () => setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 100)
    el.addEventListener('scroll', h)
    return () => el.removeEventListener('scroll', h)
  }, [])

  // Voice-driven auto-send: when the parent flips `_voiceAutoSend` to a
  // fresh timestamp AND has put the text in chat.input, we send it.
  const lastVoiceSendRef = useRef<number>(0)
  useEffect(() => {
    const ts = (chat as any)._voiceAutoSend as number | undefined
    if (!ts || ts === lastVoiceSendRef.current) return
    const text = (chat.input as string)?.trim()
    if (!text) return
    lastVoiceSendRef.current = ts
    void sendMessage(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat])

  const sendMessage = async (text: string) => {
    if (!text.trim() || chat.isLoading) return
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user', content: text.trim(), ts: Date.now() }
    
    setChats((prev: any) => prev.map((c: any) => c.id === chat.id ? { ...c, messages: [...c.messages, userMsg], input: '', isLoading: true } : c))

    const history: ChatMessage[] = chat.messages.filter((m: any) => m.id !== 'welcome').map((m: any) => ({ role: m.role, content: m.content }))
    try {
      const { response } = await aiApi.chat(text.trim(), history)
      const aiMsg: UIMessage = { id: crypto.randomUUID(), role: 'assistant', content: response, ts: Date.now() }
      setChats((prev: any) => prev.map((c: any) => c.id === chat.id ? { ...c, messages: [...c.messages, aiMsg], isLoading: false } : c))
    } catch {
      const errMsg: UIMessage = { id: crypto.randomUUID(), role: 'assistant', content: "I'm having a quick breather 😅 Please try again in a moment!", ts: Date.now() }
      setChats((prev: any) => prev.map((c: any) => c.id === chat.id ? { ...c, messages: [...c.messages, errMsg], isLoading: false } : c))
    } finally {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  return (
    <motion.div
      drag dragMomentum={false} dragConstraints={containerRef} dragElastic={0.1}
      onMouseDown={() => bringToFront(chat.id)}
      initial={{ 
        opacity: 0, 
        scale: 0.9, 
      }} 
      animate={{ 
        opacity: 1, 
        scale: 1, 
        width: isSingleChat ? 900 : 420, 
        height: isSingleChat ? '80vh' : 550,
      }} 
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ zIndex: chat.zIndex, position: 'absolute', left: chat.initialX, top: chat.initialY }}
      className="bg-white/90 dark:bg-[#0a0a0b]/90 backdrop-blur-2xl rounded-2xl flex flex-col shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
    >
      {/* Header / Drag Handle */}
      <div className="h-12 flex-shrink-0 bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/[0.05] dark:border-white/[0.05] flex items-center justify-between px-4 cursor-move active:cursor-grabbing">
        <div className="flex items-center gap-2 pointer-events-none">
          <GripHorizontal size={14} className="text-text-secondary opacity-50" />
          <span className="text-xs font-bold text-text-primary tracking-wide">AbiliFit AI</span>
        </div>
        <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setChats((p: any) => p.filter((c: any) => c.id !== chat.id))} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-text-secondary hover:text-black dark:hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4 pb-36 relative">
        {chat.messages.map((msg: any) => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-purple to-accent-teal flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-lg shadow-accent-purple/20">
                <Sparkles size={10} className="text-white" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm backdrop-blur-xl ${msg.role === 'user' ? 'bg-accent-purple text-white rounded-br-sm shadow-lg shadow-accent-purple/20' : 'bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] text-text-primary rounded-bl-sm'}`}>
              {msg.role === 'assistant' ? <div className="space-y-0.5">{formatContent(msg.content)}</div> : <p className="leading-relaxed">{msg.content}</p>}
            </div>
          </motion.div>
        ))}
        {chat.isLoading && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent-purple to-accent-teal flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow">
              <Sparkles size={10} className="text-white" />
            </div>
            <div className="bg-black/[0.02] dark:bg-white/[0.04] border border-black/[0.05] dark:border-white/[0.06] rounded-2xl rounded-bl-sm px-4 py-3 backdrop-blur-xl">
              <div className="flex gap-1 items-center h-4"><span className="text-[10px] text-text-secondary mr-1">Thinking</span><TypingDots /></div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-[#0a0a0b]/95 backdrop-blur-xl border-t border-black/[0.05] dark:border-white/[0.05] z-40 flex flex-col gap-3" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={chat.input}
              onChange={e => setChats((p: any) => p.map((c: any) => c.id === chat.id ? { ...c, input: e.target.value } : c))}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chat.input) } }}
              placeholder="Ask me anything..." rows={1} disabled={chat.isLoading}
              className="w-full bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/30 focus:outline-none resize-none scrollbar-thin max-h-32 disabled:opacity-60 transition-all focus:border-accent-purple/30"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => sendMessage(chat.input)} disabled={!chat.input.trim() || chat.isLoading}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${chat.input.trim() ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/20' : 'bg-black/[0.04] dark:bg-white/[0.04] text-text-secondary/60 dark:text-text-secondary/40'}`}
          >
            {chat.isLoading ? <LoaderIcon className="w-4 h-4 animate-[spin_2s_linear_infinite]" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {QUICK_PROMPTS.map((suggestion, index) => (
            <motion.button key={suggestion.label} onClick={() => sendMessage(suggestion.prompt)} disabled={chat.isLoading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.02] rounded-full border border-black/10 dark:border-white/[0.1] text-[10px] text-text-secondary hover:text-black dark:hover:text-white transition-all relative group overflow-hidden disabled:opacity-40"
            >
              <div className="relative z-10 flex items-center gap-1.5">
                <span className="text-black/40 dark:text-white/40 group-hover:text-accent-teal transition-colors flex items-center justify-center">{suggestion.icon}</span>
                <span className="font-medium tracking-wide">{suggestion.label}</span>
              </div>
              <motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent-purple to-accent-teal opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}


export default function AITrainer() {
  const [chats, setChats] = useState<ChatInstance[]>([
    {
      id: crypto.randomUUID(),
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: "Hey there! 💪 I'm your AbiliFit AI Trainer. I can help you with personalised workout plans, nutrition advice, recovery tips, and anything else fitness-related. What would you like to work on today?",
          ts: Date.now(),
        },
      ],
      input: '',
      isLoading: false,
      zIndex: 10,
      initialX: 'calc(50% - 490px)', // Centered in the container, shifted left
      initialY: '164px', // Sit comfortably below header
    }
  ])
  const [highestZ, setHighestZ] = useState(10)

  const [showStrengthCalc, setShowStrengthCalc] = useState(false)
  const [showTimer, setShowTimer] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  // Voice integration: react to ai_chat_send / start_timer.
  // Voice can also "press Workout Plan" via the global click handler.
  useEffect(() => {
    const off = subscribeVoiceAction((action) => {
      if (action.type === 'start_timer' && typeof action.payload === 'number') {
        setShowTimer(true)
        return
      }
      if (action.type === 'ai_chat_send' && typeof action.payload === 'string') {
        // Drop the message into the most-recently-focused (highest-z) chat
        // and let its existing send loop pick it up.
        const text = action.payload.trim()
        if (!text) return
        setChats((prev) => {
          if (prev.length === 0) return prev
          const target = [...prev].sort((a, b) => b.zIndex - a.zIndex)[0]
          return prev.map((c) =>
            c.id === target.id
              ? { ...c, input: text, _voiceAutoSend: Date.now() } as any
              : c,
          )
        })
      }
    })
    return off
  }, [])

  const bringToFront = (id: string) => {
    setHighestZ(prev => prev + 1)
    setChats(prev => prev.map(c => c.id === id ? { ...c, zIndex: highestZ + 1 } : c))
  }

  const handleAddChat = () => {
    if (chats.length >= 3) {
      toast.error("You have reached the limit of 3 AI Agents.")
      return
    }

    setHighestZ(prev => prev + 1)
    
    // Calculate cascade position so it spawns next to the center
    const offset = chats.length * 40;
    const initialX = `calc(50% - 210px + ${offset}px)`; // Centered for 420px width
    const initialY = `calc(50% - 275px + ${offset}px)`; // Centered for 550px height

    setChats(prev => [...prev, {
      id: crypto.randomUUID(),
      messages: [{ id: 'welcome', role: 'assistant', content: "New chat session started! What can I help you with?", ts: Date.now() }],
      input: '',
      isLoading: false,
      zIndex: highestZ + 1,
      initialX,
      initialY
    }])
  }
  
  const handleClearAll = () => {
    setHighestZ(10)
    setChats([{
      id: crypto.randomUUID(),
      messages: [{ id: 'welcome', role: 'assistant', content: "All chats cleared! Ready for a fresh start 💪", ts: Date.now() }],
      input: '',
      isLoading: false,
      zIndex: 10,
      initialX: 'calc(50% - 490px)',
      initialY: '164px',
    }])
  }

  const isSingleChat = chats.length === 1;

  return (
    <>
      <Helmet><title>AI Trainer — AbiliFit</title></Helmet>

      {/* Grid Layout Container - Absolute inset-0 escapes the parent padding container */}
      <div 
        ref={containerRef}
        className="absolute inset-0 overflow-hidden bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] border-t border-black/[0.05] dark:border-white/[0.05]"
      >
        {/* Ambient background blobs */}
        <div className="absolute inset-0 pointer-events-none -z-10">
          <div className="absolute top-[10%] left-[20%] w-96 h-96 bg-accent-purple/[0.04] rounded-full mix-blend-normal filter blur-[120px] animate-pulse" />
          <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-accent-teal/[0.04] rounded-full mix-blend-normal filter blur-[120px] animate-pulse" style={{ animationDelay: '700ms' }} />
        </div>

        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 p-6 pt-20 md:pt-24 flex items-center justify-between pointer-events-none z-[100]">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-bg-card border border-black/5 dark:border-white/5 flex items-center justify-center shadow-xl dark:shadow-2xl backdrop-blur-xl">
              <Sparkles size={20} className="text-accent-teal" />
            </div>
            <div>
              <h1 className="text-2xl font-black italic uppercase tracking-tighter text-text-primary drop-shadow-md">AI Trainer Space</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Powered by AbiliFit AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 pointer-events-auto">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleAddChat}
              className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded-full border border-black/10 dark:border-white/[0.1] text-xs font-bold text-text-secondary hover:text-text-primary transition-all relative group overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-2">
                <Plus size={14} className="text-black/40 dark:text-white/40 group-hover:text-accent-purple transition-colors" />
                <span>New Chat</span>
              </div>
              <motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent-purple to-accent-teal opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
            
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowTimer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded-full border border-black/10 dark:border-white/[0.1] text-xs font-bold text-text-secondary hover:text-text-primary transition-all relative group overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-2">
                <Timer size={14} className="text-black/40 dark:text-white/40 group-hover:text-accent-teal transition-colors" />
                <span>Timer</span>
              </div>
              <motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent-purple to-accent-teal opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
            
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowStrengthCalc(true)}
              className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded-full border border-black/10 dark:border-white/[0.1] text-xs font-bold text-text-secondary hover:text-text-primary transition-all relative group overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-2">
                <Award size={14} className="text-black/40 dark:text-white/40 group-hover:text-accent-orange transition-colors" />
                <span>Strength Calc</span>
              </div>
              <motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-accent-purple to-accent-teal opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleClearAll}
              className="flex items-center gap-2 px-4 py-2 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 rounded-full border border-black/10 dark:border-white/[0.1] text-xs font-bold text-text-secondary hover:text-text-primary transition-all relative group overflow-hidden"
            >
              <div className="relative z-10 flex items-center gap-2">
                <RotateCcw size={14} className="text-black/40 dark:text-white/40 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
                <span>Reset All</span>
              </div>
              <motion.span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          </div>
        </div>

        {/* Draggable Chat Windows */}
        <AnimatePresence>
          {chats.map((chat) => (
            <ChatWindow 
              key={chat.id} 
              chat={chat} 
              setChats={setChats} 
              containerRef={containerRef} 
              bringToFront={bringToFront}
              highestZ={highestZ}
              isSingleChat={isSingleChat}
            />
          ))}
        </AnimatePresence>
        
        {/* Draggable Timer */}
        <AnimatePresence>
          {showTimer && (
            <motion.div
              drag dragMomentum={false} dragConstraints={containerRef} dragElastic={0.1}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute top-36 right-24 z-[90] w-72"
              onMouseDown={() => setHighestZ(prev => prev + 1)}
              style={{ zIndex: highestZ + 10 }}
            >
              <WorkoutTimer onClose={() => setShowTimer(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StrengthCalculator isOpen={showStrengthCalc} onClose={() => setShowStrengthCalc(false)} />
    </>
  )
}
