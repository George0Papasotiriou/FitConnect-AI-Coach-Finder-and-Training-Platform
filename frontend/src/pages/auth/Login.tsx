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
 * File: Login.tsx
 * Created: 2026-05-14
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Zap, AlertTriangle, Info, ShieldAlert, UserX } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type FormData = z.infer<typeof schema>

const ERROR_GUIDANCE: Record<string, { icon: React.ReactNode; title: string; message: string; action?: string }> = {
  'User not found': {
    icon: <UserX size={18} className="text-orange-400" />,
    title: 'Account Not Found',
    message: 'No account exists with this email address. Please check the spelling or create a new account.',
    action: 'register'
  },
  'Incorrect password': {
    icon: <ShieldAlert size={18} className="text-red-400" />,
    title: 'Wrong Password',
    message: 'The password you entered is incorrect. Check for caps lock, try again, or use the "Forgot Password" option below to reset it.',
  },
  'Account is suspended': {
    icon: <AlertTriangle size={18} className="text-red-400" />,
    title: 'Account Suspended',
    message: 'This account has been suspended. Please contact support at support@instacoach.app for assistance.',
  },
}

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    setLoginError(null)
    try {
      await login(data.email, data.password)
      const user = useAuthStore.getState().user
      if (user?.role === 'trainer') navigate('/trainer/dashboard')
      else if (user?.role === 'admin') navigate('/admin/dashboard')
      else if (user?.onboardingComplete === false) navigate('/onboarding')
      else navigate('/trainee/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid email or password'
      setLoginError(msg)
      setAttempts(prev => prev + 1)
      
      if (attempts >= 2) {
        toast.error('Multiple failed attempts. Consider resetting your password.', { duration: 5000 })
      }
    }
  }

  const errorInfo = loginError ? (ERROR_GUIDANCE[loginError] || {
    icon: <AlertTriangle size={18} className="text-red-400" />,
    title: 'Login Failed',
    message: loginError + '. Please double-check your email and password.',
  }) : null

  return (
    <>
      <Helmet><title>Log In — Insta Coach</title></Helmet>

      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-accent-purple/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-accent-teal/15 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-md"
        >
          <div className="glass-card rounded-3xl p-8">
            <div className="flex flex-col items-center mb-8">
              <img src="/logo.png" alt="Insta Coach" className="w-14 h-14 rounded-2xl mb-4 object-contain" />
              <h1 className="text-2xl font-black text-text-primary">Welcome back</h1>
              <p className="text-text-secondary text-sm mt-1">Log in to continue your journey</p>
            </div>

            {/* Error Guidance */}
            <AnimatePresence>
              {errorInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-5"
                >
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{errorInfo.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary">{errorInfo.title}</p>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{errorInfo.message}</p>
                        {errorInfo.action === 'register' && (
                          <Link to="/register" className="inline-flex items-center gap-1 mt-2 text-xs text-accent-purple hover:text-purple-400 font-semibold transition-colors">
                            Create an account →
                          </Link>
                        )}
                      </div>
                    </div>
                    {attempts >= 2 && (
                      <div className="mt-3 pt-3 border-t border-red-500/10">
                        <button
                          onClick={() => setShowForgotPassword(true)}
                          className="flex items-center gap-2 text-xs text-accent-purple hover:text-purple-400 font-semibold transition-colors"
                        >
                          <Info size={12} /> Forgot your password? Reset it with 2FA
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Login form">
              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  leftIcon={<Mail size={16} />}
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  leftIcon={<Lock size={16} />}
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              <div className="flex justify-end mt-2 mb-6">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-accent-purple hover:text-purple-400 transition-colors focus-visible:outline-none focus-visible:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" fullWidth isLoading={isLoading} size="lg">
                Log In
              </Button>
            </form>

            <p className="text-center text-sm text-text-secondary mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent-purple hover:text-purple-400 font-semibold transition-colors focus-visible:outline-none focus-visible:underline">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  )
}
