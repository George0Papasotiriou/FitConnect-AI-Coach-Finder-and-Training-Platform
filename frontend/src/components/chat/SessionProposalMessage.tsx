import { useState } from 'react'
import { Calendar as CalendarIcon, Clock, Video, Users, CheckCircle, XCircle, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { sessionApi } from '../../api/session'
import { chatApi, Message } from '../../api/chat'
import Button from '../common/Button'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'

interface SessionProposalMessageProps {
  message: Message
  isOwn: boolean
}

export default function SessionProposalMessage({ message, isOwn }: SessionProposalMessageProps) {
  const { user } = useAuthStore()
  const updateMessageText = useChatStore(s => s.updateMessageText)
  const isTrainee = user?.role === 'trainee'
  const [isProcessing, setIsProcessing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Parse payload
  let payload: any = {}
  try {
    payload = JSON.parse(message.content)
  } catch (e) {
    return <div className="text-red-400 text-sm">Invalid session proposal data</div>
  }

  const status = payload.status || 'pending'
  const isPending = status === 'pending'
  const isAccepted = status === 'accepted'
  const isDeclined = status === 'declined'
  const isCountered = status === 'countered'

  const formatType = payload.format || 'video'
  
  // Local state for editing mode
  const [editedDates, setEditedDates] = useState<string[]>(payload.dates || [])
  const [editedTimes, setEditedTimes] = useState<Record<string, string>>(payload.times || {})

  const handleAccept = async () => {
    setIsProcessing(true)
    try {
      for (const date of payload.dates || []) {
        const timeStr = payload.times?.[date] || '10:00'
        const scheduledAt = new Date(`${date}T${timeStr}:00`).toISOString()
        await sessionApi.createSession({
          trainerId: payload.trainerId || (isOwn ? user?.id : message.senderId),
          traineeId: payload.traineeId || (isOwn ? message.senderId : user?.id),
          type: formatType,
          scheduledAt
        })
      }

      const updatedPayload = { ...payload, status: 'accepted' }
      const newContent = JSON.stringify(updatedPayload)
      await chatApi.updateMessage(message.conversationId, message.id, newContent)
      updateMessageText(message.conversationId, message.id, newContent)
      
      toast.success('Sessions successfully scheduled!')
    } catch (err) {
      toast.error('Failed to schedule sessions')
    }
    setIsProcessing(false)
  }

  const handleDecline = async () => {
    setIsProcessing(true)
    try {
      const updatedPayload = { ...payload, status: 'declined' }
      const newContent = JSON.stringify(updatedPayload)
      await chatApi.updateMessage(message.conversationId, message.id, newContent)
      updateMessageText(message.conversationId, message.id, newContent)
      toast.success('Proposal declined')
    } catch (err) {
      toast.error('Failed to update proposal')
    }
    setIsProcessing(false)
  }

  const handleSendCounterProposal = async () => {
    if (editedDates.length === 0) return toast.error('Please select at least one date')
    setIsProcessing(true)
    try {
      // 1. Mark current proposal as countered
      const counteredPayload = { ...payload, status: 'countered' }
      const counteredContent = JSON.stringify(counteredPayload)
      await chatApi.updateMessage(message.conversationId, message.id, counteredContent)
      updateMessageText(message.conversationId, message.id, counteredContent)

      // 2. Send new proposal back to trainer
      const newPayload = {
        ...payload,
        status: 'pending',
        dates: editedDates,
        times: editedTimes,
        trainerId: payload.trainerId || message.senderId,
        traineeId: payload.traineeId || user?.id
      }
      await chatApi.sendMessage(message.conversationId, JSON.stringify(newPayload), 'session_proposal')
      
      toast.success('Counter-proposal sent!')
      setIsEditing(false)
    } catch (err) {
      toast.error('Failed to send counter-proposal')
    }
    setIsProcessing(false)
  }

  const updateTime = (dateStr: string, val: string) => setEditedTimes(prev => ({ ...prev, [dateStr]: val }))
  const removeDate = (dateStr: string) => setEditedDates(prev => prev.filter(d => d !== dateStr))

  return (
    <div className={`w-64 sm:w-80 overflow-hidden flex flex-col ${isOwn ? 'bg-white/5' : 'bg-bg-primary'} rounded-xl border ${isOwn ? 'border-white/10' : 'border-border-color'}`}>
      
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isOwn ? 'border-white/10 bg-white/5' : 'border-border-color bg-bg-card-hover'}`}>
        <h4 className={`font-bold flex items-center gap-2 ${isOwn ? 'text-white' : 'text-text-primary'}`}>
          <CalendarIcon size={16} className={isOwn ? 'text-white/80' : 'text-accent-purple'} /> 
          Session Proposal
        </h4>
        {isAccepted && <CheckCircle size={16} className="text-green-400" />}
        {isDeclined && <XCircle size={16} className="text-red-400" />}
      </div>

      <div className="p-4 space-y-4">
        
        <div className="flex items-center gap-2 text-sm">
          <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${isOwn ? 'bg-white/10 text-white' : 'bg-accent-teal/10 text-accent-teal'}`}>
            {formatType === 'video' ? <Video size={12} className="inline mr-1" /> : formatType === 'in-person' ? <Users size={12} className="inline mr-1" /> : null}
            {formatType}
          </span>
          <span className={`text-xs ${isOwn ? 'text-white/60' : 'text-text-secondary'}`}>
            {(isEditing ? editedDates : payload.dates || []).length} Session{((isEditing ? editedDates : payload.dates || []).length) > 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2">
          {(isEditing ? editedDates : payload.dates || []).map((date: string) => (
            <div key={date} className={`flex items-center justify-between p-2 rounded-lg group ${isOwn ? 'bg-white/5' : 'bg-bg-card'}`}>
              <span className={`text-sm font-semibold ${isOwn ? 'text-white' : 'text-text-primary'}`}>
                {format(new Date(date), 'MMM do, EEEE')}
              </span>
              
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={editedTimes[date] || '10:00'}
                    onChange={e => updateTime(date, e.target.value)}
                    className="bg-transparent border-none text-xs text-accent-purple font-bold focus:outline-none focus:ring-0 w-20 text-right p-0"
                  />
                  <button onClick={() => removeDate(date)} className="text-text-secondary hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <span className={`text-xs flex items-center gap-1 ${isOwn ? 'text-white/70' : 'text-text-secondary'}`}>
                  <Clock size={10} /> {payload.times?.[date] || '10:00'}
                </span>
              )}
            </div>
          ))}
        </div>

        {isPending && !isOwn && !isEditing && (
          <div className="pt-2 flex flex-col gap-2">
            <Button size="sm" onClick={handleAccept} isLoading={isProcessing} className="w-full">
              Accept Schedule
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleDecline} isLoading={isProcessing} className="flex-1" aria-label="Decline">
                Decline
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)} className="flex-1" aria-label="Modify">
                Modify
              </Button>
            </div>
          </div>
        )}

        {isEditing && (
          <div className="pt-2 flex flex-col gap-2">
            <Button size="sm" variant="teal" onClick={handleSendCounterProposal} isLoading={isProcessing} className="w-full">
              Send Counter-Proposal
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="w-full">
              Cancel
            </Button>
          </div>
        )}

        {isPending && isOwn && (
          <div className="pt-2 text-center">
            <span className="text-xs text-white/60 italic">Waiting for response...</span>
          </div>
        )}

        {isAccepted && (
          <div className="pt-2 text-center">
            <span className="text-xs font-bold text-green-400">Sessions Scheduled</span>
          </div>
        )}
        
        {isDeclined && (
          <div className="pt-2 text-center">
            <span className="text-xs font-bold text-red-400">Proposal Declined</span>
          </div>
        )}

        {isCountered && (
          <div className="pt-2 text-center">
            <span className={`text-xs font-bold ${isOwn ? 'text-white/60' : 'text-text-secondary'}`}>Counter-proposal Sent</span>
          </div>
        )}

      </div>
    </div>
  )
}
