import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebRTC } from '../../hooks/useWebRTC'
import CallControls from './CallControls'
import PostCallRating from './PostCallRating'
import AICallAssistant from './AICallAssistant'
import AIRepCounter from './AIRepCounter'
import { format } from 'date-fns'

interface VideoCallProps {
  sessionId: string
  isInitiator: boolean
  trainerName: string
  onClose: () => void
  isAdhoc?: boolean
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function VideoCall({ sessionId, isInitiator, trainerName, onClose, isAdhoc }: VideoCallProps) {
  const [showRating, setShowRating] = useState(false)
  const [isSketchMode, setIsSketchMode] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const handleCallEnded = () => {
    if (isAdhoc) onClose()
    else setShowRating(true)
  }

  const {
    localVideoRef, remoteVideoRef,
    isMuted, isCameraOff, isScreenSharing, isConnected, callDuration,
    startCall, endCall, toggleMute, toggleCamera, toggleScreenShare
  } = useWebRTC({ sessionId, isInitiator, onCallEnded: handleCallEnded })

  useEffect(() => {
    startCall()
  }, [])

  const handleEnd = () => {
    endCall()
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isSketchMode || !canvasRef.current) return
    setIsDrawing(true)
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#10b981'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top
    
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top
    
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearCanvas = () => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
  }

  useEffect(() => {
    if (isSketchMode && canvasRef.current) {
      canvasRef.current.width = canvasRef.current.offsetWidth
      canvasRef.current.height = canvasRef.current.offsetHeight
    }
  }, [isSketchMode])

  const [showRepCounter, setShowRepCounter] = useState(false)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
        aria-label="Video call"
      >
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            aria-label="Remote video"
          />

          <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-10 w-full h-full pointer-events-${isSketchMode ? 'auto' : 'none'}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-primary">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-accent-purple/20 flex items-center justify-center mx-auto">
                  <div className="w-12 h-12 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-text-primary font-medium">Connecting to {trainerName}...</p>
              </div>
            </div>
          )}

          <motion.div
            drag
            dragConstraints={{ left: 0, right: 200, top: 0, bottom: 400 }}
            className="absolute top-4 right-4 w-32 h-24 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl cursor-move"
            aria-label="Your video"
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </motion.div>

          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            {isConnected && (
              <span className="w-2 h-2 bg-accent-teal rounded-full animate-pulse" aria-hidden="true" />
            )}
            <span className="text-white text-sm font-mono" aria-live="polite" aria-atomic="true">
              {formatDuration(callDuration)}
            </span>
          </div>
        </div>

        <div className="bg-black/90 backdrop-blur-sm py-6 px-4">
          <CallControls
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isScreenSharing={isScreenSharing}
            isSketchMode={isSketchMode}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onToggleScreenShare={toggleScreenShare}
            onToggleSketch={() => {
              if (isSketchMode) clearCanvas()
              setIsSketchMode(!isSketchMode)
            }}
            onToggleAI={() => setShowAI(!showAI)}
            isAIActive={showAI}
            onToggleRepCounter={() => setShowRepCounter(!showRepCounter)}
            isRepCounterActive={showRepCounter}
            onEndCall={handleEnd}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {showAI && <AICallAssistant onClose={() => setShowAI(false)} />}
        {showRepCounter && <AIRepCounter onClose={() => setShowRepCounter(false)} />}
      </AnimatePresence>

      <PostCallRating
        isOpen={showRating}
        sessionId={sessionId}
        trainerName={trainerName}
        onClose={() => { setShowRating(false); onClose() }}
      />
    </>
  )
}
