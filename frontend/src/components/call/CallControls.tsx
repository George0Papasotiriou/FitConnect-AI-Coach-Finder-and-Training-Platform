import { Mic, MicOff, Video, VideoOff, Monitor, PhoneOff } from 'lucide-react'
import { motion } from 'framer-motion'

interface CallControlsProps {
  isMuted: boolean
  isCameraOff: boolean
  isScreenSharing: boolean
  onToggleMute: () => void
  onToggleCamera: () => void
  onToggleScreenShare: () => void
  onEndCall: () => void
}

export default function CallControls({
  isMuted, isCameraOff, isScreenSharing,
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
      onClick={onClick}
      className={`p-4 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        danger
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : active
            ? 'bg-bg-card-hover text-text-secondary border border-border-color'
            : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
      }`}
      aria-label={label}
      aria-pressed={!danger ? active : undefined}
    >
      {icon}
    </motion.button>
  )

  return (
    <div className="flex items-center justify-center gap-4" role="toolbar" aria-label="Call controls">
      {controlBtn(onToggleMute, isMuted ? <MicOff size={22} /> : <Mic size={22} />, isMuted ? 'Unmute' : 'Mute', isMuted)}
      {controlBtn(onToggleCamera, isCameraOff ? <VideoOff size={22} /> : <Video size={22} />, isCameraOff ? 'Turn on camera' : 'Turn off camera', isCameraOff)}
      {controlBtn(onToggleScreenShare, <Monitor size={22} />, isScreenSharing ? 'Stop screen share' : 'Share screen', isScreenSharing)}
      {controlBtn(onEndCall, <PhoneOff size={22} />, 'End call', false, true)}
    </div>
  )
}
