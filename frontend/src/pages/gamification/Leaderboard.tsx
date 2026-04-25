import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { Trophy, Calendar } from 'lucide-react'
import { gamificationApi, LeaderboardEntry } from '../../api/gamification'
import { useAuthStore } from '../../store/authStore'
import Card from '../../components/common/Card'
import LeaderboardRow from '../../components/gamification/LeaderboardRow'
import Spinner from '../../components/common/Spinner'

const periods = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all-time', label: 'All Time' },
] as const;

export default function Leaderboard() {
  const { user } = useAuthStore()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all-time'>('weekly')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    gamificationApi.getLeaderboard(period).then(setEntries).catch(() => {}).finally(() => setIsLoading(false))
  }, [period])

  return (
    <>
      <Helmet><title>Leaderboard — Insta Coach</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-black text-text-primary flex items-center gap-2">
            <Trophy size={28} className="text-accent-orange" /> Leaderboard
          </h1>
          <div className="flex items-center gap-3 bg-bg-card border border-border-color px-4 py-2 rounded-2xl">
            <div className={`w-3 h-3 rounded-full bg-accent-teal shadow-[0_0_8px_var(--accent-teal)]`} />
            <div>
              <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest leading-none mb-1">Current League</p>
              <p className="text-sm font-black text-text-primary leading-none">Iron Vanguard</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 bg-bg-card border border-border-color rounded-xl p-1" role="tablist">
          {periods.map(p => (
            <button key={p.value} role="tab" aria-selected={period === p.value} onClick={() => setPeriod(p.value)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${period === p.value ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {p.label}
            </button>
          ))}
        </div>

        <Card padding="sm">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-text-secondary">No entries yet</div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, i) => <LeaderboardRow key={entry.userId} entry={entry} isCurrentUser={entry.userId === user?.id} index={i} />)}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
