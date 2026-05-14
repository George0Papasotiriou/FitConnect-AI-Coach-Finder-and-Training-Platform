/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

/**
 * AbiliFit — AI-Powered Fitness & Coach Finder Platform
 * Copyright © 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * File: ForgotPasswordModal.tsx
 * Created: 2026-05-14
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, Shield, Lock, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import Button from '../common/Button'
import Input from '../common/Input'
import { authApi } from '../../api/auth'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Step = 'email' | 'verify' | 'reset' | 'success'

export default function ForgotPasswordModal({ isOpen, onClose }: Props) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [has2FA, setHas2FA] = useState(false)

  const handleEmailSubmit = async () => {
    if (!email.includes('@')) { setError('Please enter a valid email address'); return }
    setLoading(true)
    setError('')
    try {
      const result = await authApi.forgotPassword(email)
      setHas2FA(result.has2FA)
      if (result.has2FA) {
        setStep('verify')
      } else {
        setError('This account does not have 2FA set up. Please contact support or register a new account.')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Account not found'
      setError(msg)
    }
    setLoading(false)
  }

  const handleVerify = async () => {
    if (totpCode.length !== 6) { setError('Please enter a 6-digit code'); return }
    setLoading(true)
    setError('')
    try {
      const result = await authApi.verifyResetToken(email, totpCode)
      setResetToken(result.resetToken)
      setStep('reset')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Invalid verification code'
      setError(msg)
    }
    setLoading(false)
  }

  const handleReset = async () => {
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    try {
      await authApi.resetPassword(resetToken, newPassword)
      setStep('success')
      toast.success('Password reset successful!')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to reset password'
      setError(msg)
    }
    setLoading(false)
  }

  const handleClose = () => {
    setStep('email')
    setEmail('')
    setTotpCode('')
    setNewPassword('')
    setConfirmPassword('')
    setResetToken('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          className="bg-bg-card border border-border-color rounded-3xl w-full max-w-md overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border-color">
            <div className="flex items-center gap-2">
              {step !== 'email' && step !== 'success' && (
                <button onClick={() => setStep(step === 'reset' ? 'verify' : 'email')} className="p-1 rounded-lg hover:bg-bg-card-hover transition-colors">
                  <ArrowLeft size={16} className="text-text-secondary" />
                </button>
              )}
              <h2 className="text-lg font-bold text-text-primary">
                {step === 'email' && 'Reset Password'}
                {step === 'verify' && 'Verify Identity'}
                {step === 'reset' && 'New Password'}
                {step === 'success' && 'Password Reset'}
              </h2>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-bg-card-hover transition-colors">
              <X size={18} className="text-text-secondary" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Email */}
              {step === 'email' && (
                <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 bg-accent-purple/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Mail size={24} className="text-accent-purple" />
                    </div>
                    <p className="text-sm text-text-secondary">Enter the email address associated with your account. If you have 2FA enabled, you'll use your authenticator app to verify your identity.</p>
                  </div>
                  <Input
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    leftIcon={<Mail size={16} />}
                  />
                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  )}
                  <Button fullWidth onClick={handleEmailSubmit} isLoading={loading} size="lg">
                    Continue
                  </Button>
                </motion.div>
              )}

              {/* Step 2: 2FA Verify */}
              {step === 'verify' && (
                <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 bg-accent-teal/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Shield size={24} className="text-accent-teal" />
                    </div>
                    <p className="text-sm text-text-secondary">Open your <strong>Google Authenticator</strong> app and enter the 6-digit code for your Insta Coach account.</p>
                  </div>
                  <Input
                    label="Authenticator Code"
                    type="text"
                    value={totpCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    leftIcon={<Shield size={16} />}
                    maxLength={6}
                  />
                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  )}
                  <Button fullWidth onClick={handleVerify} isLoading={loading} size="lg">
                    Verify Code
                  </Button>
                </motion.div>
              )}

              {/* Step 3: New Password */}
              {step === 'reset' && (
                <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Lock size={24} className="text-green-400" />
                    </div>
                    <p className="text-sm text-text-secondary">Identity verified! Create your new password. Make sure it's at least 8 characters long.</p>
                  </div>
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    leftIcon={<Lock size={16} />}
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    leftIcon={<Lock size={16} />}
                  />
                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-400">{error}</p>
                    </div>
                  )}
                  <Button fullWidth onClick={handleReset} isLoading={loading} size="lg">
                    Reset Password
                  </Button>
                </motion.div>
              )}

              {/* Step 4: Success */}
              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} className="text-green-400" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary">Password Reset Successful!</h3>
                  <p className="text-sm text-text-secondary">You can now log in with your new password.</p>
                  <Button fullWidth onClick={handleClose} size="lg">
                    Back to Login
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
