/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Mic, Video, Trophy, Accessibility, ChevronRight, Star, Zap, Users, Calendar, ArrowRight, Sparkles, SearchCheck, FileText, ShieldCheck, TrendingUp, Leaf } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import Button from '../components/common/Button'
import ThemeToggle from '../components/common/ThemeToggle'
import { GlassButton } from '../components/ui/apple-tahoe-liquid-glass-button'
import { AuroraBackground } from '../components/ui/aurora-background'

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

import { Features } from '../components/ui/features-8'

import { TestimonialsColumn } from '../components/ui/testimonials-columns-1'
import { Component as EtherealShadow } from '../components/ui/etheral-shadow'

const testimonials = [
  {
    text: "This platform revolutionized my fitness journey. The live video calls with my trainer are seamless, and the XP tracker keeps me highly motivated!",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    name: "Briana Patton",
    role: "Health Coach",
  },
  {
    text: "Finding an accessible, WCAG-compliant training app was tough until AbiliFit. The voice assistant is an absolute game changer.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    name: "Bilal Ahmed",
    role: "Accessibility Advocate",
  },
  {
    text: "The variety of expert coaches is unmatched. I easily found a trainer who customized my marathon preparation program.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    name: "Saman Malik",
    role: "Marathon Runner",
  },
  {
    text: "Even with a busy schedule, the calendar sync and direct messaging make it effortless to maintain my workout routine.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    name: "Omar Raza",
    role: "CEO & Entrepreneur",
  },
  {
    text: "I love the detailed biomechanics feedback. Being able to record my form and get AI tips is incredible.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    name: "Zainab Hussain",
    role: "Fitness Enthusiast",
  },
  {
    text: "AbiliFit's visual recovery tracking tells me exactly when I'm ready to push hard or when to focus on light mobility work.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    name: "Aliza Khan",
    role: "Yoga Practitioner",
  },
  {
    text: "The gamification loop makes working out feel like a fun game. I haven't missed a single daily quest in 3 months!",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    name: "Farhan Siddiqui",
    role: "Strength Trainer",
  },
  {
    text: "My coach from another city feels like they are right next to me. The video stream quality is crystal clear and super responsive.",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    name: "Sana Sheikh",
    role: "Busy Mother",
  },
  {
    text: "The community Sweat Map shows me hubs all over the world, making me feel connected to a truly global fitness family.",
    image: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
    name: "Hassan Ali",
    role: "Powerlifter",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export default function Landing() {
  const navigate = useNavigate()
  const [showPreload, setShowPreload] = useState(true)

  return (
    <>
      <Helmet><title>AbiliFit — Find Your Perfect Coach</title></Helmet>

      <AnimatePresence>
        {showPreload && (
          <motion.div
            key="preload"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100] w-full h-full overflow-hidden"
          >
            <AuroraBackground>
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.2,
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative flex flex-col items-center justify-center px-6 max-w-xl mx-auto text-center"
              >
                {/* Leaf logo icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="mb-8 w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md"
                >
                  <Leaf size={28} className="text-white/80 rotate-[15deg] transform" />
                </motion.div>

                {/* Title */}
                <h1 className="font-serif font-light tracking-tight text-7xl md:text-8xl mb-6 glass-title-text select-none">
                  AbiliFit
                </h1>

                {/* Subtitle */}
                <p className="font-light text-white/60 text-lg md:text-xl max-w-sm mx-auto mb-10 leading-relaxed tracking-wide select-none" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                  Ask your body anything. See the results beautifully.
                </p>

                {/* Glassmorphic start button */}
                <button
                  onClick={() => setShowPreload(false)}
                  className="glass-key-button text-white font-medium px-10 py-3.5 rounded-full text-base uppercase tracking-widest cursor-pointer select-none"
                >
                  Start exploring
                </button>
              </motion.div>
            </AuroraBackground>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>

        {/* Animated gradient mesh background */}
        <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-accent-purple/10 rounded-full blur-[180px] animate-subtle-float" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent-teal/8 rounded-full blur-[160px] animate-subtle-float" style={{ animationDelay: '-4s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-accent-orange/5 rounded-full blur-[140px]" />
        </div>

        {/* ─── FLOATING GLASS HEADER ─── */}
        <header className="fixed top-0 left-0 right-0 z-50" role="banner">
          <div className="mx-4 mt-3">
            <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between
              bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] rounded-2xl
              shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_1px_3px_0_var(--glass-shadow),0_8px_24px_-4px_var(--glass-shadow)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-gradient-to-br from-accent-purple to-accent-teal rounded-lg flex items-center justify-center shadow-lg shadow-accent-purple/20">
                  <Zap size={13} className="text-white" />
                </div>
                <span className="font-black text-lg gradient-text">AbiliFit</span>
              </div>
              <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
                <a href="#features" className="text-sm text-text-secondary hover:text-text-primary transition-colors font-medium">Features</a>
                <a href="#how-it-works" className="text-sm text-text-secondary hover:text-text-primary transition-colors font-medium">How It Works</a>
                <a href="#testimonials" className="text-sm text-text-secondary hover:text-text-primary transition-colors font-medium">Reviews</a>
              </nav>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log In</Button>
                <Button size="sm" onClick={() => navigate('/register')}>Get Started</Button>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" tabIndex={-1}>
          {/* ─── HERO SECTION ─── */}
          <section className="relative min-h-screen flex items-center pt-24" aria-label="Hero section">
            <div className="relative max-w-7xl mx-auto px-6 py-24 text-center w-full">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
                <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium mb-8
                  bg-accent-purple/10 backdrop-blur-sm border border-accent-purple/20 text-accent-purple
                  shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1)]">
                  <Sparkles size={14} className="animate-pulse" aria-hidden="true" />
                  Now with Voice AI & Live Video
                </span>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-text-primary mb-6 leading-[0.95] tracking-tight">
                  Find Your{' '}
                  <span className="gradient-text">Perfect Coach.</span>
                  <br />
                  Transform Your Life.
                </h1>

                <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
                  Connect with certified fitness trainers for live video sessions, track your progress with gamification, and get AI-powered coaching — all in one accessible platform.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <GlassButton
                    size="lg"
                    onClick={() => navigate('/register')}
                    glassColor="rgba(16, 185, 129, 0.2)"
                    className="border border-accent-teal/30 hover:border-accent-teal/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] shadow-lg transition-all duration-300"
                    contentClassName="flex items-center gap-2 font-bold text-emerald-950 dark:text-emerald-50 text-shadow-sm"
                  >
                    Become a Member
                    <ArrowRight size={18} />
                  </GlassButton>
                  <GlassButton
                    size="lg"
                    onClick={() => navigate('/login')}
                    glassColor="rgba(168, 85, 247, 0.2)"
                    className="border border-accent-purple/30 hover:border-accent-purple/60 hover:shadow-[0_0_30px_rgba(168, 85, 247, 0.35)] shadow-lg transition-all duration-300"
                    contentClassName="flex items-center gap-2 font-bold text-purple-950 dark:text-purple-50 text-shadow-sm"
                  >
                    I'm a Trainer
                  </GlassButton>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="mt-24 grid grid-cols-3 gap-8 max-w-lg mx-auto"
                aria-label="Platform statistics"
              >
                {[
                  { value: 500, suffix: '+', label: 'Expert Coaches' },
                  { value: 12000, suffix: '+', label: 'Active Members' },
                  { value: 50000, suffix: '+', label: 'Sessions Done' }
                ].map(({ value, suffix, label }) => (
                  <div key={label} className="text-center">
                    <p className="text-3xl md:text-4xl font-black gradient-text">
                      <AnimatedCounter target={value} suffix={suffix} />
                    </p>
                    <p className="text-xs text-text-secondary mt-1 font-medium">{label}</p>
                  </div>
                ))}
              </motion.div>
            </div>
          </section>

          {/* ─── FEATURES ─── */}
          <Features />

          {/* ─── HOW IT WORKS ─── */}
          <section id="how-it-works" className="py-28 px-6 relative overflow-hidden" aria-labelledby="how-heading">
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-teal/5 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
            <div className="absolute bottom-10 right-1/4 translate-x-1/2 w-96 h-96 bg-accent-purple/5 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />

            <div className="max-w-7xl mx-auto relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="text-center mb-20"
              >
                <h2 id="how-heading" className="text-4xl md:text-5xl font-black text-text-primary mb-4 tracking-tight">
                  How It <span className="gradient-text">Works</span>
                </h2>
                <p className="text-text-secondary max-w-xl mx-auto font-medium">
                  Two dedicated paths tailored to maximize success, whether you're here to learn or to teach.
                </p>
              </motion.div>

              <div className="grid lg:grid-cols-2 gap-10 md:gap-16">
                {/* MEMBER PATH */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  viewport={{ once: true }}
                  className="glass-card rounded-[2.5rem] p-8 md:p-10 border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-xl relative"
                >
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black text-text-primary flex items-center gap-3">
                      <Users size={24} className="text-accent-teal" /> For Members
                    </h3>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent-teal/10 text-accent-teal border border-accent-teal/15 tracking-wide uppercase">
                      Trainee Journey
                    </span>
                  </div>

                  <div className="relative pl-6 md:pl-10 space-y-12">
                    {/* Vertical connecting line */}
                    <div className="absolute left-[29px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-accent-teal via-accent-teal/40 to-transparent pointer-events-none" />

                    {[
                      {
                        step: '01',
                        icon: <Sparkles size={16} className="text-accent-teal" />,
                        title: 'Create your profile',
                        desc: 'Define your aesthetic goals, physical capability limits, and any accessibility configurations.'
                      },
                      {
                        step: '02',
                        icon: <SearchCheck size={16} className="text-accent-teal" />,
                        title: 'Find your coach',
                        desc: 'Discover expert coaches matched by specialty, pricing range, availability, and training style.'
                      },
                      {
                        step: '03',
                        icon: <Trophy size={16} className="text-accent-teal" />,
                        title: 'Train & level up',
                        desc: 'Engage in live interactive video sessions, accumulate XP points, and hit your fitness quests.'
                      }
                    ].map((item, idx) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.15, duration: 0.5 }}
                        className="group flex gap-6 relative"
                      >
                        {/* Bullet / Step Number */}
                        <div className="absolute -left-[30px] md:-left-[38px] top-0 flex items-center justify-center">
                          <span className="w-[18px] h-[18px] rounded-full bg-[var(--bg-primary)] border-4 border-accent-teal group-hover:scale-125 transition-transform duration-300 shadow-md relative z-10" />
                        </div>

                        {/* Step Details inside a tiny hoverable glass card */}
                        <div className="flex-1 glass-card p-5 md:p-6 rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-heavy)] hover:border-accent-teal/30 hover:shadow-lg hover:shadow-accent-teal/[0.02] transition-all duration-400 group-hover:-translate-y-0.5">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black tracking-widest text-accent-teal uppercase px-2 py-0.5 rounded bg-accent-teal/10">
                              Step {item.step}
                            </span>
                            <span className="p-1 rounded bg-accent-teal/5 border border-accent-teal/10">
                              {item.icon}
                            </span>
                          </div>
                          <h4 className="font-bold text-text-primary text-base md:text-lg tracking-tight group-hover:text-accent-teal transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* TRAINER PATH */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  viewport={{ once: true }}
                  className="glass-card rounded-[2.5rem] p-8 md:p-10 border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-xl relative"
                >
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-2xl font-black text-text-primary flex items-center gap-3">
                      <Calendar size={24} className="text-accent-purple" /> For Trainers
                    </h3>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-accent-purple/10 text-accent-purple border border-accent-purple/15 tracking-wide uppercase">
                      Coach Growth
                    </span>
                  </div>

                  <div className="relative pl-6 md:pl-10 space-y-12">
                    {/* Vertical connecting line */}
                    <div className="absolute left-[29px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-accent-purple via-accent-purple/40 to-transparent pointer-events-none" />

                    {[
                      {
                        step: '01',
                        icon: <FileText size={16} className="text-accent-purple" />,
                        title: 'Apply as a trainer',
                        desc: 'Upload your verified credentials, client history, specialties, and session rates.'
                      },
                      {
                        step: '02',
                        icon: <ShieldCheck size={16} className="text-accent-purple" />,
                        title: 'Get approved',
                        desc: 'Receive validation from our safety team within 48 hours to activate your marketplace listing.'
                      },
                      {
                        step: '03',
                        icon: <TrendingUp size={16} className="text-accent-purple" />,
                        title: 'Grow your business',
                        desc: 'Sync calendars, chat securely, host live interactive programs, and track client success metrics.'
                      }
                    ].map((item, idx) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, y: 15 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.15, duration: 0.5 }}
                        className="group flex gap-6 relative"
                      >
                        {/* Bullet / Step Number */}
                        <div className="absolute -left-[30px] md:-left-[38px] top-0 flex items-center justify-center">
                          <span className="w-[18px] h-[18px] rounded-full bg-[var(--bg-primary)] border-4 border-accent-purple group-hover:scale-125 transition-transform duration-300 shadow-md relative z-10" />
                        </div>

                        {/* Step Details inside a tiny hoverable glass card */}
                        <div className="flex-1 glass-card p-5 md:p-6 rounded-2xl border border-[var(--glass-border-subtle)] bg-[var(--glass-bg-heavy)] hover:border-accent-purple/30 hover:shadow-lg hover:shadow-accent-purple/[0.02] transition-all duration-400 group-hover:-translate-y-0.5">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black tracking-widest text-accent-purple uppercase px-2 py-0.5 rounded bg-accent-purple/10">
                              Step {item.step}
                            </span>
                            <span className="p-1 rounded bg-accent-purple/5 border border-accent-purple/10">
                              {item.icon}
                            </span>
                          </div>
                          <h4 className="font-bold text-text-primary text-base md:text-lg tracking-tight group-hover:text-accent-purple transition-colors">
                            {item.title}
                          </h4>
                          <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </section>

          {/* ─── INTERACTIVE BRAND BANNER ─── */}
          <section className="py-12 px-6 relative overflow-hidden animate-fade-in" aria-hidden="true">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="h-[320px] md:h-[400px] rounded-[2.5rem] overflow-hidden border border-[var(--glass-border)] bg-[var(--glass-bg)] shadow-2xl relative"
              >
                <EtherealShadow
                  color="rgba(16, 185, 129, 0.15)"
                  animation={{ scale: 75, speed: 65 }}
                  noise={{ opacity: 0.4, scale: 1.2 }}
                  sizing="fill"
                  title="Empower Your Movement"
                  className="w-full h-full"
                />
              </motion.div>
            </div>
          </section>

          {/* ─── TESTIMONIALS ─── */}
          <section id="testimonials" className="py-28 px-6 relative" aria-labelledby="testimonials-heading">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                viewport={{ once: true }}
                className="text-center mb-16"
              >
                <h2 id="testimonials-heading" className="text-4xl md:text-5xl font-black text-text-primary mb-4 tracking-tight">
                  Real People, <span className="gradient-text">Real Results</span>
                </h2>
                <p className="text-text-secondary max-w-xl mx-auto font-medium">
                  See how our active members are leveling up their fitness journeys with expert coaching and voice AI.
                </p>
              </motion.div>

              <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[640px] overflow-hidden">
                <TestimonialsColumn testimonials={firstColumn} duration={25} />
                <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={32} />
                <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={28} />
              </div>
            </div>
          </section>

          {/* ─── CTA ─── */}
          <section className="py-28 px-6" aria-labelledby="cta-heading">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="glass-card p-12 md:p-16 rounded-[2rem] relative overflow-hidden"
              >
                {/* Subtle glow orb behind CTA */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent-purple/10 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />

                <h2 id="cta-heading" className="text-4xl md:text-5xl font-black text-text-primary mb-4 relative tracking-tight">
                  Ready to <span className="gradient-text">Transform?</span>
                </h2>
                <p className="text-text-secondary mb-10 relative font-medium text-lg">
                  Join thousands of members already achieving their fitness goals with AbiliFit.
                </p>
                <div className="relative">
                  <GlassButton
                    size="lg"
                    onClick={() => navigate('/register')}
                    glassColor="rgba(16, 185, 129, 0.2)"
                    className="border border-accent-teal/30 hover:border-accent-teal/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.35)] shadow-lg transition-all duration-300"
                    contentClassName="flex items-center gap-2 font-bold text-emerald-950 dark:text-emerald-50 text-shadow-sm"
                  >
                    Start Your Journey Today
                    <ArrowRight size={18} />
                  </GlassButton>
                </div>
              </motion.div>
            </div>
          </section>
        </main>

        <footer className="border-t border-[var(--glass-border)] py-8 px-6 text-center text-sm text-text-secondary relative" role="contentinfo">
          <p>© 2026 AbiliFit. All rights reserved. Built with ❤️ for healthier lives.</p>
        </footer>
      </div>
    </>
  )
}
