import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Check, X, MessageCircle } from 'lucide-react'
import { trainerApi } from '../../api/trainer'
import { chatApi } from '../../api/chat'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import { toast } from 'sonner'

export default function TrainerClients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => { trainerApi.getClients().then(setClients).catch(() => {}) }, [])

  const pending = clients.filter(c => c.status === 'pending')
  const accepted = clients.filter(c => c.status === 'accepted')

  const handleAccept = async (id: string) => {
    try { await trainerApi.acceptClient(id); setClients(prev => prev.map(c => c.id === id ? { ...c, status: 'accepted' } : c)); toast.success('Client accepted!') } catch { toast.error('Failed') }
  }
  const handleReject = async (id: string) => {
    try { await trainerApi.rejectClient(id); setClients(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c)); toast.success('Request declined') } catch { toast.error('Failed') }
  }
  const handleMessage = async (traineeId: string) => {
    try { const conv = await chatApi.createConversation(traineeId); navigate(`/chat/${conv.id}`) } catch { toast.error('Failed') }
  }

  return (
    <>
      <Helmet><title>Clients — FitConnect</title></Helmet>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-text-primary">My <span className="gradient-text">Clients</span></h1>
        </motion.div>

        {pending.length > 0 && (
          <Card>
            <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">Pending Requests <Badge variant="orange">{pending.length}</Badge></h2>
            <div className="space-y-3">
              {pending.map(r => (
                <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl">
                  <div className="flex items-center gap-3">
                    <Avatar src={r.trainee.avatar} name={r.trainee.name} size="md" />
                    <div>
                      <p className="font-semibold text-text-primary">{r.trainee.name}</p>
                      <p className="text-xs text-text-secondary">{r.trainee.fitnessLevel} • {r.trainee.goals?.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAccept(r.id)} leftIcon={<Check size={14} />}>Accept</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleReject(r.id)} leftIcon={<X size={14} />}>Decline</Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-bold text-text-primary mb-4">Active Clients ({accepted.length})</h2>
          {accepted.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">No active clients yet. New requests will appear here.</p>
          ) : (
            <div className="space-y-3">
              {accepted.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl">
                  <div className="flex items-center gap-3">
                    <Avatar src={r.trainee.avatar} name={r.trainee.name} size="md" />
                    <div>
                      <p className="font-semibold text-text-primary">{r.trainee.name}</p>
                      <div className="flex gap-1 mt-0.5">{r.trainee.goals?.map((g: string) => <Badge key={g} variant="purple" size="sm">{g}</Badge>)}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => handleMessage(r.trainee.id)} leftIcon={<MessageCircle size={14} />}>Chat</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
