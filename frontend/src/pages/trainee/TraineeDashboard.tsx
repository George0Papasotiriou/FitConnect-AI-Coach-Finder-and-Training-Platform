import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Trophy, Flame, Zap, Calendar, Sparkles, Utensils, Dumbbell, Play, ChevronRight, Activity } from 'lucide-react'
import { traineeApi } from '../../api/trainee'
import { useGamificationStore } from '../../store/gamificationStore'
import { useGamification } from '../../hooks/useGamification'
import { useAuthStore } from '../../store/authStore'
import XPBar from '../../components/common/XPBar'
import DailyTaskCard from '../../components/gamification/DailyTaskCard'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { useNavigate } from 'react-router-dom'
import { aiApi } from '../../api/ai'

export default function TraineeDashboard() {
  const { user } = useAuthStore()
  const { level, streak, dailyTasks } = useGamificationStore()
  const navigate = useNavigate()
  useGamification()

  const [stats, setStats] = useState({ totalSessions: 0, currentStreak: 0, achievements: 0, xp: 0, level: 1 })
  const [quote, setQuote] = useState({ quote: '', author: '' })
  const [workoutTip, setWorkoutTip] = useState('')
  const [dietTip, setDietTip] = useState('')
  const [upcoming, setUpcoming] = useState<any[]>([])

  useEffect(() => {
    traineeApi.getStats().then(setStats).catch(() => {})
    traineeApi.getMotivationalQuote().then(setQuote).catch(() => {})
    traineeApi.getUpcomingSessions().then(setUpcoming).catch(() => {})
    aiApi.getWorkoutSuggestion().then(r => setWorkoutTip(r.suggestion)).catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetch('/api/ai/dietary-tip', { headers: { Authorization: `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state?.token : ''}` } })
        .then(r => r.json()).then(r => setDietTip(r.tip)).catch(() => {})
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const nextSession = upcoming[0]

  return (
    <>
      <Helmet><title>Dashboard — Insta Coach</title></Helmet>

      <div className="space-y-6 max-w-[1400px] mx-auto">
        {/* Header / Welcome Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl font-black text-text-primary tracking-tight">
              Hello, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-text-secondary mt-1 font-medium">Ready to crush your goals today?</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/programs')} leftIcon={<Dumbbell size={16} />}>
              My Programs
            </Button>
            <Button size="sm" onClick={() => navigate('/search')} leftIcon={<Sparkles size={16} />}>
              Find a Coach
            </Button>
          </motion.div>
        </div>

        {/* BENTO GRID MAIN */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-auto">

          {/* Hero / Next Session Block (Spans 2 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="md:col-span-2 lg:col-span-2 bg-gradient-to-br from-bg-card to-bg-card-hover rounded-[2rem] p-6 lg:p-8 relative overflow-hidden border border-border-color shadow-sm group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent-purple opacity-5 blur-[100px] rounded-full mix-blend-screen group-hover:opacity-10 transition-opacity duration-700" />
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="p-2 bg-accent-purple/10 text-accent-purple rounded-xl"><Activity size={20} /></span>
                  <h2 className="font-bold text-text-secondary uppercase tracking-wider text-sm">Up Next</h2>
                </div>
                
                {nextSession ? (
                  <>
                    <h3 className="text-3xl lg:text-4xl font-black text-text-primary mb-2 line-clamp-2">
                      Training with {nextSession.trainerName}
                    </h3>
                    <p className="text-lg text-text-secondary mb-6 font-medium">
                      {new Date(nextSession.scheduledAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric'})} at {new Date(nextSession.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                ) : (
                  <>
                     <h3 className="text-3xl lg:text-4xl font-black text-text-primary mb-2">
                      No Session Scheduled
                    </h3>
                    <p className="text-lg text-text-secondary mb-6 font-medium">
                      Time for an independent workout!
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-3 mt-4">
                <Button size="lg" className="rounded-2xl flex-1 shadow-lg shadow-accent-purple/20" onClick={() => navigate('/search')}>
                  <Play size={18} fill="currentColor" className="mr-2" /> Start Workout
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats & Progress Block */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-bg-card rounded-[2rem] p-6 border border-border-color shadow-sm flex flex-col justify-between md:col-span-1 lg:col-span-1"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-text-secondary uppercase tracking-wider text-sm">Your Progress</h2>
              <Badge variant="purple">Lvl {level}</Badge>
            </div>
            
            <div className="flex-1 flex flex-col justify-center py-4">
               <div className="flex items-end gap-1 mb-1">
                 <span className="text-4xl font-black text-text-primary">{stats.xp.toLocaleString()}</span>
                 <span className="text-sm font-bold text-text-secondary mb-1">XP</span>
               </div>
               <XPBar />
               <p className="text-xs text-text-secondary mt-2 text-right">Keep pushing!</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
               <div className="bg-bg-primary rounded-2xl p-4 border border-border-color/50">
                  <Flame size={20} className="text-accent-orange mb-2" />
                  <p className="text-2xl font-black text-text-primary">{stats.currentStreak}</p>
                  <p className="text-xs text-text-secondary font-medium">Day Streak</p>
               </div>
               <div className="bg-bg-primary rounded-2xl p-4 border border-border-color/50">
                  <Calendar size={20} className="text-blue-500 mb-2" />
                  <p className="text-2xl font-black text-text-primary">{stats.totalSessions}</p>
                  <p className="text-xs text-text-secondary font-medium">Sessions</p>
               </div>
            </div>
          </motion.div>

          {/* Daily Tasks Block */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-bg-card rounded-[2rem] p-6 border border-border-color shadow-sm md:col-span-3 lg:col-span-1 row-span-2 flex flex-col"
          >
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className="text-accent-orange" />
                  <h2 className="font-bold text-text-primary">Daily Quests</h2>
                </div>
                <span className="text-xs font-bold text-text-secondary bg-bg-primary px-3 py-1 rounded-full">{dailyTasks.length} tasks</span>
             </div>

             <div className="space-y-3 flex-1 overflow-y-auto scrollbar-thin pr-1">
                {dailyTasks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2 py-8">
                    <Trophy size={40} className="text-text-secondary" />
                    <p className="text-sm font-medium">All caught up!</p>
                  </div>
                ) : dailyTasks.map(task => (
                  <div key={task.id} className="hover:scale-[1.02] transition-transform">
                    <DailyTaskCard task={task} />
                  </div>
                ))}
             </div>
          </motion.div>

          {/* AI Insights & Diet Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="md:col-span-2 lg:col-span-2 bg-gradient-to-r from-accent-purple/5 to-accent-teal/5 rounded-[2rem] p-6 border border-border-color shadow-sm"
          >
            <div className="flex flex-col md:flex-row gap-6 h-full">
              <div className="flex-1 space-y-3 relative z-10">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <Zap className="text-accent-purple" size={18} /> Daily AI Insights
                </h3>
                {workoutTip && (
                  <div className="flex items-start gap-3">
                    <Dumbbell size={16} className="text-accent-teal mt-1 shrink-0" />
                    <p className="text-sm text-text-secondary font-medium leading-relaxed">{workoutTip}</p>
                  </div>
                )}
                {dietTip && (
                  <div className="flex items-start gap-3">
                    <Utensils size={16} className="text-accent-orange mt-1 shrink-0" />
                    <p className="text-sm text-text-secondary font-medium leading-relaxed">{dietTip}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Quote Block */}
          <motion.div 
             initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
             className="bg-bg-primary rounded-[2rem] p-6 border border-border-color shadow-sm flex flex-col justify-center relative overflow-hidden group"
          >
             <div className="absolute top-4 left-4 text-6xl text-border-color font-serif leading-none opacity-50 select-none">"</div>
             <p className="text-text-primary font-medium italic relative z-10 text-sm leading-relaxed mb-3">
                {quote.quote || "The only bad workout is the one that didn't happen."}
             </p>
             <p className="text-xs font-bold text-accent-purple tracking-wide uppercase relative z-10">
                — {quote.author || "Unknown"}
             </p>
          </motion.div>
          
        </div>
      </div>
    </>
  )
}
