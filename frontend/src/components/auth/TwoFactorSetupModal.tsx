import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Copy, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Button from '../common/Button'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function TwoFactorSetupModal({ isOpen, onClose }: Props) {
  const { user, setUser } = useAuthStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (isOpen && !qrCode) {
      loadSetup()
    }
    if (!isOpen) {
      setTimeout(() => {
        setStep(1)
        setCode('')
      }, 300)
    }
  }, [isOpen])

  const loadSetup = async () => {
    setIsLoading(true)
    try {
      const data = await authApi.setup2FA()
      setQrCode(data.qrCode)
      setSecret(data.secret)
    } catch (err) {
      toast.error('Failed to load 2FA setup. Please try again.')
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (code.length < 6) return
    setIsVerifying(true)
    try {
      await authApi.verify2FA(code)
      if (user) {
        setUser({ ...user, twoFactorEnabled: true })
      }
      toast.success('Two-Factor Authentication enabled successfully!')
      onClose()
    } catch (err) {
      toast.error('Invalid code. Please try again.')
      setCode('')
    } finally {
      setIsVerifying(false)
    }
  }

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast.success('Secret key copied to clipboard')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md glass-card rounded-3xl p-6 overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-black/10 dark:hover:bg-white/10">
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 bg-accent-purple/10 rounded-full flex items-center justify-center mb-4">
            <ShieldCheck size={28} className="text-accent-purple" />
          </div>
          <h2 className="text-2xl font-black text-text-primary mb-2">Secure Your Account</h2>
          <p className="text-sm text-text-secondary mb-6 px-4">
            Add an extra layer of security to your AbiliFit account using an Authenticator app.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="animate-spin text-accent-purple" size={32} />
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 flex items-center justify-center shadow-inner">
                    {qrCode && <img src={qrCode} alt="2FA QR Code" className="w-full h-full object-contain" />}
                  </div>
                  
                  <div className="bg-bg-primary border border-border-color rounded-xl p-3">
                    <p className="text-xs text-text-secondary font-medium mb-1 uppercase tracking-wider">Manual Setup Key</p>
                    <div className="flex items-center justify-between">
                      <code className="text-sm font-mono text-text-primary break-all pr-2">{secret}</code>
                      <button onClick={copySecret} className="text-accent-purple hover:text-accent-teal transition-colors p-1" title="Copy Key">
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="ghost" fullWidth onClick={onClose}>Cancel</Button>
                    <Button fullWidth onClick={() => setStep(2)}>Next Step</Button>
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="bg-bg-primary border border-border-color rounded-xl p-4">
                <label className="block text-sm font-medium text-text-primary mb-2">Enter Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="glass-input w-full p-4 rounded-xl text-center text-2xl font-mono tracking-[0.5em] text-text-primary placeholder:text-text-secondary/30 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-start gap-2 text-xs text-text-secondary bg-accent-orange/10 border border-accent-orange/20 p-3 rounded-xl text-accent-orange">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>Ensure you have safely saved your recovery options before finalizing this step.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" fullWidth onClick={() => setStep(1)}>Back</Button>
                <Button fullWidth onClick={handleVerify} isLoading={isVerifying} disabled={code.length < 6}>
                  Verify & Enable
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
