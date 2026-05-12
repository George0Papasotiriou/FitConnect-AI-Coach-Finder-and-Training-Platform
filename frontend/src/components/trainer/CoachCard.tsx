import { motion } from 'framer-motion'
import { Star, DollarSign, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TrainerProfile } from '../../api/trainer'
import Avatar from '../common/Avatar'
import Badge from '../common/Badge'
import Button from '../common/Button'

interface CoachCardProps {
  trainer: TrainerProfile
  index?: number
}

export default function CoachCard({ trainer, index = 0 }: CoachCardProps) {
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="bg-bg-card border border-border-color rounded-2xl p-5 hover:border-accent-purple/40 transition-all flex flex-col gap-4"
    >
      <div className="flex items-start gap-4">
        <Avatar src={trainer.avatar} name={trainer.name} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text-primary truncate">{trainer.name}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-semibold text-text-primary">{trainer.rating.toFixed(1)}</span>
            <span className="text-xs text-text-secondary">({trainer.totalReviews})</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {trainer.experience}y exp
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={12} />
              ${trainer.hourlyRate}/hr
            </span>
          </div>
        </div>
      </div>

      <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">{trainer.bio}</p>

      <div className="flex flex-wrap gap-1.5">
        {trainer.specialties.slice(0, 3).map((s) => (
          <Badge key={s} variant="purple" size="sm">{s}</Badge>
        ))}
        {trainer.specialties.length > 3 && (
          <Badge variant="gray" size="sm">+{trainer.specialties.length - 3}</Badge>
        )}
      </div>

      <Button
        onClick={() => navigate(`/coach/${trainer.userId}`)}
        fullWidth
        size="sm"
        aria-label={`View ${trainer.name}'s profile`}
      >
        View Profile
      </Button>
    </motion.div>
  )
}
