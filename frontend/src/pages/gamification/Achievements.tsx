/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Trophy, Star, Flame, Zap } from 'lucide-react'
import { gamificationApi, Achievement } from '../../api/gamification'
import AchievementCard from '../../components/gamification/AchievementCard'
import Card from '../../components/common/Card'
import Spinner from '../../components/common/Spinner'
import Badge from '../../components/common/Badge'

export default function Achievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    gamificationApi.getAchievements().then(setAchievements).catch(() => {}).finally(() => setIsLoading(false))
  }, [])

  const unlocked = achievements.filter(a => a.unlocked).length
  const categories = ['all', ...new Set(achievements.map(a => a.category))]
  const filtered = filter === 'all' ? achievements : achievements.filter(a => a.category === filter)

  return (
    <>
      <Helmet><title>Achievements — AbiliFit</title></Helmet>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary flex items-center gap-2">
            <Trophy size={28} className="text-accent-orange" /> Achievements
          </h1>
          <p className="text-text-secondary mt-1">{unlocked} of {achievements.length} unlocked</p>
        </motion.div>

        <Card className="bg-gradient-to-r from-accent-purple/10 to-accent-teal/10 border-accent-purple/20">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-black gradient-text">{unlocked}</p><p className="text-xs text-text-secondary">Unlocked</p></div>
            <div><p className="text-2xl font-black text-text-primary">{achievements.length - unlocked}</p><p className="text-xs text-text-secondary">Locked</p></div>
            <div><p className="text-2xl font-black text-accent-orange">{achievements.reduce((sum, a) => sum + (a.unlocked ? a.xpReward : 0), 0).toLocaleString()}</p><p className="text-xs text-text-secondary">XP Earned</p></div>
          </div>
        </Card>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Achievement categories">
          {categories.map(c => (
            <button key={c} role="tab" aria-selected={filter === c} onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${filter === c ? 'bg-accent-purple text-white border-accent-purple' : 'border-border-color text-text-secondary hover:border-accent-purple'}`}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a, i) => <AchievementCard key={a.id} achievement={a} index={i} />)}
          </div>
        )}
      </div>
    </>
  )
}
