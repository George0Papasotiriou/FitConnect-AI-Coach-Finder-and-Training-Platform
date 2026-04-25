import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Star, Clock, DollarSign, Video, MessageCircle, ChevronRight, Award, MapPin } from 'lucide-react'
import { trainerApi, TrainerProfile } from '../../api/trainer'
import { traineeApi } from '../../api/trainee'
import { chatApi } from '../../api/chat'
import Avatar from '../../components/common/Avatar'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import StarRating from '../../components/common/StarRating'
import Spinner from '../../components/common/Spinner'
import { toast } from 'sonner'

export default function CoachProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trainer, setTrainer] = useState<TrainerProfile | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRequesting, setIsRequesting] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      trainerApi.getById(id).then(setTrainer),
      trainerApi.getReviews(id).then(setReviews)
    ]).catch(() => {}).finally(() => setIsLoading(false))
  }, [id])

  const handleRequest = async () => {
    if (!id) return
    setIsRequesting(true)
    try {
      await traineeApi.requestCoach(id)
      toast.success('Request sent! The coach will review your profile.')
    } catch { toast.error('Failed to send request') }
    setIsRequesting(false)
  }

  const handleInstantSession = async () => {
    if (!id) return
    try {
      const { sessionId } = await traineeApi.requestInstantSession(id)
      navigate(`/call/${sessionId}`)
    } catch { toast.error('Failed to start session') }
  }

  const handleMessage = async () => {
    if (!id) return
    try {
      const conv = await chatApi.createConversation(id)
      navigate(`/chat/${conv.id}`)
    } catch { toast.error('Failed to start conversation') }
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!trainer) return <div className="text-center py-20 text-text-secondary">Trainer not found</div>

  return (
    <>
      <Helmet><title>{trainer.name} — FitConnect</title></Helmet>
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-accent-purple to-accent-teal opacity-20" />
            <div className="relative flex flex-col sm:flex-row items-start gap-6 pt-8">
              <Avatar src={trainer.avatar} name={trainer.name} size="xl" />
              <div className="flex-1">
                <h1 className="text-2xl font-black text-text-primary">{trainer.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Star size={16} className="fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-text-primary">{trainer.rating.toFixed(1)}</span>
                  <span className="text-xs text-text-secondary">({trainer.totalReviews} reviews)</span>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 text-sm text-text-secondary">
                  <span className="flex items-center gap-1"><Clock size={14} /> {trainer.experience}y experience</span>
                  <span className="flex items-center gap-1"><DollarSign size={14} /> ${trainer.hourlyRate}/hr</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {trainer.specialties.map(s => <Badge key={s} variant="purple" size="sm">{s}</Badge>)}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Button onClick={handleRequest} isLoading={isRequesting} fullWidth rightIcon={<ChevronRight size={16} />}>Request Coach</Button>
          <Button variant="teal" onClick={handleInstantSession} fullWidth leftIcon={<Video size={16} />}>Workout Now</Button>
          <Button variant="secondary" onClick={handleMessage} fullWidth leftIcon={<MessageCircle size={16} />}>Message</Button>
        </div>

        <Card>
          <h2 className="font-bold text-text-primary mb-3 flex items-center gap-2"><Award size={18} className="text-accent-purple" /> About</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{trainer.bio}</p>
        </Card>

        {trainer.credentials && trainer.credentials.length > 0 && (
          <Card>
            <h2 className="font-bold text-text-primary mb-3">Credentials</h2>
            <div className="flex flex-wrap gap-2">
              {trainer.credentials.map((c, i) => <Badge key={i} variant="teal" size="md">{c}</Badge>)}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Star size={18} className="text-yellow-400" /> Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {reviews.slice(0, 10).map((r: any) => (
                <div key={r.id} className="flex gap-3 p-3 bg-bg-primary rounded-xl">
                  <Avatar src={r.reviewerAvatar} name={r.reviewerName} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-primary">{r.reviewerName}</p>
                      <StarRating value={r.rating} readonly size={14} />
                    </div>
                    {r.comment && <p className="text-sm text-text-secondary mt-1">{r.comment}</p>}
                    <p className="text-xs text-text-secondary mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
