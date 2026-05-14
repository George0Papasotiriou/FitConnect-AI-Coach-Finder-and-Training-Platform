/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Users, Calendar, Star, DollarSign, TrendingUp, Dumbbell, LayoutDashboard, History, Sparkles, Lightbulb, BrainCircuit, Plus, Send, Trash2 } from 'lucide-react'
import { trainerApi } from '../../api/trainer'
import { useAuthStore } from '../../store/authStore'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'
import { toast } from 'sonner'
import CheckoutModal from '../../components/payment/CheckoutModal'
import ProgramBuilder from '../../components/trainer/ProgramBuilder'

export default function TrainerDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalClients: 0, sessionsThisWeek: 0, averageRating: 0, earnings: 0 })
  const [clients, setClients] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])

  const [showSubscription, setShowSubscription] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'programs'>('overview')
  const [aiInsight, setAiInsight] = useState<string>('')
  const [loadingInsight, setLoadingInsight] = useState(false)
  const [programs, setPrograms] = useState<any[]>([])
  const [selectedProgram, setSelectedProgram] = useState<any | null>(null)

  useEffect(() => {
    trainerApi.getStats().then(setStats).catch(() => {})
    trainerApi.getClients().then(setClients).catch(() => {})
    trainerApi.getSessions().then(setSessions).catch(() => {})
    fetchPrograms()
    
    apiClient.get('/billing/info').then(res => {
      if (!res.data.subscriptionActive) setShowSubscription(true)
    }).catch(() => {})

    fetchAIInsight()
  }, [])

  const fetchPrograms = async () => {
    try {
      const res = await apiClient.get('/programs')
      setPrograms(res.data)
    } catch (err) {}
  }

  const fetchAIInsight = async () => {
    setLoadingInsight(true)
    try {
      const res = await apiClient.post('/ai/chat', { 
        message: "You are an expert fitness business consultant. Provide one powerful, short coaching tip for a trainer to improve client results or retention today. Respond with ONLY the tip in a single paragraph.",
        history: []
      })
      setAiInsight(res.data.response)
    } catch (err) {
      setAiInsight("Consider reviewing your upcoming sessions to prepare personalized drills for each client.")
    } finally {
      setLoadingInsight(false)
    }
  }

  const pendingRequests = clients.filter(c => c.status === 'pending')
  const upcomingSessions = sessions.filter((s: any) => s.status === 'scheduled')

  const statCards = [
    { label: 'Active Clients', value: stats.totalClients, icon: <Users size={20} />, color: 'from-accent-purple to-purple-600' },
    { label: 'This Week', value: `${stats.sessionsThisWeek} sessions`, icon: <Calendar size={20} />, color: 'from-accent-teal to-teal-600' },
    { label: 'Rating', value: stats.averageRating.toFixed(1), icon: <Star size={20} />, color: 'from-yellow-500 to-amber-600' },
    { label: 'Earnings', value: `€${stats.earnings.toLocaleString()}`, icon: <DollarSign size={20} />, color: 'from-green-500 to-emerald-600' },
  ]

  return (
    <>
      <Helmet><title>Trainer Dashboard — Insta Coach</title></Helmet>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-1">
              Hey, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 💪
            </h1>
            <p className="text-text-secondary">Here's your coaching overview</p>
          </div>
          <div className="flex bg-bg-card p-1 rounded-2xl border border-line-color self-start md:self-auto">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-accent-purple text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <LayoutDashboard size={18} /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('programs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'programs' ? 'bg-accent-purple text-white shadow-lg' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Dumbbell size={18} /> Programs
            </button>
          </div>
        </motion.div>

        {activeTab === 'overview' ? (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="bg-gradient-to-br from-bg-card to-accent-purple/5 border-accent-purple/20 overflow-hidden relative group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-accent-purple/10 rounded-full blur-2xl group-hover:bg-accent-purple/20 transition-all" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center text-accent-purple flex-shrink-0 animate-pulse">
                    <BrainCircuit size={24} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-text-primary">AI Client Insights</h3>
                      <Badge variant="teal">Pro</Badge>
                    </div>
                    {loadingInsight ? (
                      <div className="space-y-2">
                        <div className="h-4 w-48 bg-line-color animate-pulse rounded-full" />
                        <div className="h-4 w-32 bg-line-color animate-pulse rounded-full" />
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary leading-relaxed">{aiInsight}</p>
                    )}
                    <div className="flex items-center gap-4 pt-2">
                      <Button size="sm" variant="ghost" className="!p-0 !text-xs !h-auto text-accent-purple" onClick={fetchAIInsight}>
                        Refresh insight
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {statCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 + 0.3 }}>
                  <Card className="relative group">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>{s.icon}</div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-black text-text-primary">{s.value}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
                      </div>
                      {s.label === 'Earnings' && (
                        <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity !py-1 !px-2 text-[10px]" onClick={() => toast.info('Withdrawal feature coming soon!')}>
                          Withdraw
                        </Button>
                      )}
                    </div>
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
                        <Button size="sm" variant="teal" onClick={() => navigate(`/call/${s.id}?initiator=true`)}>Start</Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {!selectedProgram ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black text-text-primary">Your Training Programs</h2>
                  <Button onClick={() => setSelectedProgram({ name: 'New Program', description: '', days: [] })}>
                    <Plus className="mr-2" size={18} /> Create New Program
                  </Button>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {programs.map((prog: any) => (
                    <Card key={prog.id} className="hover:border-accent-purple/50 transition-all cursor-pointer group" onClick={() => setSelectedProgram(prog)}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                          <History size={20} />
                        </div>
                        <Badge variant="purple">{prog.days?.length || 0} Days</Badge>
                      </div>
                      <h3 className="font-bold text-text-primary group-hover:text-accent-purple transition-colors">{prog.name}</h3>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{prog.description}</p>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-[10px] text-text-secondary">Updated {new Date(prog.updatedAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="!p-1 text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Delete this program?')) {
                                        apiClient.delete(`/programs/${prog.id}`).then(() => fetchPrograms());
                                    }
                                }}
                            >
                                <Trash2 size={14} />
                            </Button>
                            <Send size={14} className="text-accent-purple opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </Card>
                  ))}
                  {programs.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-bg-card rounded-3xl border-2 border-dashed border-line-color">
                      <Dumbbell className="mx-auto text-text-secondary mb-4 opacity-20" size={48} />
                      <p className="text-text-secondary">You haven't created any programs yet.</p>
                      <Button variant="ghost" onClick={() => setSelectedProgram({ name: 'New Program', description: '', days: [] })} className="mt-4">
                        Start with your first program
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedProgram(null); fetchPrograms(); }}>
                        ← Back to List
                    </Button>
                    <h2 className="text-xl font-bold text-text-primary">Editing: {selectedProgram.name}</h2>
                </div>
                <Card className="!p-8">
                  <ProgramBuilder 
                    program={selectedProgram} 
                    onSave={() => {
                        fetchPrograms();
                        setSelectedProgram(null);
                    }} 
                  />
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <CheckoutModal
        isOpen={showSubscription}
        onClose={() => {}} 
        onSuccess={() => setShowSubscription(false)}
        type="subscription"
        amount={15}
      />
    </>
  )
}
