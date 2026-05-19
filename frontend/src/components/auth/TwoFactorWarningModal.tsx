import { motion } from 'framer-motion'
import { ShieldAlert } from 'lucide-react'
import Button from '../common/Button'

interface Props {
  onSetupNow: () => void
  onSkip: () => void
}

export default function TwoFactorWarningModal({ onSetupNow, onSkip }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md glass-card rounded-3xl p-8 overflow-hidden text-center"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-orange to-red-500" />

        <div className="w-20 h-20 bg-accent-orange/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} className="text-accent-orange" />
        </div>

        <h2 className="text-2xl font-black text-text-primary mb-3">Protect Your Account</h2>
        <p className="text-text-secondary mb-8">
          You haven't enabled Two-Factor Authentication (2FA) yet. We highly recommend setting it up now to keep your fitness data and personal information secure.
        </p>

        <div className="space-y-3">
          <Button fullWidth onClick={onSetupNow} className="!bg-accent-orange hover:!bg-accent-orange/90 !border-accent-orange/50 !text-white !shadow-lg !shadow-accent-orange/20">
            Set up 2FA now
          </Button>
          <Button variant="ghost" fullWidth onClick={onSkip}>
            Maybe later
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
