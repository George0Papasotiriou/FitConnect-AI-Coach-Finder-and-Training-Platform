import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Clock, Video, User, X, Plus } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { trainerApi, ClientRequest } from '../../api/trainer'
import { chatApi } from '../../api/chat'
import Button from '../common/Button'
import Avatar from '../common/Avatar'
import { toast } from 'sonner'

interface ArrangeSessionModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ArrangeSessionModal({ isOpen, onClose }: ArrangeSessionModalProps) {
  const [clients, setClients] = useState<ClientRequest[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  
  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDates, setSelectedDates] = useState<Record<string, string>>({}) // date string -> time string
  const [globalTime, setGlobalTime] = useState('10:00')
  const [sessionType, setSessionType] = useState<'video' | 'audio' | 'in-person'>('video')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      trainerApi.getClients().then(data => {
        setClients(data.filter(c => c.status === 'accepted'))
      }).catch(() => {})
    }
  }, [isOpen])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startDayOfWeek = monthStart.getDay()
  const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1

  const toggleDate = (day: Date) => {
    // Prevent selecting past dates (before today)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (day < today) {
      toast.error('Cannot schedule a session in the past')
      return
    }

    const key = format(day, 'yyyy-MM-dd')
    const newDates = { ...selectedDates }
    if (newDates[key]) {
      delete newDates[key]
    } else {
      newDates[key] = globalTime
    }
    setSelectedDates(newDates)
  }

  const updateTime = (dateKey: string, time: string) => {
    setSelectedDates(prev => ({ ...prev, [dateKey]: time }))
  }

  const handleSendProposal = async () => {
    if (!selectedClient) return toast.error('Please select a client')
    const dates = Object.keys(selectedDates)
    if (dates.length === 0) return toast.error('Please select at least one date')

    setIsSubmitting(true)
    try {
      // 1. Ensure conversation exists
      const conv = await chatApi.createConversation(selectedClient)
      
      // 2. Build proposal payload
      const payload = {
        action: 'session_proposal',
        status: 'pending',
        trainerId: '', // Added securely by backend typically, but we'll let message context handle it
        traineeId: selectedClient,
        dates,
        times: selectedDates,
        format: sessionType
      }

      // 3. Send message
      await chatApi.sendMessage(conv.id, JSON.stringify(payload), 'session_proposal')
      
      toast.success('Session proposal sent to client!')
      onClose()
    } catch (err) {
      toast.error('Failed to send proposal')
    }
    setIsSubmitting(false)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/20 dark:bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white/95 dark:bg-bg-card border border-white/40 dark:border-white/5 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-slate-900/10 dark:shadow-black/40 backdrop-blur-3xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border-color flex items-center justify-between bg-white/50 dark:bg-black/40 backdrop-blur-xl">
            <h2 className="text-xl font-black text-text-primary flex items-center gap-2">
              <Calendar className="text-accent-purple" size={24} />
              Arrange <span className="gradient-text">Sessions</span>
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-bg-card-hover transition-colors">
              <X size={20} className="text-text-secondary" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="p-6 grid lg:grid-cols-2 gap-8 min-h-full">
            
            {/* Left Col: Setup & Calendar */}
            <div className="space-y-6">
              
              {/* Client Selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">1. Select Client</label>
                <div className="grid gap-2">
                  {clients.length === 0 ? (
                    <p className="text-sm text-text-secondary italic">No active clients available.</p>
                  ) : (
                    clients.map(c => (
                      <button
                        key={c.trainee.id}
                        onClick={() => setSelectedClient(c.trainee.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${selectedClient === c.trainee.id ? 'border-accent-purple bg-accent-purple/10' : 'border-border-color bg-bg-primary hover:bg-bg-card-hover'}`}
                      >
                        <Avatar src={c.trainee.avatar} name={c.trainee.name} size="sm" className="rounded-full shadow-sm" />
                        <span className="font-semibold text-text-primary text-sm">{c.trainee.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Format Selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">2. Session Format</label>
                <div className="flex gap-2">
                  {(['video', 'audio', 'in-person'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setSessionType(type)}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all capitalize ${sessionType === type ? 'border-accent-teal bg-accent-teal/10 text-accent-teal' : 'border-border-color text-text-secondary hover:border-text-primary'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">3. Select Dates</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-bg-card-hover rounded-lg"><ChevronLeft size={16}/></button>
                    <span className="text-sm font-bold">{format(currentMonth, 'MMM yyyy')}</span>
                    <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-bg-card-hover rounded-lg"><ChevronRight size={16}/></button>
                  </div>
                </div>
                
                <div className="bg-bg-primary border border-border-color rounded-2xl p-4">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                      <div key={day} className="text-center text-[10px] font-bold text-text-secondary">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: paddingDays }).map((_, i) => <div key={`pad-${i}`} />)}
                    {calendarDays.map((day) => {
                      const dateKey = format(day, 'yyyy-MM-dd')
                      const isSelected = !!selectedDates[dateKey]
                      const today = isToday(day)
                      
                      const now = new Date()
                      now.setHours(0, 0, 0, 0)
                      const isPast = day < now

                      return (
                        <button
                          key={dateKey}
                          onClick={() => toggleDate(day)}
                          disabled={isPast}
                          className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${
                            isPast ? 'opacity-30 cursor-not-allowed text-text-secondary' :
                            isSelected ? 'bg-accent-purple text-white font-bold shadow-md shadow-accent-purple/20' :
                            today ? 'bg-accent-teal/20 text-accent-teal font-bold border border-accent-teal/30' :
                            'hover:bg-bg-card-hover text-text-primary font-medium'
                          }`}
                        >
                          {format(day, 'd')}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Time Configuration & Summary */}
            <div className="space-y-4 flex flex-col h-full">
              <div className="space-y-2">
                <label className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
                  <Clock size={14} /> Global Time Default
                </label>
                <input
                  type="time"
                  value={globalTime}
                  onChange={e => {
                    setGlobalTime(e.target.value)
                    // Update all currently selected dates with new global time
                    const newDates = { ...selectedDates }
                    Object.keys(newDates).forEach(k => newDates[k] = e.target.value)
                    setSelectedDates(newDates)
                  }}
                  className="w-full bg-bg-primary border border-border-color rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-accent-purple [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:transition-transform [&::-webkit-calendar-picker-indicator]:hover:scale-110 [&::-webkit-calendar-picker-indicator]:hover:rotate-12 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>

              <div className="flex-1 bg-bg-primary border border-border-color rounded-2xl p-4 flex flex-col min-h-0">
                <h3 className="font-bold text-text-primary mb-3 text-sm uppercase tracking-wider">Selected Schedule ({Object.keys(selectedDates).length})</h3>
                <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin">
                  {Object.keys(selectedDates).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                      <Calendar size={32} className="opacity-20 mb-2" />
                      <p className="text-sm">No dates selected</p>
                    </div>
                  ) : (
                    Object.entries(selectedDates).sort(([a], [b]) => a.localeCompare(b)).map(([dateStr, time]) => (
                      <div key={dateStr} className="flex items-center justify-between p-3 bg-bg-card border border-border-color rounded-xl group transition-all hover:border-accent-purple/50">
                        <span className="text-sm font-bold text-text-primary">{format(new Date(dateStr), 'MMM do, EEEE')}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={time}
                            onChange={e => updateTime(dateStr, e.target.value)}
                            className="bg-transparent border-none text-sm text-accent-purple font-bold focus:outline-none focus:ring-0 w-28 text-right [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:transition-transform [&::-webkit-calendar-picker-indicator]:hover:scale-110 [&::-webkit-calendar-picker-indicator]:hover:rotate-12 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 dark:[&::-webkit-calendar-picker-indicator]:invert"
                          />
                          <button
                            onClick={() => toggleDate(new Date(dateStr))}
                            className="p-1.5 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Remove date"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-border-color bg-white/50 dark:bg-black/40 backdrop-blur-xl flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleSendProposal} 
              isLoading={isSubmitting} 
              disabled={!selectedClient || Object.keys(selectedDates).length === 0}
              leftIcon={<Plus size={16} />}
            >
              Send Proposal via Chat
            </Button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function ChevronLeft({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
}

function ChevronRight({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
}
