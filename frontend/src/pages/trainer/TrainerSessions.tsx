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
import { Video, Clock, CheckCircle, XCircle } from 'lucide-react'
import { trainerApi } from '../../api/trainer'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import { useNavigate } from 'react-router-dom'

export default function TrainerSessions() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => { trainerApi.getSessions().then(setSessions).catch(() => {}) }, [])

  const upcoming = sessions.filter(s => s.status === 'scheduled')
  const completed = sessions.filter(s => s.status === 'completed')

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    scheduled: { color: 'purple', icon: <Clock size={14} /> },
    active: { color: 'teal', icon: <Video size={14} /> },
    completed: { color: 'green', icon: <CheckCircle size={14} /> },
    cancelled: { color: 'red', icon: <XCircle size={14} /> },
  }

  return (
    <>
      <Helmet><title>Sessions — Insta Coach</title></Helmet>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-text-primary">My <span className="gradient-text">Sessions</span></h1>
        </motion.div>

        {upcoming.length > 0 && (
          <Card>
            <h2 className="font-bold text-text-primary mb-4">Upcoming ({upcoming.length})</h2>
            <div className="space-y-3">
              {upcoming.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-bg-primary rounded-xl">
                  <div>
                    <p className="font-semibold text-text-primary">{s.traineeName}</p>
                    <p className="text-xs text-text-secondary">{new Date(s.scheduledAt).toLocaleDateString()} at {new Date(s.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <Button size="sm" variant="teal" onClick={() => navigate(`/call/${s.id}?initiator=true`)} leftIcon={<Video size={14} />}>Start</Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card>
          <h2 className="font-bold text-text-primary mb-4">Session History</h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">No sessions yet</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s, i) => (
                <motion.div key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between p-3 bg-bg-primary rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center text-accent-purple"><Video size={14} /></div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{s.traineeName}</p>
                      <p className="text-xs text-text-secondary">{new Date(s.scheduledAt).toLocaleDateString()}{s.duration ? ` • ${s.duration}min` : ''}</p>
                    </div>
                  </div>
                  <Badge variant={statusConfig[s.status]?.color as any || 'gray'} size="sm">{s.status}</Badge>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
