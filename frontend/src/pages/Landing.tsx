import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { Mic, Video, Trophy, Accessibility, ChevronRight, Star, Zap, Users, Calendar } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import Button from '../components/common/Button'

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const duration = 2000
    const step = target / (duration / 16)
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + step, target)
      setCount(Math.floor(current))
      if (current >= target) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

const features = [
  { icon: <Mic size={28} />, title: 'Voice AI Assistant', desc: 'Navigate the app, find coaches, and get fitness advice — all hands-free with our intelligent voice AI.' },
  { icon: <Video size={28} />, title: 'Live Video Sessions', desc: 'HD video calls with your personal coach from anywhere in the world. Real-time feedback, real results.' },
  { icon: <Trophy size={28} />, title: 'Gamification & XP', desc: 'Earn XP, unlock achievements, and climb the leaderboard. Fitness becomes an addiction — the healthy kind.' },
  { icon: <Accessibility size={28} />, title: 'Fully Accessible', desc: 'WCAG 2.1 AA compliant. Screen reader support, voice navigation, high contrast mode — fitness for everyone.' }
]

const testimonials = [
  { name: 'Sarah M.', role: 'Lost 20kg', avatar: '💪', text: 'FitConnect changed my life. My coach is incredible and the gamification keeps me motivated every single day!' },
  { name: 'James K.', role: 'Marathon runner', avatar: '🏃', text: 'The video call quality is amazing. I can train with my coach from another city like they\'re right next to me.' },
  { name: 'Aisha R.', role: 'Yoga enthusiast', avatar: '🧘', text: 'As someone with mobility issues, the accessibility features are thoughtful and genuinely helpful. Thank you!' }
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <>
      <Helmet><title>FitConnect — Find Your Perfect Coach</title></Helmet>

      <div className="min-h-screen bg-bg-primary overflow-x-hidden">
        <a href="#main-content" className="skip-link">Skip to main content</a>

        <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/80 backdrop-blur-xl border-b border-border-color" role="banner">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-teal rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="font-black text-xl gradient-text">FitConnect</span>
            </div>
            <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-text-secondary hover:text-text-primary transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm text-text-secondary hover:text-text-primary transition-colors">Reviews</a>
            </nav>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log In</Button>
              <Button size="sm" onClick={() => navigate('/register')}>Get Started</Button>
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          <section className="relative min-h-screen flex items-center pt-16" aria-label="Hero section">
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-purple/20 rounded-full blur-[120px]" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-teal/20 rounded-full blur-[120px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-orange/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-24 text-center">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <span className="inline-flex items-center gap-2 bg-accent-purple/10 border border-accent-purple/30 rounded-full px-4 py-1.5 text-sm text-accent-purple font-medium mb-6">
                  <span className="w-2 h-2 bg-accent-teal rounded-full animate-pulse" aria-hidden="true" />
                  Now with Voice AI & Live Video
                </span>

                <h1 className="text-5xl md:text-7xl font-black text-text-primary mb-6 leading-tight tracking-tight">
                  Find Your{' '}
                  <span className="gradient-text">Perfect Coach.</span>
                  <br />
                  Transform Your Life.
                </h1>

                <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
                  Connect with certified fitness trainers for live video sessions, track your progress with gamification, and get AI-powered coaching — all in one accessible platform.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" onClick={() => navigate('/register')} rightIcon={<ChevronRight size={20} />}>
                    Become a Member
                  </Button>
                  <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
                    I'm a Trainer
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto"
                aria-label="Platform statistics"
              >
                {[
                  { value: 500, suffix: '+', label: 'Expert Coaches' },
                  { value: 12000, suffix: '+', label: 'Active Members' },
                  { value: 50000, suffix: '+', label: 'Sessions Done' }
                ].map(({ value, suffix, label }) => (
                  <div key={label} className="text-center">
                    <p className="text-3xl font-black gradient-text">
                      <AnimatedCounter target={value} suffix={suffix} />
                    </p>
                    <p className="text-xs text-text-secondary mt-1">{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          <section id="features" className="py-24 px-6" aria-labelledby="features-heading">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 id="features-heading" className="text-4xl font-black text-text-primary mb-4">
                  Everything You Need to <span className="gradient-text">Succeed</span>
                </h2>
                <p className="text-text-secondary max-w-xl mx-auto">
                  A complete fitness ecosystem with cutting-edge technology and human expertise.
                </p>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6 rounded-2xl hover:border-accent-purple/40 transition-all group"
                  >
                    <div className="w-12 h-12 bg-accent-purple/10 rounded-xl flex items-center justify-center text-accent-purple mb-4 group-hover:bg-accent-purple/20 transition-colors">
                      {f.icon}
                    </div>
                    <h3 className="font-bold text-text-primary mb-2">{f.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="py-24 px-6 bg-bg-card/30" aria-labelledby="how-heading">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 id="how-heading" className="text-4xl font-black text-text-primary mb-4">
                  How It <span className="gradient-text">Works</span>
                </h2>
              </div>
              <div className="grid md:grid-cols-2 gap-16">
                <div>
                  <h3 className="text-xl font-bold text-text-primary mb-8 flex items-center gap-2">
                    <Users size={20} className="text-accent-teal" /> For Members
                  </h3>
                  <ol className="space-y-6" aria-label="Steps for members">
                    {[
                      { step: '01', title: 'Create your profile', desc: 'Tell us your goals, fitness level, and any accessibility needs.' },
                      { step: '02', title: 'Find your coach', desc: 'Browse certified trainers filtered by specialty, rating, and price.' },
                      { step: '03', title: 'Train & level up', desc: 'Attend live video sessions, earn XP, and track your transformation.' }
                    ].map((item) => (
                      <li key={item.step} className="flex gap-4">
                        <span className="w-10 h-10 bg-gradient-to-br from-accent-purple to-accent-teal rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {item.step}
                        </span>
                        <div>
                          <h4 className="font-bold text-text-primary">{item.title}</h4>
                          <p className="text-sm text-text-secondary mt-1">{item.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-text-primary mb-8 flex items-center gap-2">
                    <Calendar size={20} className="text-accent-purple" /> For Trainers
                  </h3>
                  <ol className="space-y-6" aria-label="Steps for trainers">
                    {[
                      { step: '01', title: 'Apply as a trainer', desc: 'Submit your credentials, certifications, and specialty areas.' },
                      { step: '02', title: 'Get approved', desc: 'Our admin team reviews your application within 48 hours.' },
                      { step: '03', title: 'Grow your business', desc: 'Accept clients, host live sessions, and build your reputation.' }
                    ].map((item) => (
                      <li key={item.step} className="flex gap-4">
                        <span className="w-10 h-10 bg-gradient-to-br from-accent-orange to-accent-purple rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                          {item.step}
                        </span>
                        <div>
                          <h4 className="font-bold text-text-primary">{item.title}</h4>
                          <p className="text-sm text-text-secondary mt-1">{item.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </section>

          <section id="testimonials" className="py-24 px-6" aria-labelledby="testimonials-heading">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 id="testimonials-heading" className="text-4xl font-black text-text-primary mb-4">
                  Real People, <span className="gradient-text">Real Results</span>
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((t, i) => (
                  <motion.blockquote
                    key={t.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6 rounded-2xl"
                  >
                    <div className="flex items-center gap-1 mb-4" aria-label="5 out of 5 stars">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} size={14} className="fill-yellow-400 text-yellow-400" aria-hidden="true" />
                      ))}
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed mb-4">"{t.text}"</p>
                    <footer className="flex items-center gap-3">
                      <span className="text-2xl" aria-hidden="true">{t.avatar}</span>
                      <div>
                        <p className="font-bold text-text-primary text-sm">{t.name}</p>
                        <p className="text-xs text-accent-teal">{t.role}</p>
                      </div>
                    </footer>
                  </motion.blockquote>
                ))}
              </div>
            </div>
          </section>

          <section className="py-24 px-6" aria-labelledby="cta-heading">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="glass-card p-12 rounded-3xl"
              >
                <h2 id="cta-heading" className="text-4xl font-black text-text-primary mb-4">
                  Ready to <span className="gradient-text">Transform?</span>
                </h2>
                <p className="text-text-secondary mb-8">
                  Join thousands of members already achieving their fitness goals with FitConnect.
                </p>
                <Button size="lg" onClick={() => navigate('/register')} rightIcon={<ChevronRight size={20} />}>
                  Start Your Journey Today
                </Button>
              </motion.div>
            </div>
          </section>
        </main>

        <footer className="border-t border-border-color py-8 px-6 text-center text-sm text-text-secondary" role="contentinfo">
          <p>© 2024 FitConnect. All rights reserved. Built with ❤️ for healthier lives.</p>
        </footer>
      </div>
    </>
  )
}
