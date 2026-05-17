/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Zap, AlertTriangle, Info, ShieldAlert, UserX, Eye, EyeOff, Leaf } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
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
    message: 'This account has been suspended. Please contact support at support@AbiliFit.app for assistance.',
  },
}

// --- HELPER COMPONENTS ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
)

const GlassInputWrapper = ({ children, hasError }: { children: React.ReactNode; hasError?: boolean }) => (
  <div className={`rounded-[1.25rem] border backdrop-blur-sm transition-all duration-300 flex items-center px-5 py-3.5
    ${hasError 
      ? 'border-red-500 bg-red-50/30 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-500/10' 
      : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50/80 focus-within:bg-white focus-within:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/5'
    }`}
  >
    {children}
  </div>
)

import { TestimonialsColumn, TestimonialItem } from '../../components/ui/testimonials-columns-1'

const testimonials: TestimonialItem[] = [
  {
    text: "AbiliFit completely revolutionized my daily training flow, streamlining finance and inventory of my gym.",
    image: "https://randomuser.me/api/portraits/women/1.jpg",
    name: "Briana Patton",
    role: "Operations Manager",
  },
  {
    text: "Implementing AbiliFit was smooth and quick. The customizable, user-friendly interface made onboarding effortless.",
    image: "https://randomuser.me/api/portraits/men/2.jpg",
    name: "Bilal Ahmed",
    role: "IT Manager",
  },
  {
    text: "The coach support team is exceptional, guiding us through setup and providing ongoing biometric assistance.",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Saman Malik",
    role: "Customer Support Lead",
  },
  {
    text: "This platform's seamless training integration enhanced our recovery operations and muscle efficiency. Highly recommend!",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
    name: "Omar Raza",
    role: "CEO",
  },
  {
    text: "Its robust exercise library and quick trainer calls have transformed our daily flow, making us significantly fitter.",
    image: "https://randomuser.me/api/portraits/women/5.jpg",
    name: "Zainab Hussain",
    role: "Project Manager",
  },
  {
    text: "The smooth implementation exceeded all expectations. It streamlined all workflows, improving fitness performance.",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
    name: "Aliza Khan",
    role: "Business Analyst",
  },
  {
    text: "Our physical functions and cardiovascular endurance significantly improved under their simple, user-friendly layouts.",
    image: "https://randomuser.me/api/portraits/men/7.jpg",
    name: "Farhan Siddiqui",
    role: "Marketing Director",
  }
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 7);

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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

  const handleGoogleLogin = () => {
    toast.info("Google registration & login is currently in beta!", {
      description: "Please continue logging in with your registered email and password."
    })
  }

  const errorInfo = loginError ? (ERROR_GUIDANCE[loginError] || {
    icon: <AlertTriangle size={18} className="text-red-400" />,
    title: 'Login Failed',
    message: loginError + '. Please double-check your credentials.',
  }) : null

  return (
    <>
      <Helmet><title>Log In — AbiliFit</title></Helmet>

      <div className="min-h-screen h-[100dvh] flex flex-col md:flex-row bg-[#fafafc] w-[100vw] overflow-hidden font-sans relative">
        {/* Ambient background glows for left form area */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none md:w-1/2" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-teal-500/5 rounded-full blur-[120px]" />
        </div>

        {/* Left column: Login form container */}
        <section className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 overflow-y-auto z-15">
          <div className="w-full max-w-md my-auto">
            
            {/* Header Brand */}
            <div className="animate-element animate-delay-100 flex items-center gap-3 mb-8">
              <div className="w-11 h-11 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Zap size={20} className="text-white fill-white" />
              </div>
              <span className="font-extrabold text-2xl text-[#0fb478] tracking-tight">AbiliFit</span>
            </div>

            {/* Title & Desc */}
            <div className="mb-8">
              <h1 className="animate-element animate-delay-200 text-4xl font-extrabold text-[#111827] tracking-tight leading-tight">Welcome back</h1>
              <p className="animate-element animate-delay-300 text-slate-500 text-sm font-medium mt-2.5">Access your training space and resume your journey</p>
            </div>

            {/* Error Guidance Callout */}
            <AnimatePresence>
              {errorInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-4 rounded-2xl bg-red-500/5 backdrop-blur-sm border border-red-500/15 shadow-[inset_0_1px_0_0_rgba(239,68,68,0.05)]">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">{errorInfo.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary">{errorInfo.title}</p>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{errorInfo.message}</p>
                        {errorInfo.action === 'register' && (
                          <Link to="/register" className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                            Create an account →
                          </Link>
                        )}
                      </div>
                    </div>
                    {attempts >= 2 && (
                      <div className="mt-3 pt-3 border-t border-red-500/10">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
                        >
                          <Info size={12} /> Forgot your password? Reset it now
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate aria-label="Login form">
              {/* Email Input */}
              <div className="animate-element animate-delay-400">
                <label className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2.5 block">Email Address</label>
                <GlassInputWrapper hasError={!!errors.email}>
                  <Mail size={16} className="text-slate-400 mr-3.5 flex-shrink-0" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full bg-transparent text-sm py-0.5 focus:outline-none text-slate-800 placeholder:text-slate-400/80 font-medium"
                    {...register('email')}
                  />
                </GlassInputWrapper>
                {errors.email?.message && (
                  <p className="text-xs text-red-500 font-semibold mt-1.5 ml-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="animate-element animate-delay-500">
                <label className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-2.5 block">Password</label>
                <GlassInputWrapper hasError={!!errors.password}>
                  <Lock size={16} className="text-slate-400 mr-3.5 flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full bg-transparent text-sm py-0.5 pr-2 focus:outline-none text-slate-800 placeholder:text-slate-400/80 font-medium"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 focus:outline-none hover:opacity-80 transition-opacity flex-shrink-0"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword 
                      ? <EyeOff size={16} className="text-slate-400 hover:text-slate-600 transition-colors" /> 
                      : <Eye size={16} className="text-slate-400 hover:text-slate-600 transition-colors" />
                    }
                  </button>
                </GlassInputWrapper>
                {errors.password?.message && (
                  <p className="text-xs text-red-500 font-semibold mt-1.5 ml-1">{errors.password.message}</p>
                )}
              </div>

              {/* Remember & Forgot actions */}
              <div className="animate-element animate-delay-600 flex items-center justify-between text-sm pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4.5 h-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <span className="text-slate-500 text-[13px] font-medium">Keep me signed in</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="hover:underline text-[13px] text-emerald-600 font-bold transition-colors focus:outline-none bg-transparent border-none"
                >
                  Reset password
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="animate-element animate-delay-700 w-full rounded-[1.25rem] bg-[#0fb478] hover:bg-[#0c9563] py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            {/* Separator */}
            <div className="animate-element animate-delay-800 relative flex items-center justify-center my-6">
              <span className="w-full border-t border-slate-100"></span>
              <span className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-[#fafafc] absolute">Or continue with</span>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="animate-element animate-delay-900 w-full flex items-center justify-center gap-3 border border-slate-200/80 bg-white hover:bg-slate-50 rounded-[1.25rem] py-4 text-slate-700 text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Sign up prompt */}
            <p className="animate-element animate-delay-1000 text-center text-xs font-semibold text-slate-400 mt-8">
              New to AbiliFit?{' '}
              <Link to="/register" className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </section>

        {/* Right column: Beautiful Fitness Hero Illustration & Sliding Testimonial Columns */}
        <section className="hidden md:block flex-1 relative p-4 z-10 h-full overflow-hidden">
          <div 
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-[2.5rem] bg-cover bg-center overflow-hidden border border-white/5 shadow-2xl flex items-center justify-center"
            style={{ 
              backgroundImage: `url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&q=80')` 
            }}
          >
            {/* Cinematic dark glass dimming overlay */}
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] z-0" />

            {/* Staggered infinite sliding testimonials track */}
            <div className="absolute inset-x-0 inset-y-8 flex justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] z-10 w-full px-6">
              <TestimonialsColumn testimonials={firstColumn} duration={25} className="flex flex-col" />
              <TestimonialsColumn testimonials={secondColumn} duration={32} className="hidden xl:flex flex-col" />
            </div>

            {/* Branding details */}
            <div className="absolute top-8 right-8 flex items-center gap-1.5 bg-black/35 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg z-20">
              <Leaf size={14} className="text-accent-purple rotate-[15deg]" />
              <span className="text-[10px] font-black text-white tracking-widest uppercase">Elite Personal Training</span>
            </div>
          </div>
        </section>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </>
  )
}
