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
import { Upload, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { trainerApi } from '../../api/trainer'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

const SPECIALTIES = ['Yoga', 'Pilates', 'Strength Training', 'Cardio', 'HIIT', 'Swimming', 'Martial Arts', 'Dance', 'Rehabilitation', 'Flexibility', 'Sports Performance', 'Nutrition']

const schema = z.object({
  bio: z.string().min(50, 'Bio must be at least 50 characters'),
  description: z.string().min(30, 'Description must be at least 30 characters'),
  experience: z.number().min(1, 'Must have at least 1 year experience').max(50),
  hourlyRate: z.number().min(10, 'Minimum rate is $10').max(500)
})

type FormData = z.infer<typeof schema>

export default function TrainerApplication() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [specialties, setSpecialties] = useState<string[]>([])
  const [documents, setDocuments] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, trigger, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { experience: 1, hourlyRate: 50 }
  })

  const totalSteps = 4

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
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
      await trainerApi.submitApplication({ ...data, specialties })
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
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-24 h-24 bg-accent-teal/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} className="text-accent-teal" />
          </div>
          <h1 className="text-3xl font-black text-text-primary mb-4">Application Submitted!</h1>
          <p className="text-text-secondary mb-8">Our team will review your application within 48 hours. We'll notify you by email once it's approved.</p>
          <Button onClick={() => navigate('/')} variant="secondary">Back to Home</Button>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      <Helmet><title>Trainer Application — Insta Coach</title></Helmet>
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <div className="glass-card rounded-3xl p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-xl font-black text-text-primary">Trainer Application</h1>
                <span className="text-sm text-text-secondary">Step {step} of {totalSteps}</span>
              </div>
              <div className="flex gap-1" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={totalSteps} aria-label={`Step ${step} of ${totalSteps}`}>
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${i < step ? 'bg-accent-purple' : 'bg-border-color'}`} />
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <h2 className="font-bold text-text-primary">About You</h2>
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-text-secondary mb-1.5">Short Bio</label>
                      <textarea id="bio" rows={3} placeholder="Tell potential clients about yourself..." className="input-field resize-none" {...register('bio')} />
                      {errors.bio && <p className="mt-1 text-sm text-red-400">{errors.bio.message}</p>}
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1.5">Training Approach</label>
                      <textarea id="description" rows={3} placeholder="Describe your training philosophy..." className="input-field resize-none" {...register('description')} />
                      {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>}
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="font-bold text-text-primary mb-4">Specialties</h2>
                    <p className="text-sm text-text-secondary mb-4">Select all that apply:</p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Select your specialties">
                      {SPECIALTIES.map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSpecialty(s)}
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

                {step === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <h2 className="font-bold text-text-primary">Experience & Rate</h2>
                    <Input label="Years of Experience" type="number" error={errors.experience?.message} {...register('experience', { valueAsNumber: true })} />
                    <Input label="Hourly Rate (USD)" type="number" error={errors.hourlyRate?.message} {...register('hourlyRate', { valueAsNumber: true })} />
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">Upload Documents</label>
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

                {step === 4 && (
                  <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <h2 className="font-bold text-text-primary mb-4">Review & Submit</h2>
                    <div className="space-y-3 bg-bg-primary rounded-xl p-4 text-sm">
                      <div className="flex justify-between"><span className="text-text-secondary">Experience</span><span className="text-text-primary font-medium">{getValues('experience')} years</span></div>
                      <div className="flex justify-between"><span className="text-text-secondary">Hourly Rate</span><span className="text-text-primary font-medium">${getValues('hourlyRate')}/hr</span></div>
                      <div className="flex justify-between"><span className="text-text-secondary">Specialties</span><span className="text-text-primary font-medium">{specialties.length} selected</span></div>
                      <div className="flex justify-between"><span className="text-text-secondary">Documents</span><span className="text-text-primary font-medium">{documents.length} file(s)</span></div>
                    </div>
                    <p className="text-xs text-text-secondary mt-4">By submitting, you confirm all information is accurate. Review takes 24-48 hours.</p>
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
