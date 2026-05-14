/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { Achievement } from '../../api/gamification'

interface AchievementCardProps {
  achievement: Achievement
  index?: number
}

export default function AchievementCard({ achievement, index = 0 }: AchievementCardProps) {
  const progress = achievement.maxProgress > 0
    ? (achievement.progress / achievement.maxProgress) * 100
    : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative p-5 rounded-2xl border transition-all ${
        achievement.unlocked
          ? 'bg-bg-card border-accent-purple/30 hover:border-accent-purple/60'
          : 'bg-bg-card/50 border-border-color opacity-70'
      }`}
    >
      {!achievement.unlocked && (
        <div className="absolute inset-0 rounded-2xl bg-bg-primary/40 flex items-center justify-center z-10">
          <Lock size={24} className="text-text-secondary" />
        </div>
      )}

      <div className={`text-4xl mb-3 ${achievement.unlocked ? '' : 'grayscale'}`}>
        {achievement.icon}
      </div>

      <h3 className="font-bold text-sm text-text-primary mb-1">{achievement.name}</h3>
      <p className="text-xs text-text-secondary mb-3 leading-relaxed">{achievement.description}</p>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-secondary">
            {achievement.progress}/{achievement.maxProgress}
          </span>
          <span className="text-accent-purple font-medium">+{achievement.xpReward} XP</span>
        </div>
        <div className="h-1.5 bg-border-color rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 1, delay: index * 0.05 + 0.3 }}
            className={`h-full rounded-full ${
              achievement.unlocked
                ? 'bg-gradient-to-r from-accent-purple to-accent-teal'
                : 'bg-text-secondary'
            }`}
          />
        </div>
      </div>

      {achievement.unlocked && achievement.unlockedAt && (
        <p className="text-xs text-accent-teal mt-2">✓ Unlocked</p>
      )}
    </motion.div>
  )
}
