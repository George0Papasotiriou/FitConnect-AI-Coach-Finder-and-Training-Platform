import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Pencil, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

interface CallControlsProps {
  isMuted: boolean
  isCameraOff: boolean
  isScreenSharing: boolean
  onToggleMute: () => void
  onToggleCamera: () => void
  onToggleScreenShare: () => void
  onToggleSketch?: () => void
  isSketchMode?: boolean
  onToggleAI?: () => void
  isAIActive?: boolean
  onEndCall: () => void
}

export default function CallControls({
  isMuted, isCameraOff, isScreenSharing, onToggleSketch, isSketchMode,
  onToggleAI, isAIActive,
  onToggleMute, onToggleCamera, onToggleScreenShare, onEndCall
}: CallControlsProps) {
  const controlBtn = (
    onClick: () => void,
    icon: React.ReactNode,
    label: string,
    active = false,
    danger = false
  ) => (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(50)
        onClick()
      }}
      className={`p-3 md:p-4 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center ${
        danger
          ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)]'
          : active
            ? 'bg-white text-black shadow-lg scale-105'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md'
      }`}
      aria-label={label}
      aria-pressed={!danger ? active : undefined}
      title={label}
    >
      {icon}
    </motion.button>
  )
  
  // Need to detect mobile for rendering
  const isMobile = window.innerWidth < 768

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 overflow-x-auto w-full scrollbar-hidden max-w-[100vw] px-4 touch-pan-x" role="toolbar" aria-label="Call controls">
      {controlBtn(onToggleMute, isMuted ? <MicOff size={22} className={isMuted ? "text-red-500" : ""} /> : <Mic size={22} />, isMuted ? 'Unmute' : 'Mute', isMuted)}
      {controlBtn(onToggleCamera, isCameraOff ? <VideoOff size={22} className={isCameraOff ? "text-red-500" : ""} /> : <Video size={22} />, isCameraOff ? 'Turn on camera' : 'Turn off camera', isCameraOff)}
      {!isMobile && controlBtn(onToggleScreenShare, <Monitor size={22} />, isScreenSharing ? 'Stop screen share' : 'Share screen', isScreenSharing)}
      {onToggleSketch && controlBtn(onToggleSketch, <Pencil size={22} />, isSketchMode ? 'Stop sketching' : 'Start sketching', isSketchMode)}
      {onToggleAI && controlBtn(onToggleAI, <Zap size={22} className={isAIActive ? "text-accent-teal" : ""} />, isAIActive ? 'Hide AI Assistant' : 'Show AI Assistant', isAIActive)}
      {controlBtn(onEndCall, <PhoneOff size={22} />, 'End call', false, true)}
    </div>
  )
}
