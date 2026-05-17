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
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="h-full w-full max-w-md overflow-y-auto"
        style={{ background: 'var(--bg-secondary, #1a1d2e)', borderLeft: '1px solid var(--border-color, rgba(255,255,255,0.08))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-border-color"
          style={{ background: 'var(--bg-secondary, #1a1d2e)' }}>
          <h2 className="text-lg font-black text-text-primary">Client Profile</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-white/10 transition-all">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Identity */}
          <div className="flex items-center gap-4">
            <Avatar src={t.avatar} name={t.name} size="xl" />
            <div>
              <h3 className="text-xl font-black text-text-primary">{t.name}</h3>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {t.fitnessLevel && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium capitalize"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                    {t.fitnessLevel}
                  </span>
                )}
                {t.gender && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)' }}>
                    {t.gender}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <User size={14} />, label: 'Age', value: t.age ? `${t.age} yrs` : '—' },
              { icon: <Scale size={14} />, label: 'Weight', value: t.weight ? `${t.weight} kg` : '—' },
              { icon: <Ruler size={14} />, label: 'Height', value: t.height ? `${t.height} cm` : '—' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-primary, #0f1117)' }}>
                <div className="flex justify-center mb-1 text-text-secondary">{icon}</div>
                <p className="text-sm font-bold text-text-primary">{value}</p>
                <p className="text-xs text-text-secondary">{label}</p>
              </div>
            ))}
          </div>

          {/* Goals */}
          {(t.goals?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Target size={14} className="text-accent-purple" /> Goals
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {t.goals!.map(g => <Badge key={g} variant="purple" size="sm">{g}</Badge>)}
              </div>
            </div>
          )}

          {/* Workout Preferences */}
          {(t.preferredWorkoutTypes?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Zap size={14} className="text-accent-teal" /> Preferred Workouts
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {t.preferredWorkoutTypes!.map(w => (
                  <span key={w} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(20,184,166,0.12)', color: '#5eead4', border: '1px solid rgba(20,184,166,0.25)' }}>
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Body Injury Figure ── */}
          <div>
            <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
              <Activity size={14} className="text-red-400" />
              Body — Injuries & Pain Points
              {hasInjuries && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {injuryLabels.length} area{injuryLabels.length !== 1 ? 's' : ''} marked
                </span>
              )}
            </h4>

            {hasInjuries ? (
              <div className="rounded-2xl p-4 flex flex-col items-center gap-3"
                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <BodyFigure selected={t.injuredLimbs ?? []} size="md" />
                {/* Injury description */}
                {t.injuryDescription && (
                  <div className="w-full rounded-xl p-3 text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                    <p className="font-semibold mb-1 flex items-center gap-1.5">
                      <AlertTriangle size={13} /> Description
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: '#fda4af' }}>{t.injuryDescription}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl p-4 text-center text-sm text-text-secondary"
                style={{ background: 'var(--bg-primary, #0f1117)', border: '1px dashed var(--border-color)' }}>
                ✅ No injuries or pain points reported
              </div>
            )}
          </div>

          {/* Medical Conditions */}
          {hasConditions && (
            <div>
              <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Heart size={14} className="text-pink-400" /> Medical Conditions
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {t.medicalConditions!.filter(c => c !== 'None').map(c => (
                  <span key={c} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(236,72,153,0.12)', color: '#f9a8d4', border: '1px solid rgba(236,72,153,0.25)' }}>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Accessibility Needs */}
          {(t.accessibilityNeeds?.filter(a => a !== 'None').length ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Globe2 size={14} className="text-blue-400" /> Accessibility Needs
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {t.accessibilityNeeds!.filter(a => a !== 'None').map(a => (
                  <span key={a} className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(96,165,250,0.12)', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.25)' }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Motivation */}
          {t.trainingMotivation && (
            <div>
              <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" /> Their Motivation
              </h4>
              <blockquote className="rounded-xl p-4 text-sm italic leading-relaxed"
                style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fde68a' }}>
                "{t.trainingMotivation}"
              </blockquote>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-2">
            {client.status === 'pending' && (
              <div className="flex gap-2">
                <Button fullWidth onClick={() => onAccept(client.id)} leftIcon={<Check size={15} />}>
                  Accept Client
                </Button>
                <Button fullWidth variant="ghost" onClick={() => onReject(client.id)} leftIcon={<X size={15} />}>
                  Decline
                </Button>
              </div>
            )}
            {client.status === 'accepted' && (
              <Button fullWidth variant="secondary" onClick={() => onMessage(t.id)} leftIcon={<MessageCircle size={15} />}>
                Open Chat
              </Button>
            )}
          </div>
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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-between p-4 bg-bg-primary rounded-xl cursor-pointer hover:bg-white/[0.03] transition-all group"
        onClick={() => setSelectedClient(r)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <Avatar src={t.avatar} name={t.name} size="md" />
            {hasInjuries && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                title="Has injuries">
                <AlertTriangle size={9} className="text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-text-primary">{t.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-text-secondary capitalize">{t.fitnessLevel || 'Unknown level'}</p>
              {t.age && <span className="text-xs text-text-secondary/60">• {t.age} yrs</span>}
              {hasConditions && (
                <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                  style={{ background: 'rgba(236,72,153,0.12)', color: '#f9a8d4' }}>
                  ⚕️ Conditions
                </span>
              )}
            </div>
            <div className="flex gap-1 mt-1">
              {t.goals?.slice(0, 2).map((g: string) => <Badge key={g} variant="purple" size="sm">{g}</Badge>)}
              {(t.goals?.length ?? 0) > 2 && <Badge variant="purple" size="sm">+{t.goals!.length - 2}</Badge>}
            </div>
          </div>
        </div>
        <ChevronRight size={16} className="text-text-secondary shrink-0 group-hover:text-accent-purple transition-colors" />
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
          <Card>
            <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
              Pending Requests <Badge variant="orange">{pending.length}</Badge>
            </h2>
            <div className="space-y-3">
              {pending.map(r => <ClientCard key={r.id} r={r} />)}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-bold text-text-primary mb-4">Active Clients ({accepted.length})</h2>
          {accepted.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">No active clients yet. New requests will appear here.</p>
          ) : (
            <div className="space-y-3">
              {accepted.map(r => <ClientCard key={r.id} r={r} />)}
            </div>
          )}
        </Card>
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
