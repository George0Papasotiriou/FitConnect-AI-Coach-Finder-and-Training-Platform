import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Smartphone, AlertTriangle, X, CheckCircle2, ChevronRight, Copy, Loader2 } from 'lucide-react'
import { authApi } from '../../api/auth'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'

interface TwoFactorSetupProps {
  onComplete: () => void
  onSkip: () => void
}

export default function TwoFactorSetup({ onComplete, onSkip }: TwoFactorSetupProps) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<{ qrCode: string; secret: string } | null>(null)
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { user, setUser } = useAuthStore()

  useEffect(() => {
    if (step === 2 && !data) {
      loadSetup()
    }
  }, [step])

  const loadSetup = async () => {
    setIsLoading(true)
    try {
      const res = await authApi.setup2FA()
      setData(res)
    } catch {
      toast.error('Failed to initialize 2FA setup')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (token.length !== 6) return
    setIsLoading(true)
    try {
      await authApi.verify2FA(token)
      if (user) setUser({ ...user, twoFactorEnabled: true })
      toast.success('2FA successfully enabled!')
      onComplete()
    } catch {
      toast.error('Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-surface-dark border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
                <Shield className="text-accent-purple" size={20} />
              </div>
              <h2 className="text-xl font-bold text-white">Enable 2FA</h2>
            </div>
            <button 
              onClick={onSkip}
              className="p-2 rounded-lg text-text-secondary hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4">
                  <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-amber-500 uppercase tracking-wider">Critical Warning</p>
                    <p className="text-sm text-text-primary leading-relaxed">
                      Without 2FA enabled, there is <span className="font-bold text-white">no way to verify your identity</span> for password resets. If you lose your password, your account will be permanently inaccessible.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-text-secondary text-sm leading-relaxed text-center px-4">
                    Protect your hard-earned progress and private coaching data with Google Authenticator.
                  </p>
                  
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-white/90 transition-all flex items-center justify-center gap-2 group"
                  >
                    Start Setup
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <button
                    onClick={onSkip}
                    className="w-full py-3 text-text-secondary font-medium text-sm hover:text-white transition-colors"
                  >
                    I understand the risk, skip for now
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 text-center"
              >
                {isLoading && !data ? (
                  <div className="py-12 flex flex-col items-center gap-4">
                    <Loader2 className="text-accent-teal animate-spin" size={32} />
                    <p className="text-text-secondary text-sm">Generating your secret...</p>
                  </div>
                ) : data && (
                  <>
                    <div className="bg-white p-4 rounded-3xl inline-block shadow-xl shadow-accent-teal/10">
                      <QRCodeSVG value={`otpauth://totp/InstaCoach:${user?.email}?secret=${data.secret}&issuer=InstaCoach`} size={180} />
                    </div>

                    <div className="space-y-4 text-left">
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl">
                        <div className="w-6 h-6 rounded-full bg-accent-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-accent-teal">1</span>
                        </div>
                        <p className="text-sm text-text-primary">Download Google Authenticator app</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl">
                        <div className="w-6 h-6 rounded-full bg-accent-teal/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-accent-teal">2</span>
                        </div>
                        <p className="text-sm text-text-primary">Scan the QR code or enter secret manually</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-black/40 rounded-xl border border-white/5 group">
                      <code className="text-accent-teal font-mono text-sm flex-1">{data.secret}</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(data.secret)
                          toast.success('Secret copied to clipboard')
                        }}
                        className="p-1.5 text-text-secondary hover:text-white transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>

                    <button
                      onClick={() => setStep(3)}
                      className="w-full py-4 bg-accent-teal text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-accent-teal/20"
                    >
                      I scanned it
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center space-y-2 mb-8">
                  <Smartphone className="text-accent-teal mx-auto" size={48} />
                  <h3 className="text-lg font-bold text-white">Verification</h3>
                  <p className="text-sm text-text-secondary">Enter the 6-digit code from your app</p>
                </div>

                <div className="flex justify-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                    placeholder="000 000"
                    className="w-full text-center bg-black/30 border border-white/10 rounded-2xl py-5 text-3xl font-black tracking-[0.5em] text-accent-teal focus:outline-none focus:border-accent-teal/50 transition-all placeholder:text-white/10"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleVerify}
                  disabled={token.length !== 6 || isLoading}
                  className="w-full py-4 bg-accent-teal text-white font-bold rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-accent-teal/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verify & Enable'}
                </button>

                <button
                  onClick={() => setStep(2)}
                  className="w-full text-sm text-text-secondary hover:text-white transition-colors"
                >
                  Back to QR Code
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
