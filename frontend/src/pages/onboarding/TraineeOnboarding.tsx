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
import { ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { traineeApi } from '../../api/trainee'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

const GOALS = ['Weight Loss', 'Muscle Gain', 'Flexibility', 'Rehabilitation', 'General Fitness', 'Sports Performance']
const ACCESSIBILITY = ['Mobility Issues', 'Visual Impairment', 'Hearing Impairment', 'Other', 'None']
const WORKOUT_TYPES = ['Yoga', 'Pilates', 'Strength', 'Cardio', 'HIIT', 'Swimming', 'Martial Arts', 'Dance']

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
  const totalSteps = 6

  const [data, setData] = useState({
    age: '', weight: '', height: '',
    fitnessLevel: '' as string,
    goals: [] as string[],
    accessibilityNeeds: [] as string[],
    preferredWorkoutTypes: [] as string[]
  })

  const toggle = (key: 'goals' | 'accessibilityNeeds' | 'preferredWorkoutTypes', value: string) => {
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(x => x !== value) : [...prev[key], value]
    }))
  }

  const handleNext = () => setStep(s => Math.min(s + 1, totalSteps))
  const handleBack = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = async () => {
    if (!data.age || !data.weight || !data.height) { toast.error('Please fill in all fields'); return }
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
        preferredWorkoutTypes: data.preferredWorkoutTypes
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
    {
      title: 'Personal Info',
      subtitle: 'Tell us about yourself',
      content: (
        <div className="space-y-4">
          <Input label="Age" type="number" placeholder="25" value={data.age}
            onChange={e => setData(p => ({ ...p, age: e.target.value }))} />
          <Input label="Weight (kg)" type="number" placeholder="70" value={data.weight}
            onChange={e => setData(p => ({ ...p, weight: e.target.value }))} />
          <Input label="Height (cm)" type="number" placeholder="175" value={data.height}
            onChange={e => setData(p => ({ ...p, height: e.target.value }))} />
        </div>
      )
    },
    {
      title: 'Your Goals',
      subtitle: 'What do you want to achieve?',
      content: <MultiSelect options={GOALS} selected={data.goals} onToggle={v => toggle('goals', v)} label="Fitness goals" />
    },
    {
      title: 'Fitness Level',
      subtitle: 'How would you describe your current fitness?',
      content: (
        <div className="space-y-3" role="radiogroup" aria-label="Fitness level">
          {['Beginner', 'Intermediate', 'Advanced'].map(level => (
            <button
              key={level}
              type="button"
              onClick={() => setData(p => ({ ...p, fitnessLevel: level.toLowerCase() }))}
              aria-pressed={data.fitnessLevel === level.toLowerCase()}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${
                data.fitnessLevel === level.toLowerCase()
                  ? 'border-accent-purple bg-accent-purple/10'
                  : 'border-border-color hover:border-accent-purple/50'
              }`}
            >
              <p className="font-bold text-text-primary">{level}</p>
              <p className="text-sm text-text-secondary">
                {level === 'Beginner' ? 'New to working out or returning after a long break'
                  : level === 'Intermediate' ? 'Regularly active for 6+ months'
                  : 'Highly active with advanced training experience'}
              </p>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'Accessibility Needs',
      subtitle: 'We want to match you with the right coach',
      content: <MultiSelect options={ACCESSIBILITY} selected={data.accessibilityNeeds} onToggle={v => toggle('accessibilityNeeds', v)} label="Accessibility needs" />
    },
    {
      title: 'Workout Preferences',
      subtitle: 'What types of workouts interest you?',
      content: <MultiSelect options={WORKOUT_TYPES} selected={data.preferredWorkoutTypes} onToggle={v => toggle('preferredWorkoutTypes', v)} label="Preferred workout types" />
    },
    {
      title: "You're all set! 🎉",
      subtitle: 'Your profile has been created',
      content: (
        <div className="text-center py-4">
          <div className="w-20 h-20 bg-accent-teal/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-accent-teal" />
          </div>
          <p className="text-text-secondary">Ready to find your perfect coach and start your fitness journey!</p>
        </div>
      )
    }
  ]

  const current = stepContent[step - 1]

  return (
    <>
      <Helmet><title>Set Up Your Profile — Insta Coach</title></Helmet>
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-accent-purple/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative w-full max-w-lg">
          <div className="glass-card rounded-3xl p-8">
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
                <h1 className="text-2xl font-black text-text-primary mb-1">{current.title}</h1>
                <p className="text-text-secondary mb-6">{current.subtitle}</p>
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
                  Find My Coach
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
