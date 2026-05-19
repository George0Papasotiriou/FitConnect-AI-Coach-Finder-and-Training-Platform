/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, Heart } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { traineeApi } from '../../api/trainee'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import BodyFigure from '../../components/common/BodyFigure'

const GOALS = ['Weight Loss', 'Muscle Gain', 'Flexibility', 'Rehabilitation', 'General Fitness', 'Sports Performance']
const ACCESSIBILITY = ['Mobility Issues', 'Visual Impairment', 'Hearing Impairment', 'Other', 'None']
const WORKOUT_TYPES = ['Yoga', 'Pilates', 'Strength', 'Cardio', 'HIIT', 'Swimming', 'Martial Arts', 'Dance']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const CONDITIONS = [
  'Diabetes', 'Hypertension', 'Heart Condition', 'Asthma', 'Arthritis',
  'Osteoporosis', 'Chronic Pain', 'Anxiety / Depression', 'Epilepsy',
  'Knee Injury', 'Shoulder Injury', 'Back Problem', 'Post-Surgery Recovery', 'None'
]

function MultiSelect({ options, selected, onToggle, label }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; label: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          aria-pressed={selected.includes(opt)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${
            selected.includes(opt)
              ? 'bg-accent-purple text-white border-accent-purple'
              : 'bg-transparent border-border-color text-text-secondary hover:border-accent-purple hover:text-accent-purple'
          }`}
        >{opt}</button>
      ))}
    </div>
  )
}

export default function TraineeOnboarding() {
  const navigate = useNavigate()
  const { setUser, user } = useAuthStore()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const totalSteps = 9

  const [data, setData] = useState({
    age: '', weight: '', height: '', gender: '',
    fitnessLevel: '' as string,
    goals: [] as string[],
    accessibilityNeeds: [] as string[],
    preferredWorkoutTypes: [] as string[],
    injuredLimbs: [] as string[],
    injuryDescription: '',
    medicalConditions: [] as string[],
    trainingMotivation: '',
  })

  const toggle = (key: 'goals' | 'accessibilityNeeds' | 'preferredWorkoutTypes' | 'medicalConditions', value: string) => {
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(x => x !== value) : [...prev[key], value]
    }))
  }

  const toggleLimb = (limb: string) => {
    setData(prev => ({
      ...prev,
      injuredLimbs: prev.injuredLimbs.includes(limb)
        ? prev.injuredLimbs.filter(x => x !== limb)
        : [...prev.injuredLimbs, limb]
    }))
  }

  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    if (!data.age || !data.weight || !data.height) { toast.error('Please fill in all personal info fields'); return }
    if (!data.fitnessLevel) { toast.error('Please select your fitness level'); return }
    if (data.goals.length === 0) { toast.error('Please select at least one goal'); return }

    setIsSubmitting(true)
    try {
      await traineeApi.submitOnboarding({
        age: parseInt(data.age),
        weight: parseFloat(data.weight),
        height: parseFloat(data.height),
        fitnessLevel: data.fitnessLevel,
        goals: data.goals,
        accessibilityNeeds: data.accessibilityNeeds,
        preferredWorkoutTypes: data.preferredWorkoutTypes,
        gender: data.gender,
        injuredLimbs: data.injuredLimbs,
        injuryDescription: data.injuryDescription,
        medicalConditions: data.medicalConditions,
        trainingMotivation: data.trainingMotivation,
      })
      if (user) setUser({ ...user, onboardingComplete: true })
      navigate('/search')
    } catch {
      toast.error('Failed to save profile. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepContent = [
    // ── Step 1: Personal Info ──
    {
      title: 'Personal Info',
      subtitle: 'Tell us the basics so we can set up your profile',
      icon: '👤',
      content: (
        <div className="space-y-4">
          <Input label="Age" type="number" placeholder="25" value={data.age}
            onChange={e => setData(p => ({ ...p, age: e.target.value }))} />
          <Input label="Weight (kg)" type="number" placeholder="70" value={data.weight}
            onChange={e => setData(p => ({ ...p, weight: e.target.value }))} />
          <Input label="Height (cm)" type="number" placeholder="175" value={data.height}
            onChange={e => setData(p => ({ ...p, height: e.target.value }))} />
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Gender</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Gender">
              {GENDERS.map(g => (
                <button
                  key={g} type="button"
                  onClick={() => setData(p => ({ ...p, gender: g }))}
                  aria-pressed={data.gender === g}
                  className={`py-2.5 px-4 rounded-xl text-sm font-medium border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${
                    data.gender === g
                      ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
                      : 'border-border-color text-text-secondary hover:border-accent-purple/50'
                  }`}
                >{g}</button>
              ))}
            </div>
          </div>
        </div>
      )
    },

    // ── Step 2: Goals ──
    {
      title: 'Your Goals',
      subtitle: 'What do you want to achieve with your training?',
      icon: '🎯',
      content: <MultiSelect options={GOALS} selected={data.goals} onToggle={v => toggle('goals', v)} label="Fitness goals" />
    },

    // ── Step 3: Fitness Level ──
    {
      title: 'Fitness Level',
      subtitle: 'How would you describe your current fitness?',
      icon: '💪',
      content: (
        <div className="space-y-3" role="radiogroup" aria-label="Fitness level">
          {[
            { value: 'beginner', label: 'Beginner', desc: 'New to working out or returning after a long break', emoji: '🌱' },
            { value: 'intermediate', label: 'Intermediate', desc: 'Regularly active for 6+ months', emoji: '⚡' },
            { value: 'advanced', label: 'Advanced', desc: 'Highly active with advanced training experience', emoji: '🔥' },
          ].map(({ value, label, desc, emoji }) => (
            <button
              key={value} type="button"
              onClick={() => setData(p => ({ ...p, fitnessLevel: value }))}
              aria-pressed={data.fitnessLevel === value}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${
                data.fitnessLevel === value
                  ? 'border-accent-purple bg-accent-purple/10'
                  : 'border-border-color hover:border-accent-purple/50'
              }`}
            >
              <p className="font-bold text-text-primary">{emoji} {label}</p>
              <p className="text-sm text-text-secondary">{desc}</p>
            </button>
          ))}
        </div>
      )
    },

    // ── Step 4: Workout Preferences ──
    {
      title: 'Workout Preferences',
      subtitle: 'What types of workouts interest you?',
      icon: '🏋️',
      content: <MultiSelect options={WORKOUT_TYPES} selected={data.preferredWorkoutTypes} onToggle={v => toggle('preferredWorkoutTypes', v)} label="Preferred workout types" />
    },

    // ── Step 5: Injuries — Body Figure ──
    {
      title: 'Injuries & Pain Points',
      subtitle: 'Tap any body part that is injured, painful, or has limited mobility',
      icon: '🩹',
      content: (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-4 flex items-start gap-2 text-sm"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}
          >
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>This info is shared with your trainer so they can tailor your program safely. You can skip this step if you have no injuries.</span>
          </div>
          <div className="flex justify-center">
            <BodyFigure selected={data.injuredLimbs} onToggle={toggleLimb} size="lg" />
          </div>
        </div>
      )
    },

    // ── Step 6: Injury description + Medical Conditions ──
    {
      title: 'Health & Medical Info',
      subtitle: 'Help your trainer understand your health background',
      icon: '🏥',
      content: (
        <div className="space-y-5">
          <div
            className="rounded-2xl p-3 flex items-start gap-2 text-xs"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}
          >
            <Heart size={14} className="shrink-0 mt-0.5" />
            <span>Your health information is private and only shared with your assigned trainer. It helps them keep you safe.</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary mb-3">Do you have any of the following? <span className="text-text-secondary/60">(select all that apply)</span></p>
            <MultiSelect options={CONDITIONS} selected={data.medicalConditions} onToggle={v => toggle('medicalConditions', v)} label="Medical conditions" />
          </div>
          <div>
            <label htmlFor="injury-desc" className="block text-sm font-medium text-text-secondary mb-2">
              Describe your injury or condition in detail <span className="text-text-secondary/60">(optional)</span>
            </label>
            <textarea
              id="injury-desc"
              rows={4}
              placeholder="e.g. Missing right arm below elbow, chronic lower back pain, recovering from ACL surgery..."
              className="glass-input resize-none w-full p-4 rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              value={data.injuryDescription}
              onChange={e => setData(p => ({ ...p, injuryDescription: e.target.value }))}
            />
          </div>
        </div>
      )
    },

    // ── Step 7: Training Motivation ──
    {
      title: 'Your Motivation',
      subtitle: 'What drives you to train? Share it with your trainer',
      icon: '✨',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">This helps your trainer understand your mindset and personalise their coaching style to keep you motivated.</p>
          <textarea
            id="motivation"
            rows={5}
            placeholder="e.g. I want to be fit enough to play with my kids without getting tired. I've struggled with my weight for years and this time I'm committed to change..."
            className="glass-input resize-none w-full p-4 rounded-xl text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
            value={data.trainingMotivation}
            onChange={e => setData(p => ({ ...p, trainingMotivation: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            {[
              'I want to lose weight 🔥',
              'I want to build muscle 💪',
              'I want more energy ⚡',
              'Doctor recommended 🩺',
              'I want to feel confident 🌟',
              'Athletic performance 🏆',
            ].map(m => (
              <button
                key={m} type="button"
                onClick={() => setData(p => ({ ...p, trainingMotivation: p.trainingMotivation ? p.trainingMotivation : m }))}
                className="text-xs p-2.5 rounded-xl border border-border-color text-text-secondary hover:border-accent-purple hover:text-accent-purple transition-all text-left"
              >{m}</button>
            ))}
          </div>
        </div>
      )
    },

    // ── Step 8: Accessibility ──
    {
      title: 'Accessibility Needs',
      subtitle: 'We want to match you with the right coach',
      icon: '♿',
      content: <MultiSelect options={ACCESSIBILITY} selected={data.accessibilityNeeds} onToggle={v => toggle('accessibilityNeeds', v)} label="Accessibility needs" />
    },

    // ── Step 9: Done ──
    {
      title: "You're all set! 🎉",
      subtitle: 'Your profile is ready',
      icon: '🚀',
      content: (
        <div className="text-center py-2 space-y-5">
          <div className="w-20 h-20 bg-accent-teal/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-accent-teal" />
          </div>
          <p className="text-text-secondary">Your personalised profile has been created. We'll match you with the perfect coach based on your goals, fitness level, and health background.</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Goals', value: data.goals.length, suffix: 'selected' },
              { label: 'Injuries', value: data.injuredLimbs.length, suffix: 'marked' },
              { label: 'Conditions', value: data.medicalConditions.filter(c => c !== 'None').length, suffix: 'noted' },
            ].map(({ label, value, suffix }) => (
              <div key={label} className="bg-bg-primary rounded-xl p-3">
                <p className="text-2xl font-black text-accent-purple">{value}</p>
                <p className="text-xs text-text-secondary">{label}</p>
                <p className="text-xs text-text-secondary/60">{suffix}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ]

  const current = stepContent[step - 1]

  return (
    <>
      <Helmet><title>Set Up Your Profile — AbiliFit</title></Helmet>
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-accent-purple/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent-teal/8 rounded-full blur-[100px]" />
        </div>
        <div className="relative w-full max-w-lg">
          <div className="glass-card rounded-3xl p-8">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-secondary uppercase tracking-wide">Profile Setup</span>
                <span className="text-xs text-text-secondary">{step}/{totalSteps}</span>
              </div>
              <div className="flex gap-1" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`Step ${step} of ${totalSteps}`}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < step ? 'bg-gradient-to-r from-accent-purple to-accent-teal' : 'bg-border-color'}`} />
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl" aria-hidden="true">{current.icon}</span>
                  <h1 className="text-2xl font-black text-text-primary">{current.title}</h1>
                </div>
                <p className="text-text-secondary mb-6 ml-10">{current.subtitle}</p>
                {current.content}
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button type="button" variant="ghost" onClick={handleBack} leftIcon={<ChevronLeft size={16} />}>
                  Back
                </Button>
              )}
              {step < totalSteps ? (
                <Button onClick={handleNext} fullWidth rightIcon={<ChevronRight size={16} />}>
                  Continue
                </Button>
              ) : (
                <Button onClick={handleSubmit} isLoading={isSubmitting} fullWidth>
                  Find My Coach 🚀
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
