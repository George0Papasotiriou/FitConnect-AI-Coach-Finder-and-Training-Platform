import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Phone, Video, X } from 'lucide-react'
import { useSocket } from '../../hooks/useSocket'
import { useAuthStore } from '../../store/authStore'

export default function IncomingCallModal() {
  const [incomingCall, setIncomingCall] = useState<{ conversationId: string; callerName: string; type: string } | null>(null)
  const { on, emit } = useSocket()
  const navigate = useNavigate()
  const { token } = useAuthStore()

  useEffect(() => {
    if (!token) return;

    let localAudio: HTMLAudioElement | null = null;
    
    const removeListener = on('incoming_call', (data: any) => {
      setIncomingCall(data)
      
      // Soothing but alarming synth bell (Base64 MP3/WAV generated for browser play without asset)
      // Actually, building a quick Web Audio API oscillator is much smaller and cleaner!
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); 
        
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 1.5);
      };
      
      // Play tone every 2 seconds
      playTone();
      const interval = setInterval(playTone, 2000);
      
      // Store cleanup on component
      (window as any)._ringtoneInterval = interval;
    })
    
    return () => {
      removeListener()
      if ((window as any)._ringtoneInterval) {
        clearInterval((window as any)._ringtoneInterval);
      }
    }
  }, [on, token])

  const acceptCall = () => {
    if (incomingCall) {
      if ((window as any)._ringtoneInterval) clearInterval((window as any)._ringtoneInterval);
      if (incomingCall.type === 'audio') {
        navigate(`/call/${incomingCall.conversationId}?type=chat&audio=true&name=${encodeURIComponent(incomingCall.callerName)}`)
      } else {
        navigate(`/call/${incomingCall.conversationId}?type=chat&name=${encodeURIComponent(incomingCall.callerName)}`)
      }
      setIncomingCall(null)
    }
  }

  const declineCall = () => {
    if (incomingCall) {
      if ((window as any)._ringtoneInterval) clearInterval((window as any)._ringtoneInterval);
      // Emit to socket to notify caller
      emit('call_declined', { sessionId: incomingCall.conversationId });
      setIncomingCall(null)
    }
  }

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] bg-surface-dark border border-white/10 rounded-2xl p-6 shadow-[0_0_40px_rgba(34,211,238,0.15)] flex flex-col items-center min-w-[320px] backdrop-blur-xl"
        >
          <div className="w-20 h-20 rounded-full bg-accent-teal/20 flex items-center justify-center mb-4 relative">
            <div className="absolute inset-0 rounded-full bg-accent-teal/20 animate-ping opacity-75"></div>
            {incomingCall.type === 'video' ? <Video size={36} className="text-accent-teal" /> : <Phone size={36} className="text-accent-teal" />}
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">Incoming Call</h3>
          <p className="text-text-secondary text-lg mb-8">{incomingCall.callerName} is calling you</p>
          
          <div className="flex gap-4 w-full">
            <button
              onClick={declineCall}
              className="flex-1 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
            >
              <X size={20} /> Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 py-3 bg-accent-teal text-white shadow-lg shadow-accent-teal/20 hover:shadow-accent-teal/40 hover:bg-accent-teal/90 rounded-xl transition-all font-semibold flex items-center justify-center gap-2"
            >
              {incomingCall.type === 'video' ? <Video size={20} /> : <Phone size={20} />} Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
