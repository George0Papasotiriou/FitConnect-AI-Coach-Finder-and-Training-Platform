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
import { Bell, Check, CheckCheck, Trophy, MessageCircle, Calendar, Star, AlertCircle } from 'lucide-react'
import { notificationApi } from '../../api/notification'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { useNavigate } from 'react-router-dom'

const iconMap: Record<string, React.ReactNode> = {
  session: <Calendar size={18} className="text-accent-teal" />,
  message: <MessageCircle size={18} className="text-accent-purple" />,
  achievement: <Trophy size={18} className="text-accent-orange" />,
  request: <Bell size={18} className="text-blue-400" />,
  review: <Star size={18} className="text-yellow-400" />,
  system: <AlertCircle size={18} className="text-text-secondary" />,
}

export default function Notifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { notificationApi.getAll().then(setNotifications).catch(() => {}).finally(() => setIsLoading(false)) }, [])

  const handleMarkRead = async (id: string) => {
    try { await notificationApi.markRead(id); setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)) } catch {}
  }

  const handleMarkAllRead = async () => {
    try { await notificationApi.markAllRead(); setNotifications(prev => prev.map(n => ({ ...n, read: true }))) } catch {}
  }

  return (
    <>
      <Helmet><title>Notifications — AbiliFit</title></Helmet>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-text-primary">Notifications</h1>
          {notifications.some(n => !n.read) && <Button size="sm" variant="ghost" onClick={handleMarkAllRead} leftIcon={<CheckCheck size={14} />}>Mark all read</Button>}
        </motion.div>

        <Card padding="none">
          {isLoading ? (
            <div className="text-center py-8 text-text-secondary text-sm">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={32} className="text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border-color">
              {notifications.map((n, i) => (
                <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-bg-card-hover transition-colors ${!n.read ? 'bg-accent-purple/5' : ''}`}
                  onClick={() => { handleMarkRead(n.id); if (n.actionUrl) navigate(n.actionUrl) }}>
                  <div className="w-10 h-10 rounded-full bg-bg-primary flex items-center justify-center flex-shrink-0">{iconMap[n.type] || iconMap.system}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${n.read ? 'text-text-secondary' : 'text-text-primary'}`}>{n.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{n.body}</p>
                    <p className="text-xs text-text-secondary mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-accent-purple rounded-full mt-2 flex-shrink-0" />}
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
