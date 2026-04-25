import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Zap, Dumbbell, Users } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type FormData = z.infer<typeof schema>

export default function Register() {
  const navigate = useNavigate()
  const { setUser, setToken } = useAuthStore()
  const [role, setRole] = useState<'trainee' | 'trainer' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    if (!role) { toast.error('Please select a role'); return }
    setIsLoading(true)
    try {
      const result = await authApi.register({ name: data.name, email: data.email, password: data.password, role })
      setUser(result.user as Parameters<typeof setUser>[0])
      setToken(result.token)
      if (role === 'trainer') navigate('/trainer-application')
      else navigate('/onboarding')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Helmet><title>Create Account — FitConnect</title></Helmet>

      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-accent-purple/15 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-accent-teal/15 rounded-full blur-[100px]" />
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
          <div className="glass-card rounded-3xl p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-accent-purple to-accent-teal rounded-2xl flex items-center justify-center mb-4">
                <Zap size={24} className="text-white" />
              </div>
              <h1 className="text-2xl font-black text-text-primary">Create your account</h1>
              <p className="text-text-secondary text-sm mt-1">Start your fitness transformation today</p>
            </div>

            <div className="mb-6" role="group" aria-labelledby="role-label">
              <p id="role-label" className="text-sm font-medium text-text-secondary mb-3 text-center">I am a...</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'trainee', label: 'Member', icon: <Users size={20} />, desc: 'I want to get fit' },
                  { value: 'trainer', label: 'Trainer', icon: <Dumbbell size={20} />, desc: 'I coach others' }
                ] as const).map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${
                      role === value
                        ? 'border-accent-purple bg-accent-purple/10'
                        : 'border-border-color hover:border-accent-purple/50'
                    }`}
                    aria-pressed={role === value}
                  >
                    <div className={`mb-2 ${role === value ? 'text-accent-purple' : 'text-text-secondary'}`}>{icon}</div>
                    <p className="font-bold text-sm text-text-primary">{label}</p>
                    <p className="text-xs text-text-secondary">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {role && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  aria-label="Registration form"
                >
                  <div className="space-y-4">
                    <Input label="Full Name" type="text" placeholder="John Doe" autoComplete="name"
                      leftIcon={<User size={16} />} error={errors.name?.message} {...register('name')} />
                    <Input label="Email" type="email" placeholder="you@example.com" autoComplete="email"
                      leftIcon={<Mail size={16} />} error={errors.email?.message} {...register('email')} />
                    <Input label="Password" type="password" placeholder="Min. 8 characters" autoComplete="new-password"
                      leftIcon={<Lock size={16} />} error={errors.password?.message} {...register('password')} />
                    <Input label="Confirm Password" type="password" placeholder="Repeat password" autoComplete="new-password"
                      leftIcon={<Lock size={16} />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
                  </div>

                  <p className="text-xs text-text-secondary mt-4 mb-6 text-center">
                    By signing up, you agree to our Terms of Service and Privacy Policy.
                  </p>

                  <Button type="submit" fullWidth isLoading={isLoading} size="lg">
                    Create Account
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="text-center text-sm text-text-secondary mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-purple hover:text-purple-400 font-semibold transition-colors">
                Log in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </>
  )
}
