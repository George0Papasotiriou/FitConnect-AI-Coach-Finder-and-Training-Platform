import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Dumbbell, Calendar, Shield, FileCheck, CheckCircle, XCircle, Clock, Sparkles } from 'lucide-react'
import { adminApi } from '../../api/admin'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Avatar from '../../components/common/Avatar'
import AIDataAgent from '../../components/admin/AIDataAgent'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalTrainers: 0, totalTrainees: 0, pendingApplications: 0, totalSessions: 0, activeSessions: 0 })
  const [applications, setApplications] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [showAIAgent, setShowAIAgent] = useState(false)

  useEffect(() => {
    adminApi.getStats().then(setStats).catch(() => {})
    adminApi.getApplications('pending').then(setApplications).catch(() => {})
    adminApi.getUsers().then(setUsers).catch(() => {})
  }, [])

  const handleApprove = async (id: string) => {
    try { await adminApi.approveApplication(id, 'Approved by admin'); setApplications(prev => prev.filter(a => a.id !== id)); setStats(prev => ({ ...prev, pendingApplications: prev.pendingApplications - 1 })); toast.success('Application approved!') } catch { toast.error('Failed') }
  }
  const handleReject = async (id: string) => {
    try { await adminApi.rejectApplication(id, 'Does not meet requirements'); setApplications(prev => prev.filter(a => a.id !== id)); setStats(prev => ({ ...prev, pendingApplications: prev.pendingApplications - 1 })); toast.success('Application rejected') } catch { toast.error('Failed') }
  }
  const handleBan = async (userId: string) => {
    try { await adminApi.banUser(userId, 'Violation of terms'); setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: true } : u)); toast.success('User banned') } catch { toast.error('Failed') }
  }
  const handleUnban = async (userId: string) => {
    try { await adminApi.unbanUser(userId); setUsers(prev => prev.map(u => u.id === userId ? { ...u, isBanned: false } : u)); toast.success('User unbanned') } catch { toast.error('Failed') }
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={20} />, color: 'from-accent-purple to-purple-600' },
    { label: 'Trainers', value: stats.totalTrainers, icon: <Dumbbell size={20} />, color: 'from-accent-teal to-teal-600' },
    { label: 'Trainees', value: stats.totalTrainees, icon: <Users size={20} />, color: 'from-blue-500 to-blue-700' },
    { label: 'Pending Apps', value: stats.pendingApplications, icon: <FileCheck size={20} />, color: 'from-accent-orange to-orange-600' },
  ]

  return (
    <>
      <Helmet><title>Admin Dashboard — AbiliFit</title></Helmet>
      
      <AnimatePresence mode="wait">
        {showAIAgent ? (
          <motion.div
            key="ai-data-agent"
            initial={{ opacity: 0, scale: 0.97, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.97, filter: 'blur(10px)' }}
            transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
            className="fixed inset-0 z-50 overflow-hidden bg-[#06060c]"
          >
            <AIDataAgent onExit={() => setShowAIAgent(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="standard-dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Header Actions Grid */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-text-primary flex items-center gap-2">
                  <Shield size={24} className="text-accent-purple" /> Admin Dashboard
                </h1>
                <p className="text-xs text-text-secondary mt-1">
                  Manage applications, moderate users, and run advanced database analytics.
                </p>
              </div>

              {/* Sparkles Launch Button */}
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="self-start sm:self-auto">
                <Button
                  onClick={() => setShowAIAgent(true)}
                  leftIcon={<Sparkles size={16} className="text-white animate-pulse" />}
                  className="bg-gradient-to-r from-accent-purple via-indigo-600 to-accent-teal hover:opacity-90 text-white font-bold tracking-tight rounded-full px-5 py-2.5 shadow-lg border-0 cursor-pointer"
                >
                  AI Analytics Agent
                </Button>
              </motion.div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {statCards.map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card>
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-3`}>{s.icon}</div>
                    <p className="text-2xl font-black text-text-primary">{s.value}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{s.label}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Application review section */}
            {applications.length > 0 && (
              <Card>
                <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">Pending Applications <Badge variant="orange">{applications.length}</Badge></h2>
                <div className="space-y-3">
                  {applications.map(app => (
                    <div key={app.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl">
                      <div className="flex items-center gap-3">
                        <Avatar src={app.avatar} name={app.name} size="md" />
                        <div>
                          <p className="font-semibold text-text-primary">{app.name}</p>
                          <p className="text-xs text-text-secondary">{app.experience}y exp • ${app.hourlyRate}/hr • {app.specialties?.join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(app.id)} leftIcon={<CheckCircle size={14} />}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleReject(app.id)} leftIcon={<XCircle size={14} />}>Reject</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* High-Privilege Sensitive All Users Database Table */}
            <Card>
              <h2 className="font-bold text-text-primary mb-4">All Registered Users ({users.length})</h2>
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {users.map(u => (
                  <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-bg-primary hover:bg-bg-primary/80 rounded-xl gap-3 border border-border-color/10 transition-colors">
                    <div className="flex items-start sm:items-center gap-3">
                      <Avatar src={u.avatar} name={u.name} size="sm" />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-text-primary leading-tight">{u.name}</p>
                          <Badge variant={u.role === 'admin' ? 'purple' : u.role === 'trainer' ? 'teal' : 'gray'} size="sm">
                            {u.role}
                          </Badge>
                          {u.isBanned && (
                            <Badge variant="red" size="sm">
                              Banned
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-secondary leading-normal">{u.email}</p>
                        
                        {/* High-fidelity sensitive User Metrics */}
                        <p className="text-[11px] text-text-secondary flex flex-wrap items-center gap-1.5 mt-1 opacity-80">
                          <span className="font-semibold text-indigo-500">Level {u.level || 1}</span>
                          <span>•</span>
                          <span>{u.xp || 0} XP</span>
                          <span>•</span>
                          <span className="text-orange-500 font-semibold">🔥 {u.streak || 0} day streak</span>
                        </p>
                      </div>
                    </div>
                    
                    {u.role !== 'admin' && (
                      <div className="self-end sm:self-auto flex items-center gap-2">
                        {u.isBanned ? (
                          <Button size="sm" variant="ghost" onClick={() => handleUnban(u.id)} className="hover:bg-green-500/10 hover:text-green-500">
                            Unban User
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleBan(u.id)} className="!text-red-400 hover:bg-red-500/10">
                            Ban User
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
