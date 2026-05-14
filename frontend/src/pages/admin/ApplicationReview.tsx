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
  FileCheck, CheckCircle, XCircle, Clock, Eye, Download,
  Star, Briefcase, Award, ChevronDown, ChevronUp, Search,
  Filter, RefreshCw, AlertCircle
} from 'lucide-react'
import { adminApi, TrainerApplication } from '../../api/admin'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Avatar from '../../components/common/Avatar'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import { toast } from 'sonner'

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected'

const statusConfig: Record<string, { variant: 'orange' | 'green' | 'red' | 'gray'; label: string; icon: JSX.Element }> = {
  pending: { variant: 'orange', label: 'Pending Review', icon: <Clock size={12} /> },
  approved: { variant: 'green', label: 'Approved', icon: <CheckCircle size={12} /> },
  rejected: { variant: 'red', label: 'Rejected', icon: <XCircle size={12} /> },
}

export default function ApplicationReview() {
  const [applications, setApplications] = useState<TrainerApplication[]>([])
  const [filtered, setFiltered] = useState<TrainerApplication[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<TrainerApplication | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject'; app: TrainerApplication } | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [expandedDocs, setExpandedDocs] = useState(false)

  const load = async (status?: string) => {
    setLoading(true)
    try {
      const data = await adminApi.getApplications(status === 'all' ? undefined : status)
      setApplications(data)
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let result = applications
    if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.specialties.some(s => s.toLowerCase().includes(q))
      )
    }
    setFiltered(result)
  }, [applications, statusFilter, searchQuery])

  const handleApprove = async () => {
    if (!actionModal) return
    setActionLoading(true)
    try {
      await adminApi.approveApplication(actionModal.app.id, actionNotes || 'Approved by admin')
      setApplications(prev => prev.map(a => a.id === actionModal.app.id ? { ...a, status: 'approved' as const } : a))
      toast.success(`${actionModal.app.name}'s application approved!`)
      setActionModal(null)
      setActionNotes('')
      if (detailOpen) setDetailOpen(false)
    } catch {
      toast.error('Failed to approve application')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!actionModal) return
    if (!actionNotes.trim()) { toast.error('Please provide a reason for rejection'); return }
    setActionLoading(true)
    try {
      await adminApi.rejectApplication(actionModal.app.id, actionNotes)
      setApplications(prev => prev.map(a => a.id === actionModal.app.id ? { ...a, status: 'rejected' as const } : a))
      toast.success(`Application rejected`)
      setActionModal(null)
      setActionNotes('')
      if (detailOpen) setDetailOpen(false)
    } catch {
      toast.error('Failed to reject application')
    } finally {
      setActionLoading(false)
    }
  }

  const openDetail = async (app: TrainerApplication) => {
    try {
      const detailed = await adminApi.getApplicationById(app.id)
      setSelectedApp(detailed)
    } catch {
      setSelectedApp(app)
    }
    setExpandedDocs(false)
    setDetailOpen(true)
  }

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  }

  const tabs: { key: StatusFilter; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'text-text-primary' },
    { key: 'pending', label: 'Pending', color: 'text-accent-orange' },
    { key: 'approved', label: 'Approved', color: 'text-green-400' },
    { key: 'rejected', label: 'Rejected', color: 'text-red-400' },
  ]

  return (
    <>
      <Helmet><title>Application Review — Insta Coach Admin</title></Helmet>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-text-primary flex items-center gap-2">
              <FileCheck size={24} className="text-accent-purple" /> Application Review
            </h1>
            <p className="text-text-secondary text-sm mt-1">Review and manage trainer applications</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => load()}
            disabled={loading}
          >
            Refresh
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: counts.all, color: 'from-accent-purple to-purple-600', icon: <FileCheck size={18} /> },
              { label: 'Pending', value: counts.pending, color: 'from-accent-orange to-orange-600', icon: <Clock size={18} /> },
              { label: 'Approved', value: counts.approved, color: 'from-green-500 to-green-700', icon: <CheckCircle size={18} /> },
              { label: 'Rejected', value: counts.rejected, color: 'from-red-500 to-red-700', icon: <XCircle size={18} /> },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Card className="cursor-pointer" onClick={() => setStatusFilter(s.label.toLowerCase() as StatusFilter)}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white mb-2`}>{s.icon}</div>
                  <p className="text-2xl font-black text-text-primary">{s.value}</p>
                  <p className="text-xs text-text-secondary">{s.label}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex gap-1 bg-bg-primary rounded-xl p-1 flex-wrap">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      statusFilter === tab.key
                        ? 'bg-bg-card text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <span className={statusFilter === tab.key ? tab.color : ''}>{tab.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      statusFilter === tab.key ? 'bg-accent-purple/20 text-accent-purple' : 'bg-bg-card text-text-secondary'
                    }`}>
                      {counts[tab.key]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  placeholder="Search by name, email or specialty..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  leftIcon={<Search size={16} />}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Filter size={40} className="text-text-secondary mb-3 opacity-50" />
                <p className="text-text-secondary font-medium">No applications found</p>
                <p className="text-text-secondary text-sm mt-1 opacity-70">
                  {searchQuery ? 'Try adjusting your search' : `No ${statusFilter === 'all' ? '' : statusFilter} applications yet`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filtered.map((app, i) => {
                    const cfg = statusConfig[app.status] || statusConfig.pending
                    return (
                      <motion.div
                        key={app.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 p-4 bg-bg-primary rounded-xl hover:bg-bg-card-hover transition-colors"
                      >
                        <Avatar src={app.avatar} name={app.name} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-text-primary">{app.name}</p>
                            <Badge variant={cfg.variant} size="sm">
                              <span className="flex items-center gap-1">{cfg.icon}{cfg.label}</span>
                            </Badge>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">{app.email}</p>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs text-text-secondary">
                              <Briefcase size={11} /> {app.experience}y exp
                            </span>
                            <span className="flex items-center gap-1 text-xs text-text-secondary">
                              ${app.hourlyRate}/hr
                            </span>
                            {app.specialties?.slice(0, 3).map(s => (
                              <Badge key={s} variant="purple" size="sm">{s}</Badge>
                            ))}
                            {app.specialties?.length > 3 && (
                              <span className="text-xs text-text-secondary">+{app.specialties.length - 3} more</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <p className="text-xs text-text-secondary hidden sm:block">
                            {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                          <Button size="sm" variant="ghost" leftIcon={<Eye size={14} />} onClick={() => openDetail(app)}>
                            Review
                          </Button>
                          {app.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                leftIcon={<CheckCircle size={14} />}
                                onClick={() => { setActionModal({ type: 'approve', app }); setActionNotes('') }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={<XCircle size={14} />}
                                onClick={() => { setActionModal({ type: 'reject', app }); setActionNotes('') }}
                                className="!text-red-400 hover:!bg-red-500/10"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Trainer Application Details" size="xl">
        {selectedApp && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <Avatar src={selectedApp.avatar} name={selectedApp.name} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-text-primary">{selectedApp.name}</h3>
                  {(() => {
                    const cfg = statusConfig[selectedApp.status] || statusConfig.pending
                    return <Badge variant={cfg.variant}><span className="flex items-center gap-1">{cfg.icon} {cfg.label}</span></Badge>
                  })()}
                </div>
                <p className="text-text-secondary text-sm">{selectedApp.email}</p>
                <div className="flex gap-3 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 text-sm text-text-secondary">
                    <Briefcase size={13} /> {selectedApp.experience} years experience
                  </span>
                  <span className="flex items-center gap-1 text-sm text-text-secondary">
                    <Star size={13} className="text-accent-orange" /> ${selectedApp.hourlyRate}/hr
                  </span>
                </div>
              </div>
            </div>

            {selectedApp.bio && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">Bio</h4>
                <p className="text-text-primary text-sm leading-relaxed bg-bg-primary rounded-xl p-4">{selectedApp.bio}</p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">Specialties</h4>
              <div className="flex flex-wrap gap-2">
                {selectedApp.specialties?.map(s => (
                  <Badge key={s} variant="teal">{s}</Badge>
                ))}
              </div>
            </div>

            {(selectedApp as any).credentials?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">Credentials</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedApp as any).credentials.map((c: string) => (
                    <Badge key={c} variant="purple"><Award size={11} className="mr-1" />{c}</Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedApp.documents?.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2 hover:text-text-primary transition-colors w-full"
                  onClick={() => setExpandedDocs(v => !v)}
                  aria-expanded={expandedDocs}
                >
                  <Download size={14} /> Attached Documents ({selectedApp.documents.length})
                  {expandedDocs ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
                </button>
                <AnimatePresence>
                  {expandedDocs && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2">
                        {selectedApp.documents.map((doc, i) => (
                          <a
                            key={i}
                            href={`${import.meta.env.VITE_API_URL || ''}${doc}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 bg-bg-primary rounded-xl text-sm text-accent-purple hover:bg-bg-card-hover transition-colors"
                          >
                            <Download size={14} />
                            <span className="truncate">{doc.split('/').pop() || `Document ${i + 1}`}</span>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {selectedApp.reviewNotes && (
              <div>
                <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">Review Notes</h4>
                <div className="flex items-start gap-2 p-4 bg-bg-primary rounded-xl">
                  <AlertCircle size={14} className="text-accent-orange mt-0.5 flex-shrink-0" />
                  <p className="text-text-primary text-sm">{selectedApp.reviewNotes}</p>
                </div>
              </div>
            )}

            {selectedApp.status === 'pending' && (
              <div className="flex gap-3 pt-2 border-t border-border-color">
                <Button
                  className="flex-1"
                  leftIcon={<CheckCircle size={16} />}
                  onClick={() => { setActionModal({ type: 'approve', app: selectedApp }); setActionNotes('') }}
                >
                  Approve Application
                </Button>
                <Button
                  className="flex-1 !text-red-400 border-red-500/30"
                  variant="ghost"
                  leftIcon={<XCircle size={16} />}
                  onClick={() => { setActionModal({ type: 'reject', app: selectedApp }); setActionNotes('') }}
                >
                  Reject Application
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setActionNotes('') }}
        title={actionModal?.type === 'approve' ? 'Approve Application' : 'Reject Application'}
        size="sm"
      >
        {actionModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-xl">
              <Avatar src={actionModal.app.avatar} name={actionModal.app.name} size="sm" />
              <div>
                <p className="font-semibold text-text-primary text-sm">{actionModal.app.name}</p>
                <p className="text-xs text-text-secondary">{actionModal.app.email}</p>
              </div>
            </div>

            {actionModal.type === 'approve' ? (
              <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-text-primary">
                  This will approve the trainer application and notify {actionModal.app.name} via email and in-app notification.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-text-primary">
                  This will reject the application. Please provide a clear reason so the applicant can improve their submission.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                {actionModal.type === 'approve' ? 'Notes (optional)' : 'Reason for rejection *'}
              </label>
              <textarea
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                placeholder={actionModal.type === 'approve'
                  ? 'Any notes for the trainer...'
                  : 'Please explain why the application is being rejected...'}
                rows={3}
                className="w-full bg-bg-primary border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => { setActionModal(null); setActionNotes('') }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${actionModal.type === 'reject' ? '!bg-red-500 hover:!bg-red-600' : ''}`}
                leftIcon={actionModal.type === 'approve' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                onClick={actionModal.type === 'approve' ? handleApprove : handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : actionModal.type === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
