import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Zap } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type FormData = z.infer<typeof schema>

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password)
      const user = useAuthStore.getState().user
      if (user?.role === 'trainer') navigate('/trainer/dashboard')
      else if (user?.role === 'admin') navigate('/admin/dashboard')
      else if (user?.onboardingComplete === false) navigate('/onboarding')
      else navigate('/trainee/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Invalid email or password'
      toast.error(msg)
    }
  }

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
              <div className="w-12 h-12 bg-gradient-to-br from-accent-purple to-accent-teal rounded-2xl flex items-center justify-center mb-4">
                <Zap size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-black text-text-primary">Welcome back</h1>
              <p className="text-text-secondary text-sm mt-1">Log in to continue your journey</p>
            </div>

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
    </>
  )
}
