import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Users, Dumbbell, Calendar, Shield, FileCheck, CheckCircle, XCircle, Clock } from 'lucide-react'
import { adminApi } from '../../api/admin'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Avatar from '../../components/common/Avatar'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalUsers: 0, totalTrainers: 0, totalTrainees: 0, pendingApplications: 0, totalSessions: 0, activeSessions: 0 })
  const [applications, setApplications] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

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
      <Helmet><title>Admin Dashboard — Insta Coach</title></Helmet>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary flex items-center gap-2">
            <Shield size={24} className="text-accent-purple" /> Admin Dashboard
          </h1>
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

        <Card>
          <h2 className="font-bold text-text-primary mb-4">All Users ({users.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
                <div className="flex items-center gap-3">
                  <Avatar src={u.avatar} name={u.name} size="sm" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary flex items-center gap-2">{u.name} <Badge variant={u.role === 'admin' ? 'purple' : u.role === 'trainer' ? 'teal' : 'gray'} size="sm">{u.role}</Badge></p>
                    <p className="text-xs text-text-secondary">{u.email}</p>
                  </div>
                </div>
                {u.role !== 'admin' && (
                  u.isBanned ?
                    <Button size="sm" variant="ghost" onClick={() => handleUnban(u.id)}>Unban</Button> :
                    <Button size="sm" variant="ghost" onClick={() => handleBan(u.id)} className="!text-red-400">Ban</Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}
