import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { MessageCircle, Video, Calendar, Star, User } from 'lucide-react'
import { traineeApi } from '../../api/trainee'
import { chatApi } from '../../api/chat'
import Avatar from '../../components/common/Avatar'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import { toast } from 'sonner'

export default function MyCoach() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    traineeApi.getProfile().then(p => { setProfile(p); return traineeApi.getUpcomingSessions() }).then(setSessions).catch(() => {}).finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  if (!profile?.currentCoach) {
    return (
      <>
        <Helmet><title>My Coach — Insta Coach</title></Helmet>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-accent-purple/10 rounded-full flex items-center justify-center mb-6"><User size={40} className="text-accent-purple" /></div>
          <h1 className="text-2xl font-black text-text-primary mb-2">No Coach Yet</h1>
          <p className="text-text-secondary mb-6 max-w-md">Find a certified coach that matches your goals and start your transformation.</p>
          <Button onClick={() => navigate('/search')} size="lg">Find a Coach</Button>
        </div>
      </>
    )
  }

  const coach = profile.currentCoach

  const handleMessage = async () => {
    try {
      const conv = await chatApi.createConversation(coach.id)
      navigate(`/chat/${conv.id}`)
    } catch { toast.error('Failed to open chat') }
  }

  return (
    <>
      <Helmet><title>My Coach — Insta Coach</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-text-primary mb-1">My <span className="gradient-text">Coach</span></h1>
        </motion.div>

        <Card>
          <div className="flex items-center gap-4 mb-4">
            <Avatar src={coach.avatar} name={coach.name} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-text-primary">{coach.name}</h2>
              <Badge variant="teal">Your Coach</Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button onClick={handleMessage} size="sm" variant="secondary" leftIcon={<MessageCircle size={16} />}>Chat</Button>
            <Button onClick={() => navigate(`/coach/${coach.id}`)} size="sm" variant="ghost" leftIcon={<Star size={16} />}>Profile</Button>
            <Button onClick={() => {
              traineeApi.requestInstantSession(coach.id).then(r => navigate(`/call/${r.sessionId}?initiator=true`)).catch(() => toast.error('Failed'))
            }} size="sm" variant="teal" leftIcon={<Video size={16} />}>Workout Now</Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2"><Calendar size={16} className="text-accent-purple" /> Upcoming Sessions</h3>
          {sessions.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">No upcoming sessions scheduled</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{new Date(s.scheduledAt).toLocaleDateString()}</p>
                    <p className="text-xs text-text-secondary">{new Date(s.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/call/${s.id}?initiator=true`)}>Join</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
