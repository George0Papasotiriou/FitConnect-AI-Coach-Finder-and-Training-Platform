import { useEffect, useState, useRef } from 'react'
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
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!token) return;

    const removeListener = on('incoming_call', (data: any) => {
      setIncomingCall(data)
      
      if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 500])
      }
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      // Handle Autoplay policy block - resume context if user interacts with the document
      if (audioCtx.state === 'suspended') {
          const resumeAudio = () => {
              audioCtx.resume();
              document.removeEventListener('click', resumeAudio);
              document.removeEventListener('touchstart', resumeAudio);
          }
          document.addEventListener('click', resumeAudio);
          document.addEventListener('touchstart', resumeAudio);
      }
      
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
      
      playTone();
      const interval = setInterval(() => {
          playTone();
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }, 2000);
      
      (window as any)._ringtoneInterval = interval;
    })
    
    return () => {
      removeListener()
      if ((window as any)._ringtoneInterval) {
        clearInterval((window as any)._ringtoneInterval);
      }
      if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(console.error);
      }
    }
  }, [on, token])

  const cleanupCall = () => {
      if ((window as any)._ringtoneInterval) {
          clearInterval((window as any)._ringtoneInterval);
      }
      if (navigator.vibrate) navigator.vibrate(0);
      if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(console.error);
          audioCtxRef.current = null;
      }
  }

  const acceptCall = () => {
    if (incomingCall) {
      cleanupCall();
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
      cleanupCall();
      emit('call_declined', { sessionId: incomingCall.conversationId });
      setIncomingCall(null)
    }
  }

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, info) => {
              if (info.offset.y > 100) declineCall();
          }}
          className="fixed bottom-0 left-0 right-0 md:top-8 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:translate-y-0 md:w-96 z-[9999] bg-bg-card border-t md:border border-border-color rounded-t-3xl md:rounded-2xl p-6 shadow-2xl flex flex-col items-center backdrop-blur-xl pb-[env(safe-area-inset-bottom,24px)] md:pb-6"
        >
          <div className="w-12 h-1 bg-border-color rounded-full mb-6 md:hidden" />
          
          <div className="w-20 h-20 rounded-full bg-accent-teal/20 flex items-center justify-center mb-4 relative">
            <div className="absolute inset-0 rounded-full bg-accent-teal/20 animate-ping opacity-75"></div>
            {incomingCall.type === 'video' ? <Video size={36} className="text-accent-teal" /> : <Phone size={36} className="text-accent-teal" />}
          </div>
          <h3 className="text-2xl font-bold text-text-primary mb-1">Incoming Call</h3>
          <p className="text-text-secondary text-lg mb-8">{incomingCall.callerName} is calling you</p>
          
          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={declineCall}
              className="flex-1 py-4 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-2xl transition-colors font-bold flex items-center justify-center gap-2"
            >
              <X size={20} /> Decline
            </button>
            <button
              onClick={acceptCall}
              className="flex-1 py-4 bg-accent-teal text-white shadow-lg shadow-accent-teal/20 hover:shadow-accent-teal/40 hover:bg-accent-teal/90 rounded-2xl transition-all font-bold flex items-center justify-center gap-2"
            >
              {incomingCall.type === 'video' ? <Video size={20} /> : <Phone size={20} />} Accept
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
