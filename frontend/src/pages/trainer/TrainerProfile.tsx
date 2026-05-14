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
import { Save, Camera } from 'lucide-react'
import { trainerApi } from '../../api/trainer'
import Card from '../../components/common/Card'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'

const SPECIALTIES = ['Yoga', 'Pilates', 'Strength Training', 'Cardio', 'HIIT', 'Swimming', 'Martial Arts', 'Dance', 'Rehabilitation', 'Flexibility', 'Sports Performance', 'Nutrition']

export default function TrainerProfile() {
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', experience: 0, hourlyRate: 0, specialties: [] as string[], isAvailable: true })

  useEffect(() => {
    trainerApi.getProfile().then(p => {
      setProfile(p)
      setForm({ name: p.name, bio: p.bio, experience: p.experience, hourlyRate: p.hourlyRate, specialties: p.specialties, isAvailable: !!p.isAvailable })
    }).catch(() => {})
  }, [])

  const toggleSpecialty = (s: string) => {
    setForm(prev => ({ ...prev, specialties: prev.specialties.includes(s) ? prev.specialties.filter(x => x !== s) : [...prev.specialties, s] }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await trainerApi.updateProfile(form)
      if (user && form.name !== user.name) setUser({ ...user, name: form.name })
      toast.success('Profile updated!')
    } catch { toast.error('Failed to save') }
    setIsSaving(false)
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('avatar', file)
    try {
      const res = await fetch('/api/trainer/upload-avatar', { method: 'POST', headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem('auth-storage')!).state.token}` }, body: formData })
      const data = await res.json()
      if (user) setUser({ ...user, avatar: data.url })
      toast.success('Avatar updated!')
    } catch { toast.error('Upload failed') }
  }

  if (!profile) return null

  return (
    <>
      <Helmet><title>My Profile — Insta Coach</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-text-primary">My <span className="gradient-text">Profile</span></h1>
        </motion.div>

        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar src={user?.avatar} name={user?.name} size="xl" />
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 w-8 h-8 bg-accent-purple rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-600 transition-colors">
                <Camera size={14} className="text-white" />
              </label>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{form.name}</h2>
              <Badge variant={profile.applicationStatus === 'approved' ? 'green' : profile.applicationStatus === 'pending' ? 'orange' : 'red'}>{profile.applicationStatus}</Badge>
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={4} className="input-field resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Experience (years)" type="number" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: parseInt(e.target.value) || 0 }))} />
              <Input label="Hourly Rate ($)" type="number" value={form.hourlyRate} onChange={e => setForm(p => ({ ...p, hourlyRate: parseFloat(e.target.value) || 0 }))} />
            </div>

            <div>
              <p className="text-sm font-medium text-text-secondary mb-2">Specialties</p>
              <div className="flex flex-wrap gap-2">
                {SPECIALTIES.map(s => (
                  <button key={s} onClick={() => toggleSpecialty(s)} aria-pressed={form.specialties.includes(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${form.specialties.includes(s) ? 'bg-accent-purple text-white border-accent-purple' : 'border-border-color text-text-secondary hover:border-accent-purple'}`}>{s}</button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-text-secondary">Available for new clients</label>
              <button onClick={() => setForm(p => ({ ...p, isAvailable: !p.isAvailable }))} role="switch" aria-checked={form.isAvailable}
                className={`w-12 h-6 rounded-full transition-colors relative ${form.isAvailable ? 'bg-accent-teal' : 'bg-border-color'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${form.isAvailable ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <Button onClick={handleSave} isLoading={isSaving} leftIcon={<Save size={16} />} fullWidth>Save Changes</Button>
          </div>
        </Card>
      </div>
    </>
  )
}
