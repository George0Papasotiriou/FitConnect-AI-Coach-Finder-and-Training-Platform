/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check, X, MessageCircle, ChevronRight, User, Scale, Ruler,
  AlertTriangle, Heart, Target, Zap, Activity, Globe2, X as CloseIcon
} from 'lucide-react'
import { trainerApi } from '../../api/trainer'
import { chatApi } from '../../api/chat'
import { useNavigate } from 'react-router-dom'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import BodyFigure, { BODY_PARTS } from '../../components/common/BodyFigure'
import { toast } from 'sonner'

interface Trainee {
  id: string
  name: string
  avatar?: string
  fitnessLevel?: string
  goals?: string[]
  age?: number
  gender?: string
  weight?: number
  height?: number
  medicalConditions?: string[]
  injuredLimbs?: string[]
  injuryDescription?: string
  trainingMotivation?: string
  accessibilityNeeds?: string[]
  preferredWorkoutTypes?: string[]
}

interface ClientRequest {
  id: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
  trainee: Trainee
}

function ProfileDrawer({ client, onClose, onAccept, onReject, onMessage }: {
  client: ClientRequest
  onClose: () => void
  onAccept: (id: string) => void
  onReject: (id: string) => void
  onMessage: (traineeId: string) => void
}) {
  const t = client.trainee
  const hasInjuries = (t.injuredLimbs?.length ?? 0) > 0
  const hasConditions = (t.medicalConditions?.filter(c => c !== 'None').length ?? 0) > 0

  const injuryLabels = (t.injuredLimbs || []).map(key => {
    const part = BODY_PARTS.find(p => p.key === key)
    return part?.label ?? key
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="h-full w-full max-w-md overflow-y-auto glass-surface flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border-color/30 backdrop-blur-md"
          style={{ background: 'var(--glass-bg-heavy)' }}>
          <div>
            <h2 className="text-xl font-black tracking-tight text-text-primary">Client Profile</h2>
            <p className="text-[11px] text-text-secondary font-medium tracking-wide uppercase mt-0.5">Details & Health Metrics</p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-text-primary/5 border border-transparent hover:border-border-color/30 transition-all duration-300">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Identity */}
          <div className="flex items-center gap-4 bg-bg-card/45 p-4 rounded-2xl border border-border-color/20 shadow-sm">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-accent-purple/20 blur-xl rounded-full" />
              <Avatar src={t.avatar} name={t.name} size="xl" className="relative rounded-full shadow-lg" />
            </div>
            <div className="min-w-0">
              <h3 className="text-2xl font-black text-text-primary tracking-tight truncate">{t.name}</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {t.fitnessLevel && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg"
                    style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--accent-purple)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    {t.fitnessLevel}
                  </span>
                )}
                {t.gender && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
                    {t.gender}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <User size={15} className="text-accent-purple" />, label: 'Age', value: t.age ? `${t.age} yrs` : '—' },
              { icon: <Scale size={15} className="text-accent-teal" />, label: 'Weight', value: t.weight ? `${t.weight} kg` : '—' },
              { icon: <Ruler size={15} className="text-accent-orange" />, label: 'Height', value: t.height ? `${t.height} cm` : '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="glass-card rounded-2xl p-4 text-center flex flex-col items-center justify-center border border-border-color/10 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-bg-primary/80 flex items-center justify-center mb-1.5 shadow-sm">{icon}</div>
                <p className="text-sm font-black text-text-primary">{value}</p>
                <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Goals */}
          {(t.goals?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Target size={14} className="text-accent-purple" /> Goals
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {t.goals!.map(g => (
                  <span key={g} className="text-xs px-3 py-1 rounded-xl font-bold bg-accent-purple/10 text-accent-purple border border-accent-purple/20 shadow-sm capitalize">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Workout Preferences */}
          {(t.preferredWorkoutTypes?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Zap size={14} className="text-accent-teal" /> Preferred Workouts
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {t.preferredWorkoutTypes!.map(w => (
                  <span key={w} className="text-xs px-3 py-1 rounded-xl font-bold bg-accent-teal/10 text-accent-teal border border-accent-teal/20 shadow-sm">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Body Injury Figure ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} className="text-red-400" />
              Body — Injuries & Pain Points
              {hasInjuries && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {injuryLabels.length} area{injuryLabels.length !== 1 ? 's' : ''}
                </span>
              )}
            </h4>

            {hasInjuries ? (
              <div className="rounded-2xl p-4 flex flex-col items-center gap-3 bg-red-500/5 border border-red-500/10 backdrop-blur-sm shadow-sm">
                <BodyFigure selected={t.injuredLimbs ?? []} size="md" />
                {/* Injury description */}
                {t.injuryDescription && (
                  <div className="w-full rounded-2xl p-4 text-sm bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-300">
                    <p className="font-bold mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-wider">
                      <AlertTriangle size={13} className="text-red-500" /> Injury Details
                    </p>
                    <p className="text-xs leading-relaxed opacity-90">{t.injuryDescription}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl p-5 text-center text-sm text-text-secondary bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-center gap-2 font-medium shadow-inner">
                <Check size={16} className="text-emerald-500" />
                No injuries or pain points reported
              </div>
            )}
          </div>

          {/* Medical Conditions */}
          {hasConditions && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Heart size={14} className="text-pink-400" /> Medical Conditions
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {t.medicalConditions!.filter(c => c !== 'None').map(c => (
                  <span key={c} className="text-xs px-3 py-1 rounded-xl font-bold bg-red-400/10 text-red-500 dark:text-red-300 border border-red-400/20 shadow-sm">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Accessibility Needs */}
          {(t.accessibilityNeeds?.filter(a => a !== 'None').length ?? 0) > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Globe2 size={14} className="text-blue-400" /> Accessibility Needs
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {t.accessibilityNeeds!.filter(a => a !== 'None').map(a => (
                  <span key={a} className="text-xs px-3 py-1 rounded-xl font-bold bg-blue-400/10 text-blue-500 dark:text-blue-300 border border-blue-400/20 shadow-sm">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Motivation */}
          {t.trainingMotivation && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                <Zap size={14} className="text-yellow-500" /> Client Motivation
              </h4>
              <blockquote className="rounded-2xl p-4 text-xs italic leading-relaxed bg-yellow-500/5 border border-yellow-500/10 text-yellow-600 dark:text-yellow-300 font-medium">
                "{t.trainingMotivation}"
              </blockquote>
            </div>
          )}
        </div>

        {/* Sticky Actions Footer */}
        <div className="sticky bottom-0 z-10 p-5 border-t border-border-color/30 backdrop-blur-md flex flex-col gap-2 mt-auto"
          style={{ background: 'var(--glass-bg-heavy)' }}>
          {client.status === 'pending' && (
            <div className="flex gap-2.5">
              <Button fullWidth onClick={() => onAccept(client.id)} leftIcon={<Check size={16} />} className="!rounded-2xl !py-3 font-black tracking-wide uppercase text-xs">
                Accept Request
              </Button>
              <Button fullWidth variant="ghost" onClick={() => onReject(client.id)} leftIcon={<X size={16} />} className="!rounded-2xl !py-3 font-black tracking-wide uppercase text-xs border border-border-color/30">
                Decline
              </Button>
            </div>
          )}
          {client.status === 'accepted' && (
            <Button fullWidth variant="secondary" onClick={() => onMessage(t.id)} leftIcon={<MessageCircle size={16} />} className="!rounded-2xl !py-3 font-black tracking-wide uppercase text-xs shadow-md">
              Open Chat
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function TrainerClients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientRequest[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientRequest | null>(null)

  useEffect(() => { trainerApi.getClients().then(setClients).catch(() => {}) }, [])

  const pending = clients.filter(c => c.status === 'pending')
  const accepted = clients.filter(c => c.status === 'accepted')

  const handleAccept = async (id: string) => {
    try {
      await trainerApi.acceptClient(id)
      setClients(prev => prev.map(c => c.id === id ? { ...c, status: 'accepted' } : c))
      setSelectedClient(prev => prev?.id === id ? { ...prev, status: 'accepted' } : prev)
      toast.success('Client accepted!')
    } catch { toast.error('Failed') }
  }

  const handleReject = async (id: string) => {
    try {
      await trainerApi.rejectClient(id)
      setClients(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c))
      setSelectedClient(null)
      toast.success('Request declined')
    } catch { toast.error('Failed') }
  }

  const handleMessage = async (traineeId: string) => {
    try {
      const conv = await chatApi.createConversation(traineeId)
      navigate(`/chat/${conv.id}`)
    } catch { toast.error('Failed') }
  }

  const ClientCard = ({ r }: { r: ClientRequest }) => {
    const t = r.trainee
    const hasInjuries = (t.injuredLimbs?.length ?? 0) > 0
    const hasConditions = (t.medicalConditions?.filter(c => c !== 'None').length ?? 0) > 0

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between p-4 rounded-2xl cursor-pointer bg-bg-card hover:bg-bg-card-hover border border-border-color/20 hover:border-accent-purple/30 transition-all duration-300 group shadow-sm hover:shadow-md"
        onClick={() => setSelectedClient(r)}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative flex-shrink-0">
            <Avatar src={t.avatar} name={t.name} size="md" className="rounded-full shadow-sm" />
            {hasInjuries && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-md animate-pulse"
                title="Has injuries">
                <AlertTriangle size={9} className="text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-black text-text-primary tracking-tight text-sm group-hover:text-accent-purple transition-colors">{t.name}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-accent-purple/10 text-accent-purple border border-accent-purple/10">
                {t.fitnessLevel || 'Unknown'}
              </span>
              {t.age && <span className="text-[10px] text-text-secondary font-bold">• {t.age} yrs</span>}
              {hasConditions && (
                <span className="text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/10">
                  ⚕️ Conditions
                </span>
              )}
            </div>
            {t.goals && t.goals.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {t.goals.slice(0, 2).map((g: string) => (
                  <span key={g} className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-text-secondary/5 text-text-secondary border border-border-color/10 capitalize">
                    {g}
                  </span>
                ))}
                {t.goals.length > 2 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-accent-teal/10 text-accent-teal border border-accent-teal/10">
                    +{t.goals.length - 2} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-text-primary/5 group-hover:bg-accent-purple/10 group-hover:text-accent-purple text-text-secondary transition-all duration-300">
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </motion.div>
    )
  }

  return (
    <>
      <Helmet><title>Clients — AbiliFit</title></Helmet>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-text-primary">My <span className="gradient-text">Clients</span></h1>
          <p className="text-sm text-text-secondary mt-1">Click any client to view their full profile, health info, and injuries.</p>
        </motion.div>

        {pending.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-black text-text-primary mb-4 flex items-center gap-3">
              Pending Requests 
              <span className="bg-accent-orange/10 text-accent-orange px-2.5 py-0.5 rounded-md text-sm">{pending.length}</span>
            </h2>
            <div className="grid gap-3">
              {pending.map(r => <ClientCard key={r.id} r={r} />)}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-lg font-black text-text-primary mb-4 flex items-center gap-3">
            Active Clients
            <span className="bg-text-secondary/10 text-text-secondary px-2.5 py-0.5 rounded-md text-sm">{accepted.length}</span>
          </h2>
          {accepted.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">No active clients yet. New requests will appear here.</p>
          ) : (
            <div className="grid gap-3">
              {accepted.map(r => <ClientCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      </div>

      {/* Profile Drawer */}
      <AnimatePresence>
        {selectedClient && (
          <ProfileDrawer
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onAccept={handleAccept}
            onReject={handleReject}
            onMessage={handleMessage}
          />
        )}
      </AnimatePresence>
    </>
  )
}
