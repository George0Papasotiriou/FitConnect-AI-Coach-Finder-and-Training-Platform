import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Search, Filter, X } from 'lucide-react'
import { trainerApi, TrainerProfile } from '../../api/trainer'
import CoachCard from '../../components/trainer/CoachCard'
import Spinner from '../../components/common/Spinner'
import Button from '../../components/common/Button'

const SPECIALTIES = ['Yoga', 'Pilates', 'Strength Training', 'Cardio', 'HIIT', 'Swimming', 'Martial Arts', 'Dance', 'Rehabilitation', 'Flexibility', 'Sports Performance', 'Nutrition']

export default function CoachSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [trainers, setTrainers] = useState<TrainerProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [specialty, setSpecialty] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [minRating, setMinRating] = useState(0)
  const [maxRate, setMaxRate] = useState(200)

  const fetchTrainers = async () => {
    setIsLoading(true)
    try {
      const params: any = {}
      if (query) params.query = query
      if (specialty) params.specialty = specialty
      if (minRating > 0) params.minRating = minRating
      if (maxRate < 200) params.maxRate = maxRate
      const data = await trainerApi.search(params)
      setTrainers(data)
    } catch { }
    setIsLoading(false)
  }

  useEffect(() => { fetchTrainers() }, [specialty, minRating, maxRate])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTrainers()
  }

  return (
    <>
      <Helmet><title>Find a Coach — FitConnect</title></Helmet>

      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary mb-1">
            Find Your <span className="gradient-text">Perfect Coach</span>
          </h1>
          <p className="text-text-secondary">Browse certified trainers by specialty, rating, and more</p>
        </motion.div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or keyword..."
              aria-label="Search coaches" className="w-full bg-bg-card border border-border-color rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple" />
          </div>
          <Button type="submit">Search</Button>
          <Button type="button" variant="ghost" onClick={() => setShowFilters(!showFilters)} aria-label="Toggle filters" aria-expanded={showFilters}>
            <Filter size={20} />
          </Button>
        </form>

        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-bg-card border border-border-color rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text-primary text-sm">Filters</h3>
              <button onClick={() => { setSpecialty(''); setMinRating(0); setMaxRate(200); }} className="text-xs text-accent-purple hover:underline">Clear all</button>
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-2 font-medium">Specialty</p>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map(s => (
                  <button key={s} onClick={() => setSpecialty(specialty === s ? '' : s)} aria-pressed={specialty === s}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${specialty === s ? 'bg-accent-purple text-white border-accent-purple' : 'border-border-color text-text-secondary hover:border-accent-purple'}`}>{s}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-text-secondary mb-1 block font-medium">Min Rating: {minRating > 0 ? minRating.toFixed(1) : 'Any'}</label>
                <input type="range" min="0" max="5" step="0.5" value={minRating} onChange={e => setMinRating(parseFloat(e.target.value))}
                  className="w-full accent-accent-purple" aria-label="Minimum rating filter" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block font-medium">Max Rate: {maxRate < 200 ? `$${maxRate}/hr` : 'Any'}</label>
                <input type="range" min="10" max="200" step="10" value={maxRate} onChange={e => setMaxRate(parseInt(e.target.value))}
                  className="w-full accent-accent-purple" aria-label="Maximum rate filter" />
              </div>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : trainers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg mb-2">No coaches found</p>
            <p className="text-text-secondary text-sm">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {trainers.map((t, i) => <CoachCard key={t.id || t.userId} trainer={t} index={i} />)}
          </div>
        )}
      </div>
    </>
  )
}
