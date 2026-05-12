import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import {
  Search, Filter, X, Dumbbell, Heart, Brain, Flame, Trophy,
  Apple, ChevronRight, Sparkles, Users, Monitor, MapPin, ArrowLeft
} from 'lucide-react'
import { trainerApi, TrainerProfile } from '../../api/trainer'
import { traineeApi } from '../../api/trainee'
import { useOnlineStore } from '../../store/onlineStore'
import CoachCard from '../../components/trainer/CoachCard'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import Button from '../../components/common/Button'
import { toast } from 'sonner'

const CATEGORIES = [
  {
    id: 'sport',
    label: 'Sport-Specific',
    icon: <Trophy size={22} />,
    color: 'from-orange-500 to-amber-500',
    bg: 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/60',
    subcategories: ['Football', 'Basketball', 'Tennis', 'Swimming', 'Athletics', 'CrossFit', 'Boxing', 'MMA']
  },
  {
    id: 'strength',
    label: 'Strength & Body',
    icon: <Dumbbell size={22} />,
    color: 'from-purple-500 to-indigo-500',
    bg: 'bg-accent-purple/10 border-accent-purple/30 hover:border-accent-purple/60',
    subcategories: ['Strength Training', 'Bodybuilding', 'Powerlifting', 'Calisthenics', 'Functional Training']
  },
  {
    id: 'mind',
    label: 'Mind & Body',
    icon: <Brain size={22} />,
    color: 'from-teal-500 to-cyan-500',
    bg: 'bg-accent-teal/10 border-accent-teal/30 hover:border-accent-teal/60',
    subcategories: ['Yoga', 'Pilates', 'Dance Fitness', 'Tai Chi', 'Meditation & Breathwork']
  },
  {
    id: 'cardio',
    label: 'Cardio & Endurance',
    icon: <Flame size={22} />,
    color: 'from-red-500 to-pink-500',
    bg: 'bg-red-500/10 border-red-500/30 hover:border-red-500/60',
    subcategories: ['Running', 'Cycling', 'HIIT', 'Rowing', 'Jump Rope']
  },
  {
    id: 'recovery',
    label: 'Injury & Recovery',
    icon: <Heart size={22} />,
    color: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500/10 border-green-500/30 hover:border-green-500/60',
    subcategories: ['Rehabilitation', 'Flexibility', 'Mobility', 'Recovery', 'Sports Performance']
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    icon: <Apple size={22} />,
    color: 'from-yellow-500 to-orange-500',
    bg: 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/60',
    subcategories: ['Nutrition Planning', 'Weight Management', 'Sports Nutrition', 'Meal Prep']
  }
]

const SESSION_TYPES = [
  { id: 'all', label: 'All', icon: <Users size={16} /> },
  { id: 'online', label: 'Online', icon: <Monitor size={16} /> },
  { id: 'in-person', label: 'In-Person', icon: <MapPin size={16} /> },
]

type Step = 'browse' | 'matching' | 'matched' | 'results'

