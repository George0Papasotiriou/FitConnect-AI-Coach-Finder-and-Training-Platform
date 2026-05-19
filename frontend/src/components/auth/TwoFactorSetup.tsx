/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Smartphone, AlertTriangle, X, Copy, Loader2, ShieldCheck, ChevronRight } from 'lucide-react'
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
    if (step === 2 && !data) loadSetup()
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
      toast.error('Invalid verification code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md glass-surface rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[var(--accent-teal)] via-emerald-400 to-[var(--accent-teal)]" />

        <div className="p-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-teal)]/15 flex items-center justify-center">
                <Shield size={18} className="text-[var(--accent-teal)]" />
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary leading-tight">Two-Factor Authentication</h2>
                <p className="text-xs text-text-secondary">Step {step} of 3</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-[var(--glass-bg)] transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Step progress dots */}
          <div className="flex items-center gap-2 mb-7">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-[var(--accent-teal)]' : 'bg-[var(--glass-border)]'
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Step 1: Warning ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 flex gap-3">
                  <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Account at risk</p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      Without 2FA, there is <span className="font-semibold text-text-primary">no way to verify your identity</span> for password resets. A lost password means permanent account loss.
                    </p>
                  </div>
                </div>

                <p className="text-sm text-text-secondary text-center leading-relaxed px-2">
                  Secure your fitness data and coaching history with Google Authenticator — takes under 2 minutes.
                </p>

                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3.5 rounded-2xl bg-[var(--accent-teal)] hover:opacity-90 active:scale-[0.98] text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--accent-teal)]/25"
                  >
                    <ShieldCheck size={16} />
                    Enable 2FA now
                    <ChevronRight size={15} className="ml-auto opacity-70" />
                  </button>
                  <button
                    onClick={onSkip}
                    className="w-full py-3 rounded-2xl text-text-secondary hover:text-text-primary text-sm font-medium transition-colors"
                  >
                    Remind me later
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: QR Code ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {isLoading && !data ? (
                  <div className="py-14 flex flex-col items-center gap-3">
                    <Loader2 className="text-[var(--accent-teal)] animate-spin" size={28} />
                    <p className="text-sm text-text-secondary">Generating your secret…</p>
                  </div>
                ) : data && (
                  <>
                    {/* QR code */}
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-2xl shadow-lg shadow-black/10 dark:shadow-black/30 ring-1 ring-black/5 dark:ring-white/10">
                        <QRCodeSVG
                          value={`otpauth://totp/AbiliFit:${user?.email}?secret=${data.secret}&issuer=AbiliFit`}
                          size={172}
                          bgColor="#ffffff"
                          fgColor="#0f172a"
                          level="M"
                        />
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="space-y-2">
                      {[
                        { n: 1, text: 'Download Google Authenticator (or any TOTP app)' },
                        { n: 2, text: 'Scan the QR code above, or enter the secret manually' },
                      ].map(({ n, text }) => (
                        <div key={n} className="flex items-start gap-3 p-3 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                          <span className="w-6 h-6 rounded-full bg-[var(--accent-teal)]/15 text-[var(--accent-teal)] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {n}
                          </span>
                          <p className="text-sm text-text-primary leading-snug">{text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Secret */}
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <code className="text-[var(--accent-teal)] font-mono text-xs flex-1 break-all leading-relaxed tracking-wide">
                        {data.secret}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(data.secret)
                          toast.success('Secret copied!')
                        }}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-[var(--glass-bg)] transition-all shrink-0"
                        title="Copy secret"
                      >
                        <Copy size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => setStep(3)}
                      className="w-full py-3.5 rounded-2xl bg-[var(--accent-teal)] hover:opacity-90 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg shadow-[var(--accent-teal)]/25"
                    >
                      I scanned it — continue
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* ── Step 3: Verify ── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-[var(--accent-teal)]/15 flex items-center justify-center mx-auto">
                    <Smartphone size={28} className="text-[var(--accent-teal)]" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary">Enter verification code</h3>
                  <p className="text-sm text-text-secondary">Open your authenticator app and enter the 6-digit code</p>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center glass-input rounded-2xl py-4 text-3xl font-black tracking-[0.45em] text-[var(--accent-teal)] focus:outline-none placeholder:text-text-secondary/30 placeholder:tracking-[0.3em]"
                  autoFocus
                />

                <div className="space-y-2">
                  <button
                    onClick={handleVerify}
                    disabled={token.length !== 6 || isLoading}
                    className="w-full py-3.5 rounded-2xl bg-[var(--accent-teal)] hover:opacity-90 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg shadow-[var(--accent-teal)]/25 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Verify & Enable 2FA'}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    className="w-full py-3 text-sm text-text-secondary hover:text-text-primary font-medium transition-colors"
                  >
                    Back to QR code
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
