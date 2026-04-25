import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Trophy, Flame, Zap, Calendar, TrendingUp, Sparkles, Utensils, Dumbbell } from 'lucide-react'
import { traineeApi } from '../../api/trainee'
import { useGamificationStore } from '../../store/gamificationStore'
import { useGamification } from '../../hooks/useGamification'
import { useAuthStore } from '../../store/authStore'
import Card from '../../components/common/Card'
import XPBar from '../../components/common/XPBar'
import DailyTaskCard from '../../components/gamification/DailyTaskCard'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { useNavigate } from 'react-router-dom'
import { aiApi } from '../../api/ai'

export default function TraineeDashboard() {
  const { user } = useAuthStore()
  const { xp, level, streak, dailyTasks } = useGamificationStore()
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

  const statCards = [
    { label: 'Level', value: stats.level, icon: <Zap size={20} />, color: 'from-accent-purple to-purple-600' },
    { label: 'Total XP', value: stats.xp.toLocaleString(), icon: <TrendingUp size={20} />, color: 'from-accent-teal to-teal-600' },
    { label: 'Streak', value: `${stats.currentStreak} days`, icon: <Flame size={20} />, color: 'from-accent-orange to-orange-600' },
    { label: 'Sessions', value: stats.totalSessions, icon: <Calendar size={20} />, color: 'from-blue-500 to-blue-700' },
  ]

  return (
    <>
      <Helmet><title>Dashboard — FitConnect</title></Helmet>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-1">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-text-secondary">Let's crush those goals today!</p>
        </motion.div>

        {quote.quote && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-4 border-l-4 border-accent-purple">
            <p className="text-text-primary italic text-sm">"{quote.quote}"</p>
            <p className="text-xs text-accent-purple mt-1">— {quote.author}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${s.color} opacity-10 rounded-full -translate-y-1/2 translate-x-1/2`} />
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>
                  {s.icon}
                </div>
                <p className="text-2xl font-black text-text-primary">{s.value}</p>
                <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-text-primary flex items-center gap-2"><Zap size={18} className="text-accent-purple" /> XP Progress</h2>
            <Badge variant="purple">Level {level}</Badge>
          </div>
          <XPBar />
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-accent-orange" /> Daily Tasks
            </h2>
            <div className="space-y-3">
              {dailyTasks.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-4">No tasks for today. Check back tomorrow!</p>
              ) : dailyTasks.map(task => <DailyTaskCard key={task.id} task={task} />)}
            </div>
          </Card>

          <div className="space-y-4">
            {workoutTip && (
              <Card className="border-accent-teal/20">
                <h3 className="font-bold text-text-primary mb-2 flex items-center gap-2">
                  <Dumbbell size={16} className="text-accent-teal" /> AI Workout Tip
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{workoutTip}</p>
              </Card>
            )}
            {dietTip && (
              <Card className="border-accent-orange/20">
                <h3 className="font-bold text-text-primary mb-2 flex items-center gap-2">
                  <Utensils size={16} className="text-accent-orange" /> Nutrition Tip
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{dietTip}</p>
              </Card>
            )}
            <Card>
              <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                <Calendar size={16} className="text-accent-purple" /> Upcoming Sessions
              </h3>
              {upcoming.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-text-secondary mb-3">No upcoming sessions</p>
                  <Button size="sm" onClick={() => navigate('/search')}>Find a Coach</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.slice(0, 3).map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{s.trainerName}</p>
                        <p className="text-xs text-text-secondary">{new Date(s.scheduledAt).toLocaleDateString()} at {new Date(s.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <Badge variant="teal" size="sm">{s.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}
