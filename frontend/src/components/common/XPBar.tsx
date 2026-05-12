import { motion } from 'framer-motion'
import { useGamificationStore } from '../../store/gamificationStore'

interface XPBarProps {
  showLabels?: boolean
  compact?: boolean
}

export default function XPBar({ showLabels = true, compact = false }: XPBarProps) {
  const { xp, level, nextLevelXp, currentLevelXp } = useGamificationStore()

  const progress = nextLevelXp > 0
    ? ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
    : 0

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {showLabels && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded-full">
              Lvl {level}
            </span>
            <span className="text-xs text-text-secondary">
              {xp.toLocaleString()} XP
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            {nextLevelXp.toLocaleString()} XP
          </span>
        </div>
      )}
      <div
        className={`w-full bg-border-color rounded-full overflow-hidden ${compact ? 'h-1.5' : 'h-2.5'}`}
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Level ${level} progress: ${Math.round(progress)}%`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-accent-purple to-accent-teal"
        />
      </div>
    </div>
  )
}
