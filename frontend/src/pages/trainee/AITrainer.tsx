import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Send, Sparkles, Dumbbell, Apple, Heart, Zap, RotateCcw, ChevronDown } from 'lucide-react'
import { aiApi, ChatMessage } from '../../api/ai'
import StrengthCalculator from '../../components/ai/StrengthCalculator'
import WorkoutTimer from '../../components/chat/WorkoutTimer'
import { Award, Timer } from 'lucide-react'

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const QUICK_PROMPTS = [
  { icon: <Dumbbell size={16} />, label: 'Workout Plan', prompt: 'Create a 4-week workout plan for building strength at home with no equipment.' },
  { icon: <Apple size={16} />, label: 'Meal Plan', prompt: 'Give me a healthy 7-day meal plan for muscle gain and fat loss.' },
  { icon: <Heart size={16} />, label: 'Recovery Tips', prompt: 'What are the best recovery strategies after an intense workout to reduce soreness?' },
  { icon: <Zap size={16} />, label: 'Boost Energy', prompt: 'What can I do before a workout to maximise my energy and performance?' },
  { icon: <Sparkles size={16} />, label: 'Motivation', prompt: 'I\'ve been struggling to stay consistent with my fitness routine. How can I build the habit?' },
  { icon: <Dumbbell size={16} />, label: 'Form Check', prompt: 'Can you explain perfect form for the squat, deadlift, and bench press?' },
]

function formatContent(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**')) {
      return <p key={i} className="font-bold mt-2 first:mt-0">{line.replace(/\*\*/g, '')}</p>
    }
    if (line.match(/^\*\*(.+?)\*\*/)) {
      const formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      return <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} className="mb-1" />
    }
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <li key={i} className="ml-4 list-disc text-sm">{line.slice(2)}</li>
    }
    if (line.match(/^\d+\./)) {
      return <li key={i} className="ml-4 list-decimal text-sm">{line.replace(/^\d+\./, '').trim()}</li>
    }
    if (line.trim() === '') return <br key={i} />
    return <p key={i} className="mb-1 text-sm leading-relaxed">{line}</p>
  })
}

export default function AITrainer() {
  const [messages, setMessages] = useState<UIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey there! 💪 I'm your Insta Coach AI Trainer. I can help you with personalised workout plans, nutrition advice, recovery tips, and anything else fitness-related. What would you like to work on today?",
      ts: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const [showStrengthCalc, setShowStrengthCalc] = useState(false)
  const [showTimer, setShowTimer] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handleScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollBtn(distFromBottom > 200)
    }
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return
    const userMsg: UIMessage = { id: crypto.randomUUID(), role: 'user', content: text.trim(), ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    const history: ChatMessage[] = messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const { response } = await aiApi.chat(text.trim(), history)
      const aiMsg: UIMessage = { id: crypto.randomUUID(), role: 'assistant', content: response, ts: Date.now() }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      const errMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I'm having a quick breather 😅 Please try again in a moment!",
        ts: Date.now(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isLoading, messages])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleClear = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Chat cleared! Ready for a fresh start 💪 What fitness challenge can I help you tackle?",
      ts: Date.now(),
    }])
  }

  return (
    <>
      <Helmet><title>AI Trainer — Insta Coach</title></Helmet>

      <div className="flex flex-col h-[calc(100vh-120px)] max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-teal flex items-center justify-center shadow-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">AI Trainer</h1>
              <p className="text-xs text-text-secondary">Powered by Insta Coach AI · Always available</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowTimer(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-accent-teal bg-accent-teal/10 border border-accent-teal/20 px-3 py-1.5 rounded-lg hover:bg-accent-teal/20 transition-all shadow-sm"
            >
              <Timer size={13} />
              Timer
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStrengthCalc(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-accent-purple bg-accent-purple/10 border border-accent-purple/20 px-3 py-1.5 rounded-lg hover:bg-accent-purple/20 transition-all shadow-sm"
            >
              <Award size={13} />
              Strength Calc
            </motion.button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-bg-card-hover transition-colors"
              aria-label="Clear chat"
            >
              <RotateCcw size={13} />
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 flex-shrink-0">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p.label}
              onClick={() => sendMessage(p.prompt)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-card border border-border-color text-xs text-text-secondary hover:text-accent-purple hover:border-accent-purple/40 hover:bg-accent-purple/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <span className="text-accent-purple flex-shrink-0">{p.icon}</span>
              <span className="font-medium truncate">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 relative rounded-2xl overflow-hidden border border-border-color bg-bg-card">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto scrollbar-thin p-4 space-y-4 pb-24"
            aria-live="polite"
            aria-label="AI Trainer conversation"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-teal flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-accent-purple text-white rounded-br-sm'
                        : 'bg-bg-primary border border-border-color text-text-primary rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="space-y-0.5">{formatContent(msg.content)}</div>
                    ) : (
                      <p className="leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-teal flex items-center justify-center flex-shrink-0 mr-2 mt-0.5 shadow">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="bg-bg-primary border border-border-color rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-5">
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-accent-purple"
                        animate={{ y: [0, -6, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-20 right-4 p-2 rounded-full bg-accent-purple text-white shadow-lg hover:bg-accent-teal/80 transition-colors"
              aria-label="Scroll to bottom"
            >
              <ChevronDown size={16} />
            </button>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3 bg-bg-card border-t border-border-color">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about fitness, nutrition, or workouts..."
                rows={1}
                disabled={isLoading}
                aria-label="Message input"
                className="flex-1 bg-bg-primary border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none scrollbar-thin max-h-32 disabled:opacity-60"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-accent-purple hover:bg-accent-teal/80 text-white rounded-xl transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                aria-label="Send message"
              >
                <Send size={18} />
              </motion.button>
            </div>
            <p className="text-[10px] text-text-secondary mt-1.5 text-center">
              AI responses are for informational purposes only. Consult a professional for medical advice.
            </p>
          </div>
        </div>
      </div>

      <StrengthCalculator 
        isOpen={showStrengthCalc} 
        onClose={() => setShowStrengthCalc(false)} 
      />

      <AnimatePresence>
        {showTimer && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-32 right-6 z-40 w-72"
          >
            <WorkoutTimer onClose={() => setShowTimer(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
