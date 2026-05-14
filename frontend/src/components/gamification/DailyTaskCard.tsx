/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { motion } from 'framer-motion'
import { CheckCircle, Circle } from 'lucide-react'
import type { DailyTask } from '../../api/gamification'
import { useGamification } from '../../hooks/useGamification'

interface DailyTaskCardProps {
  task: DailyTask
}

export default function DailyTaskCard({ task }: DailyTaskCardProps) {
  const { completeTask, isCompletingTask } = useGamification()

  return (
    <motion.div
      layout
      className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
        task.completed
          ? 'bg-accent-teal/5 border-accent-teal/20 opacity-70'
          : 'bg-bg-card border-border-color hover:border-accent-purple/30'
      }`}
    >
      <button
        onClick={() => !task.completed && completeTask(task.id)}
        disabled={task.completed || isCompletingTask}
        className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-full"
        aria-label={task.completed ? `${task.title} - completed` : `Mark "${task.title}" as complete`}
        aria-pressed={task.completed}
      >
        {task.completed ? (
          <CheckCircle size={24} className="text-accent-teal" />
        ) : (
          <Circle size={24} className="text-text-secondary hover:text-accent-purple transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${task.completed ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
          {task.title}
        </p>
        <p className="text-xs text-text-secondary truncate">{task.description}</p>
      </div>

      <div className="flex-shrink-0 px-2.5 py-1 bg-accent-purple/10 rounded-full">
        <span className="text-xs font-bold text-accent-purple">+{task.xpReward} XP</span>
      </div>
    </motion.div>
  )
}
