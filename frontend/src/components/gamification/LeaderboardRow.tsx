import { motion } from 'framer-motion'
import type { LeaderboardEntry } from '../../api/gamification'
import Avatar from '../common/Avatar'

interface LeaderboardRowProps {
  entry: LeaderboardEntry
  isCurrentUser: boolean
  index: number
}

const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600']
const rankBg = ['bg-yellow-400/10 border-yellow-400/30', 'bg-slate-300/10 border-slate-300/30', 'bg-amber-600/10 border-amber-600/30']
const rankEmoji = ['🥇', '🥈', '🥉']

export default function LeaderboardRow({ entry, isCurrentUser, index }: LeaderboardRowProps) {
  const isTop3 = entry.rank <= 3

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
        isCurrentUser
          ? 'bg-accent-purple/10 border-accent-purple/40 ring-1 ring-accent-purple/30'
          : isTop3
            ? `${rankBg[entry.rank - 1]} border`
            : 'bg-bg-card border-border-color hover:border-border-color/80'
      }`}
      aria-current={isCurrentUser ? 'true' : undefined}
    >
      <div className={`w-10 text-center font-black text-lg flex-shrink-0 ${isTop3 ? rankColors[entry.rank - 1] : 'text-text-secondary'}`}>
        {isTop3 ? rankEmoji[entry.rank - 1] : `#${entry.rank}`}
      </div>

      <Avatar src={entry.avatar} name={entry.name} size="sm" />

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-accent-purple' : 'text-text-primary'}`}>
          {entry.name} {isCurrentUser && '(You)'}
        </p>
        <p className="text-xs text-text-secondary">{entry.achievements} achievements</p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-bold text-sm gradient-text">{entry.xp.toLocaleString()} XP</p>
        <p className="text-xs text-text-secondary">Level {entry.level}</p>
      </div>
    </motion.div>
  )
}