export default function CoachSearch() {
  const navigate = useNavigate()
  const { getStatus } = useOnlineStore()

  const [step, setStep] = useState<Step>('browse')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [sessionType, setSessionType] = useState('all')
  const [query, setQuery] = useState('')
  const [trainers, setTrainers] = useState<TrainerProfile[]>([])
  const [matchedTrainer, setMatchedTrainer] = useState<TrainerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [matchProgress, setMatchProgress] = useState(0)

  const currentCategory = CATEGORIES.find(c => c.id === selectedCategory)

  // Fetch trainers for the browse/results view
  const fetchTrainers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: any = {}
      if (query) params.query = query
      if (selectedSubcategory) params.specialty = selectedSubcategory
      const data = await trainerApi.search(params)
      setTrainers(data)
    } catch {}
    setIsLoading(false)
  }, [query, selectedSubcategory])

  // Start the matching process (Uber-style)
  const startMatching = async () => {
    setStep('matching')
    setMatchProgress(0)

    // Animate progress
    const interval = setInterval(() => {
      setMatchProgress(prev => {
        if (prev >= 100) { clearInterval(interval); return 100 }
        return prev + 2
      })
    }, 80)

    try {
      // Fetch matching trainers
      const params: any = { limit: 10 }
      if (selectedSubcategory) params.specialty = selectedSubcategory
      else if (currentCategory) {
        params.specialty = currentCategory.subcategories[0]
      }

      const data = await trainerApi.search(params)
      setTrainers(data)

      // Wait for animation to complete
      await new Promise(r => setTimeout(r, 4000))
      clearInterval(interval)
      setMatchProgress(100)

      if (data.length > 0) {
        // Pick the best available trainer
        const bestTrainer = data[0]
        setMatchedTrainer(bestTrainer)

        // Send actual coach request
        try {
          await traineeApi.requestCoach(bestTrainer.userId)
        } catch {}

        // Show match
        setTimeout(() => setStep('matched'), 500)
      } else {
        toast.error('No coaches available right now. Try a different category!')
        setStep('browse')
      }
    } catch {
      clearInterval(interval)
      toast.error('Something went wrong. Please try again.')
      setStep('browse')
    }
  }

  const resetSearch = () => {
    setStep('browse')
    setSelectedCategory(null)
    setSelectedSubcategory(null)
    setMatchedTrainer(null)
    setShowResults(false)
    setQuery('')
  }

  return (
    <>
      <Helmet><title>Find a Coach — Insta Coach</title></Helmet>

      <AnimatePresence mode="wait">
        {/* STEP 1: Browse Categories */}
        {step === 'browse' && (
          <motion.div
            key="browse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="space-y-6"
          >
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-1">
                Find Your <span className="gradient-text">Perfect Coach</span>
              </h1>
              <p className="text-text-secondary">Select a training category to get matched instantly</p>
            </motion.div>

            {/* Search Bar */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search trainer, specialty, or sport..."
                  className="w-full bg-bg-card border border-border-color rounded-2xl pl-11 pr-4 py-4 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple text-sm"
                  onKeyDown={e => { if (e.key === 'Enter') { setShowResults(true); fetchTrainers() } }}
                />
              </div>
            </motion.div>

            {!showResults ? (
              <>
                {/* Category Grid */}
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Select Category</p>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {CATEGORIES.map((cat, i) => (
                      <motion.button
                        key={cat.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * i }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
                          setSelectedSubcategory(null)
                        }}
                        className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                          selectedCategory === cat.id
                            ? `${cat.bg} ring-2 ring-offset-2 ring-offset-bg-primary ring-accent-purple`
                            : `${cat.bg} border-border-color`
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white mb-3`}>
                          {cat.icon}
                        </div>
                        <p className="font-bold text-sm text-text-primary">{cat.label}</p>
                        <p className="text-xs text-text-secondary mt-0.5">{cat.subcategories.length} specialties</p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Subcategories */}
                <AnimatePresence>
                  {currentCategory && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                        {currentCategory.label} — Choose Specialty
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {currentCategory.subcategories.map((sub) => (
                          <motion.button
                            key={sub}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? null : sub)}
                            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                              selectedSubcategory === sub
                                ? 'bg-accent-purple text-white border-accent-purple shadow-lg shadow-accent-purple/20'
                                : 'border-border-color text-text-secondary hover:border-accent-purple hover:text-text-primary'
                            }`}
                          >
                            {sub}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Session Type */}
                <div>
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Session Type</p>
                  <div className="flex gap-2">
                    {SESSION_TYPES.map(st => (
                      <button
                        key={st.id}
                        onClick={() => setSessionType(st.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                          sessionType === st.id
                            ? 'bg-accent-purple/20 text-accent-purple border-accent-purple/40'
                            : 'border-border-color text-text-secondary hover:border-accent-purple/30'
                        }`}
                      >
                        {st.icon}
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Find My Trainer Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startMatching}
                    disabled={!selectedCategory}
                    className="w-full relative overflow-hidden bg-gradient-to-r from-accent-purple via-purple-500 to-accent-teal text-white font-bold text-lg py-5 rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent-purple/30 hover:shadow-xl hover:shadow-accent-purple/40"
                  >
                    <span className="flex items-center justify-center gap-3">
                      <Sparkles size={22} />
                      Find My Trainer
                      <ChevronRight size={20} />
                    </span>
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                  </motion.button>

                  <button
                    onClick={() => { setShowResults(true); fetchTrainers() }}
                    className="w-full text-center mt-3 text-sm text-text-secondary hover:text-accent-purple transition-colors"
                  >
                    Or browse all coaches manually →
                  </button>
                </motion.div>
              </>
            ) : (
              /* Manual Browse Results */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={() => setShowResults(false)} className="p-2 rounded-lg hover:bg-bg-card-hover transition-colors">
                    <ArrowLeft size={18} className="text-text-secondary" />
                  </button>
                  <p className="text-sm text-text-secondary">{trainers.length} coaches found</p>
                </div>
                {isLoading ? (
                  <div className="flex justify-center py-16"><Spinner size="lg" /></div>
                ) : trainers.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-text-secondary text-lg mb-2">No coaches found</p>
                    <p className="text-text-secondary text-sm">Try adjusting your search</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {trainers.map((t, i) => <CoachCard key={t.id || t.userId} trainer={t} index={i} />)}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* STEP 2: Matching Animation */}
        {step === 'matching' && (
          <motion.div
            key="matching"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center"
          >
            {/* Sonar Animation */}
            <div className="relative w-48 h-48 mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-accent-purple/30 animate-sonar" />
              <div className="absolute inset-0 rounded-full border-2 border-accent-purple/20 animate-sonar-delayed" />
              <div className="absolute inset-0 rounded-full border-2 border-accent-purple/10 animate-sonar-delayed-2" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-gradient-to-br from-accent-purple to-accent-teal rounded-full flex items-center justify-center shadow-lg shadow-accent-purple/40">
                  <Search size={32} className="text-white" />
                </div>
              </div>
              {/* Radar sweep line */}
              <div className="absolute inset-0 animate-radar-sweep origin-center">
                <div className="w-1/2 h-0.5 bg-gradient-to-r from-accent-purple to-transparent absolute top-1/2 left-1/2" />
              </div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-text-primary mb-2"
            >
              Searching for your perfect coach...
            </motion.h2>
            <p className="text-text-secondary mb-6">
              Finding the best match for <span className="text-accent-purple font-medium">{selectedSubcategory || currentCategory?.label}</span>
            </p>

            {/* Progress bar */}
            <div className="w-64 h-2 bg-bg-card-hover rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-purple to-accent-teal rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${matchProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-xs text-text-secondary mt-2">{matchProgress}%</p>

            <button onClick={resetSearch} className="mt-8 text-sm text-text-secondary hover:text-red-400 transition-colors">
              Cancel
            </button>
          </motion.div>
        )}

        {/* STEP 3: Match Found! */}
        {step === 'matched' && matchedTrainer && (
          <motion.div
            key="matched"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="flex flex-col items-center justify-center min-h-[60vh] text-center relative"
          >
            {/* Confetti particles */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -100, x: (Math.random() - 0.5) * 400, opacity: 1, rotate: 0 }}
                animate={{ y: 600, opacity: 0, rotate: Math.random() * 720 }}
                transition={{ duration: 2 + Math.random() * 2, delay: Math.random() * 0.5 }}
                className={`absolute top-0 w-3 h-3 rounded-sm ${
                  ['bg-accent-purple', 'bg-accent-teal', 'bg-accent-orange', 'bg-yellow-400', 'bg-pink-400', 'bg-blue-400'][i % 6]
                }`}
                style={{ left: `${10 + Math.random() * 80}%` }}
              />
            ))}

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="text-6xl mb-4"
            >
              🎉
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-black text-text-primary mb-2"
            >
              Coach Found!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-text-secondary mb-8"
            >
              We've matched you with the perfect trainer
            </motion.p>

            {/* Coach Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, type: 'spring' }}
              className="bg-bg-card border border-accent-purple/30 rounded-3xl p-8 max-w-sm w-full shadow-xl shadow-accent-purple/10"
            >
              <div className="flex flex-col items-center">
                <Avatar src={matchedTrainer.avatar} name={matchedTrainer.name} size="xl" status={getStatus(matchedTrainer.userId)} />
                <h3 className="text-xl font-bold text-text-primary mt-4">{matchedTrainer.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-400">★</span>
                  <span className="font-semibold text-text-primary">{matchedTrainer.rating?.toFixed(1)}</span>
                  <span className="text-text-secondary text-sm">({matchedTrainer.totalReviews} reviews)</span>
                </div>
                <p className="text-sm text-text-secondary mt-2 text-center line-clamp-2">{matchedTrainer.bio}</p>
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                  {matchedTrainer.specialties?.slice(0, 3).map(s => (
                    <span key={s} className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple text-xs rounded-full font-medium">{s}</span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={() => navigate(`/coach/${matchedTrainer.userId}`)}
                  variant="secondary"
                  fullWidth
                  size="sm"
                >
                  View Profile
                </Button>
                <Button
                  onClick={() => navigate('/chat')}
                  fullWidth
                  size="sm"
                >
                  Open Chat
                </Button>
              </div>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              onClick={resetSearch}
              className="mt-6 text-sm text-text-secondary hover:text-accent-purple transition-colors"
            >
              ← Find a different coach
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
