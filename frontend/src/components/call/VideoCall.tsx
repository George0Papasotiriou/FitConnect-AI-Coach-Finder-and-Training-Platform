import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWebRTC } from '../../hooks/useWebRTC'
import CallControls from './CallControls'
import PostCallRating from './PostCallRating'
import AICallAssistant from './AICallAssistant'

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
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })

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

  useEffect(() => {
    const updateSize = () => {
        if (containerRef.current) {
            setContainerSize({
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight
            })
        }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const resetControlsTimeout = () => {
      setShowControls(true)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => {
          if (isConnected) setShowControls(false)
      }, 4000)
  }

  useEffect(() => {
      resetControlsTimeout()
      return () => {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      }
  }, [isConnected])

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
    if (isSketchMode && canvasRef.current && containerRef.current) {
      canvasRef.current.width = containerRef.current.offsetWidth
      canvasRef.current.height = containerRef.current.offsetHeight
    }
  }, [isSketchMode, containerSize])

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col md:flex-row touch-none"
        aria-label="Video call"
        onClick={resetControlsTimeout}
        onMouseMove={resetControlsTimeout}
        onTouchStart={resetControlsTimeout}
      >
        <div ref={containerRef} className="relative flex-1 overflow-hidden bg-black flex flex-col md:block">
          {/* Main Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover md:h-full md:w-full"
            aria-label="Remote video"
          />

          <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-10 w-full h-full touch-none ${isSketchMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            style={{ touchAction: 'none' }}
          />

          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-bg-primary z-20">
              <div className="text-center space-y-4 px-4">
                <div className="w-20 h-20 rounded-full bg-accent-purple/20 flex items-center justify-center mx-auto">
                  <div className="w-12 h-12 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-text-primary font-medium text-lg">Connecting to {trainerName}...</p>
                <p className="text-sm text-text-secondary">Establishing secure connection</p>
              </div>
            </div>
          )}

          {/* Local Video PIP - Draggable */}
          <motion.div
            drag
            dragConstraints={containerRef}
            dragElastic={0.1}
            dragMomentum={false}
            className="absolute z-20 top-4 right-4 w-28 h-40 md:w-32 md:h-48 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-move bg-gray-900"
            aria-label="Your video"
            style={{ touchAction: 'none' }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </motion.div>

          {/* Header Info Banner */}
          <AnimatePresence>
            {showControls && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-5 py-2.5 z-30 shadow-lg border border-white/10"
                >
                    {isConnected ? (
                        <span className="w-2.5 h-2.5 bg-accent-teal rounded-full animate-pulse shadow-[0_0_8px_#059669]" aria-hidden="true" />
                    ) : (
                        <span className="w-2.5 h-2.5 bg-accent-orange rounded-full animate-pulse" aria-hidden="true" />
                    )}
                    <span className="text-white text-sm font-mono font-medium tracking-wider" aria-live="polite" aria-atomic="true">
                    {formatDuration(callDuration)}
                    </span>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls Bar */}
        <AnimatePresence>
            {showControls && (
                <motion.div 
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="absolute bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-black/90 via-black/60 to-transparent pb-[env(safe-area-inset-bottom,24px)] pt-12 px-2 md:px-4"
                >
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
                        onEndCall={handleEnd}
                    />
                </motion.div>
            )}
        </AnimatePresence>
        
        {/* Render AICallAssistant INSIDE the Z-100 modal container so it stays on top */}
        <AnimatePresence>
          {showAI && <AICallAssistant onClose={() => setShowAI(false)} />}
        </AnimatePresence>
        
      </motion.div>

      <PostCallRating
        isOpen={showRating}
        sessionId={sessionId}
        trainerName={trainerName}
        onClose={() => { setShowRating(false); onClose() }}
      />
    </>
  )
}
