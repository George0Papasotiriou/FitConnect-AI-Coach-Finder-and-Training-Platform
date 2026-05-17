/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, CheckCircle, ChevronRight, ChevronLeft, Plus, X, Clock, Globe } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { trainerApi } from '../../api/trainer'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

const SPECIALTIES = ['Yoga', 'Pilates', 'Strength Training', 'Cardio', 'HIIT', 'Swimming', 'Martial Arts', 'Dance', 'Rehabilitation', 'Flexibility', 'Sports Performance', 'Nutrition']
const COACHING_STYLES = ['Motivational', 'Technical', 'Results-Driven', 'Mindful / Holistic', 'Military / Strict', 'Supportive & Empathetic', 'Data-Driven', 'Fun & Energetic', 'Adaptive / Flexible']
const LANGUAGES = ['English', 'Greek', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Arabic', 'Chinese', 'Japanese', 'Russian', 'Turkish', 'Dutch', 'Polish', 'Swedish']
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const AVAILABILITY_OPTIONS = [
  'Weekdays 6am–12pm', 'Weekdays 12pm–6pm', 'Weekdays 6pm–10pm',
  'Weekends mornings', 'Weekends afternoons', 'Weekends evenings', 'Flexible / Any time'
]

const schema = z.object({
  bio: z.string().min(50, 'Bio must be at least 50 characters'),
  description: z.string().min(30, 'Training approach must be at least 30 characters'),
  experience: z.number().min(1, 'Must have at least 1 year experience').max(50),
  hourlyRate: z.number().min(10, 'Minimum rate is $10').max(500),
  trainingPhilosophy: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function TrainerApplication() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const totalSteps = 7

  // Step 2 — Specialties
  const [specialties, setSpecialties] = useState<string[]>([])

  // Step 3 — Docs
  const [documents, setDocuments] = useState<File[]>([])

  // Step 4 — Personal Info
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English'])

  // Step 5 — Coaching Style + Availability
  const [coachingStyle, setCoachingStyle] = useState<string[]>([])
  const [availabilityHours, setAvailabilityHours] = useState<string[]>([])

  // Step 6 — Certifications
  const [certifications, setCertifications] = useState<string[]>([])
  const [certInput, setCertInput] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { experience: 1, hourlyRate: 50 }
  })

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  }

  const addCert = () => {
    const v = certInput.trim()
    if (v && !certifications.includes(v)) { setCertifications(p => [...p, v]); setCertInput('') }
  }

  const handleNext = async () => {
    let valid = true
    if (step === 1) valid = await trigger(['bio', 'description'])
    if (step === 3) valid = await trigger(['experience', 'hourlyRate'])
    if (valid) setStep(s => Math.min(s + 1, totalSteps))
  }

  const onSubmit = async (data: FormData) => {
    if (specialties.length === 0) { toast.error('Please select at least one specialty'); return }
    setIsSubmitting(true)
    try {
      await trainerApi.submitApplication({
        ...data,
        specialties,
        age: age ? parseInt(age) : undefined,
        gender,
        languages: selectedLanguages,
        trainingPhilosophy: data.trainingPhilosophy || '',
        availabilityHours: availabilityHours.join(', '),
        certifications,
        coachingStyle,
      })
      setSubmitted(true)
    } catch {
      toast.error('Failed to submit application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md glass-card rounded-3xl p-10">
          <div className="w-24 h-24 bg-accent-teal/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-accent-teal" />
          </div>
          <h1 className="text-3xl font-black text-text-primary mb-4">Application Submitted! 🎉</h1>
          <p className="text-text-secondary mb-8">Our team will review your application within 48 hours. You'll be notified by email once it's approved.</p>
          <Button onClick={() => navigate('/')} variant="secondary">Back to Home</Button>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <Helmet><title>Trainer Application — AbiliFit</title></Helmet>
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-accent-purple/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-accent-teal/8 rounded-full blur-[100px]" />
        </div>
        <div className="relative w-full max-w-xl">
          <div className="glass-card rounded-3xl p-8">
            {/* Header + Progress */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h1 className="text-xl font-black text-text-primary">Trainer Application</h1>
                  <p className="text-xs text-text-secondary mt-0.5">Build your professional profile</p>
                </div>
                <span className="text-sm font-semibold text-text-secondary bg-bg-primary px-3 py-1 rounded-full">
                  {step}/{totalSteps}
                </span>
              </div>
              <div className="flex gap-1 mt-3" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={totalSteps}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < step ? 'bg-gradient-to-r from-accent-purple to-accent-teal' : 'bg-border-color'}`} />
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <AnimatePresence mode="wait">

                {/* ── Step 1: About You ── */}
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <h2 className="font-bold text-text-primary flex items-center gap-2">✍️ About You</h2>
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-text-secondary mb-1.5">Short Bio <span className="text-text-secondary/50">(min. 50 chars)</span></label>
                      <textarea id="bio" rows={3} placeholder="Tell potential clients about yourself..." className="input-field resize-none w-full" {...register('bio')} />
                      {errors.bio && <p className="mt-1 text-sm text-red-400">{errors.bio.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1.5">Training Approach</label>
                      <textarea id="description" rows={3} placeholder="Describe your training philosophy and what makes you unique..." className="input-field resize-none w-full" {...register('description')} />
                      {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="trainingPhilosophy" className="block text-sm font-medium text-text-secondary mb-1.5">Training Philosophy <span className="text-text-secondary/50">(optional, shown on your profile)</span></label>
                      <textarea id="trainingPhilosophy" rows={3} placeholder="e.g. I believe every body is capable of extraordinary things when given the right guidance..." className="input-field resize-none w-full" {...register('trainingPhilosophy')} />
                    </div>
                  </motion.div>
                )}

                {/* ── Step 2: Specialties ── */}
                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">🏋️ Specialties</h2>
                    <p className="text-sm text-text-secondary mb-4">Select all that apply — these help trainees find you.</p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Select your specialties">
                      {SPECIALTIES.map(s => (
                        <button
                          key={s} type="button"
                          onClick={() => toggleItem(specialties, setSpecialties, s)}
                          aria-pressed={specialties.includes(s)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${
                            specialties.includes(s)
                              ? 'bg-accent-purple text-white border-accent-purple'
                              : 'bg-transparent border-border-color text-text-secondary hover:border-accent-purple hover:text-accent-purple'
                          }`}
                        >{s}</button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ── Step 3: Experience & Rate ── */}
                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <h2 className="font-bold text-text-primary flex items-center gap-2">💼 Experience & Rate</h2>
                    <Input label="Years of Experience" type="number" error={errors.experience?.message} {...register('experience', { valueAsNumber: true })} />
                    <Input label="Hourly Rate (USD)" type="number" error={errors.hourlyRate?.message} {...register('hourlyRate', { valueAsNumber: true })} />
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">Upload Certifications & Documents</label>
                      <label htmlFor="docs" className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border-color rounded-xl cursor-pointer hover:border-accent-purple transition-colors">
                        <Upload size={24} className="text-text-secondary" />
                        <span className="text-sm text-text-secondary">Click to upload certifications, Tefaa degree, etc.</span>
                        <span className="text-xs text-text-secondary">{documents.length > 0 ? `${documents.length} file(s) selected` : 'PDF, JPG, PNG accepted'}</span>
                      </label>
                      <input id="docs" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                        onChange={(e) => setDocuments(Array.from(e.target.files || []))} aria-label="Upload documents" />
                    </div>
                  </motion.div>
                )}

                {/* ── Step 4: Personal Info ── */}
                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <h2 className="font-bold text-text-primary flex items-center gap-2">👤 Personal Info</h2>
                    <p className="text-sm text-text-secondary">This helps trainees get to know you before choosing a coach.</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="trainer-age" className="block text-sm font-medium text-text-secondary mb-1.5">Age <span className="text-text-secondary/50">(optional)</span></label>
                        <input id="trainer-age" type="number" placeholder="32" min="18" max="80"
                          className="input-field w-full" value={age} onChange={e => setAge(e.target.value)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-secondary mb-1.5">Gender</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {GENDERS.map(g => (
                            <button key={g} type="button" onClick={() => setGender(g)}
                              aria-pressed={gender === g}
                              className={`py-1.5 px-3 rounded-lg text-xs font-medium border-2 transition-all ${
                                gender === g
                                  ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
                                  : 'border-border-color text-text-secondary hover:border-accent-purple/50'
                              }`}>{g}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
                        <Globe size={14} /> Languages Spoken
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES.map(l => (
                          <button key={l} type="button"
                            onClick={() => toggleItem(selectedLanguages, setSelectedLanguages, l)}
                            aria-pressed={selectedLanguages.includes(l)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                              selectedLanguages.includes(l)
                                ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/40'
                                : 'border-border-color text-text-secondary hover:border-accent-teal/40'
                            }`}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 5: Coaching Style & Availability ── */}
                {step === 5 && (
                  <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <div>
                      <h2 className="font-bold text-text-primary mb-1 flex items-center gap-2">🎭 Coaching Style</h2>
                      <p className="text-sm text-text-secondary mb-3">How would you describe your coaching approach?</p>
                      <div className="flex flex-wrap gap-2">
                        {COACHING_STYLES.map(s => (
                          <button key={s} type="button"
                            onClick={() => toggleItem(coachingStyle, setCoachingStyle, s)}
                            aria-pressed={coachingStyle.includes(s)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              coachingStyle.includes(s)
                                ? 'bg-accent-purple text-white border-accent-purple'
                                : 'border-border-color text-text-secondary hover:border-accent-purple hover:text-accent-purple'
                            }`}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h2 className="font-bold text-text-primary mb-1 flex items-center gap-2"><Clock size={16} /> Availability</h2>
                      <p className="text-sm text-text-secondary mb-3">When are you typically available for sessions?</p>
                      <div className="flex flex-wrap gap-2">
                        {AVAILABILITY_OPTIONS.map(a => (
                          <button key={a} type="button"
                            onClick={() => toggleItem(availabilityHours, setAvailabilityHours, a)}
                            aria-pressed={availabilityHours.includes(a)}
                            className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                              availabilityHours.includes(a)
                                ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/40'
                                : 'border-border-color text-text-secondary hover:border-accent-teal/40'
                            }`}>{a}</button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Step 6: Certifications ── */}
                {step === 6 && (
                  <motion.div key="step6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <h2 className="font-bold text-text-primary flex items-center gap-2">🏅 Certifications</h2>
                    <p className="text-sm text-text-secondary">Add your professional certifications by name.</p>
                    <div className="flex gap-2">
                      <input
                        type="text" placeholder="e.g. NASM-CPT, CrossFit L2, ISSA Nutrition..."
                        className="input-field flex-1"
                        value={certInput}
                        onChange={e => setCertInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCert())}
                      />
                      <button type="button" onClick={addCert}
                        className="px-4 py-2 bg-accent-purple text-white rounded-xl font-medium hover:bg-accent-purple/80 transition-colors flex items-center gap-1">
                        <Plus size={16} /> Add
                      </button>
                    </div>
                    {certifications.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {certifications.map(c => (
                          <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-accent-purple/15 text-accent-purple border border-accent-purple/30">
                            🏅 {c}
                            <button type="button" onClick={() => setCertifications(p => p.filter(x => x !== c))}
                              className="hover:text-red-400 transition-colors"><X size={12} /></button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary/60 text-center py-4 border border-dashed border-border-color rounded-xl">
                        No certifications added yet — or skip if uploading documents above
                      </p>
                    )}
                  </motion.div>
                )}

                {/* ── Step 7: Review & Submit ── */}
                {step === 7 && (
                  <motion.div key="step7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">✅ Review & Submit</h2>
                    <div className="space-y-2.5 bg-bg-primary rounded-2xl p-5 text-sm">
                      {[
                        { label: 'Experience', value: `${getValues('experience')} years` },
                        { label: 'Hourly Rate', value: `$${getValues('hourlyRate')}/hr` },
                        { label: 'Specialties', value: `${specialties.length} selected` },
                        { label: 'Coaching Style', value: coachingStyle.length > 0 ? coachingStyle.join(', ') : '—' },
                        { label: 'Languages', value: selectedLanguages.length > 0 ? selectedLanguages.join(', ') : '—' },
                        { label: 'Certifications', value: certifications.length > 0 ? `${certifications.length} added` : '—' },
                        { label: 'Availability', value: availabilityHours.length > 0 ? availabilityHours.join(', ') : '—' },
                        { label: 'Documents', value: `${documents.length} file(s)` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between items-start gap-4">
                          <span className="text-text-secondary shrink-0">{label}</span>
                          <span className="text-text-primary font-medium text-right">{value}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-text-secondary mt-4">By submitting, you confirm all information is accurate. Review takes 24–48 hours.</p>
                  </motion.div>
                )}

              </AnimatePresence>

              <div className="flex gap-3 mt-8">
                {step > 1 && (
                  <Button type="button" variant="ghost" onClick={() => setStep(s => s - 1)} leftIcon={<ChevronLeft size={16} />}>
                    Back
                  </Button>
                )}
                {step < totalSteps ? (
                  <Button type="button" onClick={handleNext} fullWidth rightIcon={<ChevronRight size={16} />}>
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" isLoading={isSubmitting} fullWidth>
                    Submit Application
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
