import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Users, Calendar, Star, DollarSign, TrendingUp } from 'lucide-react'
import { trainerApi } from '../../api/trainer'
import { useAuthStore } from '../../store/authStore'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { useNavigate } from 'react-router-dom'

export default function TrainerDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalClients: 0, sessionsThisWeek: 0, averageRating: 0, earnings: 0 })
  const [clients, setClients] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    trainerApi.getStats().then(setStats).catch(() => {})
    trainerApi.getClients().then(setClients).catch(() => {})
    trainerApi.getSessions().then(setSessions).catch(() => {})
  }, [])

  const pendingRequests = clients.filter(c => c.status === 'pending')
  const upcomingSessions = sessions.filter((s: any) => s.status === 'scheduled')

  const statCards = [
    { label: 'Active Clients', value: stats.totalClients, icon: <Users size={20} />, color: 'from-accent-purple to-purple-600' },
    { label: 'This Week', value: `${stats.sessionsThisWeek} sessions`, icon: <Calendar size={20} />, color: 'from-accent-teal to-teal-600' },
    { label: 'Rating', value: stats.averageRating.toFixed(1), icon: <Star size={20} />, color: 'from-yellow-500 to-amber-600' },
    { label: 'Earnings', value: `$${stats.earnings.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'from-green-500 to-emerald-600' },
  ]

  return (
    <>
      <Helmet><title>Trainer Dashboard — FitConnect</title></Helmet>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-1">
            Hey, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 💪
          </h1>
          <p className="text-text-secondary">Here's your coaching overview</p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>{s.icon}</div>
                <p className="text-2xl font-black text-text-primary">{s.value}</p>
                <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-text-primary">Pending Requests</h2>
              {pendingRequests.length > 0 && <Badge variant="orange">{pendingRequests.length} new</Badge>}
            </div>
            {pendingRequests.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No pending requests</p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple font-bold text-sm">{r.trainee.name?.[0]}</div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{r.trainee.name}</p>
                        <p className="text-xs text-text-secondary">{r.trainee.fitnessLevel} • {r.trainee.goals?.join(', ')}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => navigate('/trainer/clients')}>Review</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-bold text-text-primary mb-4">Upcoming Sessions</h2>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">No upcoming sessions</p>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.slice(0, 5).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{s.traineeName}</p>
                      <p className="text-xs text-text-secondary">{new Date(s.scheduledAt).toLocaleDateString()} at {new Date(s.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <Button size="sm" variant="teal" onClick={() => navigate(`/call/${s.id}`)}>Start</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
