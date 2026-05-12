import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import { Trophy, Zap, Clock, CheckCircle2, ShieldCheck, Target, Award, Sparkles, Plus, Trash2, X } from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { useBountyStore } from '../../store/bountyStore'
import { useAuthStore } from '../../store/authStore'
import apiClient from '../../api/client'
import { toast } from 'sonner'

export default function BountyBoard() {
  const { user } = useAuthStore()
  const { bounties, setBounties, completeBounty } = useBountyStore()
  const [loading, setLoading] = useState(true)

  // Trainer specific state
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    xpReward: 50,
    exerciseType: '',
    goalValue: 10
  })

  useEffect(() => {
    fetchBounties()
  }, [])

  const fetchBounties = async () => {
    try {
      const endpoint = user?.role === 'trainer' ? '/bounties/trainer' : '/bounties/active'
      const { data } = await apiClient.get(endpoint)
      setBounties(data)
    } catch (err) {
      toast.error('Failed to sync bounties')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      await apiClient.post(`/bounties/complete/${id}`)
      completeBounty(id)
      toast.success('Bounty claimed! XP awarded.', {
        icon: <Zap className="text-yellow-400" />,
      })
    } catch (err) {
      toast.error('Failed to claim bounty')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/bounties/${id}`)
      setBounties(bounties.filter(b => b.id !== id))
      toast.success('Bounty successfully removed.')
    } catch (err) {
      toast.error('Failed to delete bounty')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.description || !formData.exerciseType) {
      toast.error('Please fill in all fields')
      return
    }
    
    try {
      await apiClient.post('/bounties/create', formData)
      toast.success('Bounty successfully published!')
      setIsCreating(false)
      setFormData({ title: '', description: '', xpReward: 50, exerciseType: '', goalValue: 10 })
      fetchBounties()
    } catch (err) {
      toast.error('Failed to publish bounty.')
    }
  }

  return (
    <>
      <Helmet><title>Bounty Board — Insta Coach</title></Helmet>
      
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-text-primary flex items-center gap-3">
               <Trophy className="text-yellow-400" /> {user?.role === 'trainer' ? 'Bounty Management Hub' : 'Daily Bounty Board'}
            </h1>
            <p className="text-text-secondary mt-1">
               {user?.role === 'trainer' ? 'Publish engaging missions to accelerate global progression.' : 'Special missions from your coaches to accelerate your progress.'}
            </p>
          </div>
          {user?.role === 'trainer' ? (
             <Button variant="primary" onClick={() => setIsCreating(true)} leftIcon={<Plus size={18} />}>
               Publish New Bounty
             </Button>
          ) : (
             <Card className="!p-3 border-accent-purple/20 bg-accent-purple/5 flex items-center gap-3">
               <div className="w-10 h-10 rounded-xl bg-accent-purple flex items-center justify-center shadow-lg">
                  <ShieldCheck className="text-white" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-text-secondary">Elite Status</p>
                  <p className="text-xs font-bold text-text-primary">Vanguard Tier</p>
               </div>
             </Card>
          )}
        </header>

        {isCreating ? (
           <Card className="p-8 max-w-2xl mx-auto border-accent-purple/20 shadow-2xl">
              <div className="flex justify-between items-center mb-6 border-b border-border-color pb-4">
                 <h2 className="text-xl font-black text-text-primary">Create New Bounty</h2>
                 <Button variant="ghost" className="!p-2" onClick={() => setIsCreating(false)}>
                    <X size={20} />
                 </Button>
              </div>
              <form onSubmit={handleCreate} className="space-y-6">
                 <div>
                    <label className="block text-sm font-bold text-text-primary mb-2">Bounty Title</label>
                    <input 
                      type="text" 
                      className="w-full bg-bg-primary border border-border-color rounded-xl p-3 focus:border-accent-purple outline-none text-text-primary"
                      placeholder="e.g. The 100 Squat Challenge"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-text-primary mb-2">Mission Description</label>
                    <textarea 
                      className="w-full bg-bg-primary border border-border-color rounded-xl p-3 focus:border-accent-purple outline-none text-text-primary"
                      placeholder="e.g. Complete 100 bodyweight squats before midnight."
                      rows={3}
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-text-primary mb-2">Target Exercise</label>
                       <input 
                         type="text" 
                         className="w-full bg-bg-primary border border-border-color rounded-xl p-3 focus:border-accent-purple outline-none text-text-primary"
                         placeholder="e.g. Squats, Pull-ups"
                         value={formData.exerciseType}
                         onChange={e => setFormData({ ...formData, exerciseType: e.target.value })}
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-text-primary mb-2">Target Volume</label>
                       <input 
                         type="number" 
                         className="w-full bg-bg-primary border border-border-color rounded-xl p-3 focus:border-accent-purple outline-none text-text-primary"
                         value={formData.goalValue}
                         onChange={e => setFormData({ ...formData, goalValue: Number(e.target.value) })}
                       />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-text-primary mb-2">XP Reward Tier</label>
                    <select 
                      className="w-full bg-bg-primary border border-border-color rounded-xl p-3 focus:border-accent-purple outline-none text-text-primary"
                      value={formData.xpReward}
                      onChange={e => setFormData({ ...formData, xpReward: Number(e.target.value) })}
                    >
                       <option value={50}>50 XP (Simple)</option>
                       <option value={150}>150 XP (Challenging)</option>
                       <option value={300}>300 XP (Heroic)</option>
                    </select>
                 </div>
                 <div className="pt-4 flex justify-end gap-3 border-t border-border-color">
                    <Button variant="ghost" type="button" onClick={() => setIsCreating(false)}>Cancel</Button>
                    <Button variant="primary" type="submit">Deploy Bounty</Button>
                 </div>
              </form>
           </Card>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {loading ? (
             [1, 2, 3, 4].map(i => <div key={i} className="h-48 rounded-3xl bg-bg-card animate-pulse" />)
           ) : (
             <AnimatePresence>
               {bounties.map((b) => (
                 <motion.div
                   key={b.id}
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   layout
                 >
                   <Card className={`h-full relative overflow-hidden group transition-all ${b.status === 'completed' ? 'opacity-60 border-accent-teal/30' : 'hover:border-accent-purple/40 shadow-xl shadow-transparent hover:shadow-accent-purple/5'}`}>
                      {b.status === 'completed' && (
                        <div className="absolute top-4 right-4 z-10">
                           <CheckCircle2 className="text-accent-teal" size={24} />
                        </div>
                      )}
                      
                      <div className="relative z-10 space-y-4">
                         <div className="flex items-start justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-bg-primary border border-border-color flex items-center justify-center group-hover:scale-110 transition-transform">
                               <Award className={b.status === 'completed' ? 'text-accent-teal' : 'text-accent-purple'} />
                            </div>
                            <div className="text-right">
                               <div className="flex items-center gap-1 text-xs font-black text-yellow-500">
                                  <Zap size={12} fill="currentColor" />
                                  +{b.xpReward} XP
                               </div>
                               <p className="text-[10px] font-bold text-text-secondary uppercase mt-1">Reward</p>
                            </div>
                         </div>

                         <div>
                            <h3 className="text-lg font-black text-text-primary group-hover:text-accent-purple transition-colors">{b.title}</h3>
                            <p className="text-sm text-text-secondary mt-1 line-clamp-2">{b.description}</p>
                         </div>

                         <div className="pt-4 border-t border-border-color flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-lg bg-bg-primary border border-border-color flex items-center justify-center">
                                  <Target size={12} className="text-text-secondary" />
                               </div>
                               <span className="text-[10px] font-black uppercase text-text-secondary">{b.goalValue} {b.exerciseType}</span>
                            </div>
                            {user?.role === 'trainer' ? (
                              <Button size="sm" variant="ghost" className="!text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(b.id)}>
                                 <Trash2 size={16} className="mr-2" /> Revoke
                              </Button>
                            ) : b.status === 'completed' ? (
                              <span className="text-xs font-bold text-accent-teal italic">Bounty Claimed</span>
                            ) : (
                              <Button size="sm" variant="primary" onClick={() => handleComplete(b.id)}>Claim Reward</Button>
                            )}
                         </div>
                      </div>

                      <div className="absolute -bottom-6 -right-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                         <Sparkles size={120} />
                      </div>
                   </Card>
                 </motion.div>
               ))}
             </AnimatePresence>
           )}
        </div>
        )}

        {!isCreating && bounties.length === 0 && !loading && (
          <div className="py-20 text-center space-y-4">
             <div className="w-20 h-20 rounded-3xl bg-bg-card mx-auto flex items-center justify-center border border-border-color">
                <Clock className="text-text-secondary" size={32} />
             </div>
             <div>
                <p className="font-bold text-text-primary">{user?.role === 'trainer' ? 'No active bounties' : 'All bounties claimed!'}</p>
                <p className="text-xs text-text-secondary">
                  {user?.role === 'trainer' ? "You haven't published any active missions. Deploy one!" : "Check back tomorrow for fresh daily missions."}
                </p>
             </div>
          </div>
        )}
      </div>
    </>
  )
}
