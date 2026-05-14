/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import Modal from '../common/Modal'
import StarRating from '../common/StarRating'
import Button from '../common/Button'
import { sessionApi } from '../../api/session'
import { toast } from 'sonner'

interface PostCallRatingProps {
  isOpen: boolean
  sessionId: string
  trainerName: string
  onClose: () => void
}

export default function PostCallRating({ isOpen, sessionId, trainerName, onClose }: PostCallRatingProps) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }
    setIsSubmitting(true)
    try {
      await sessionApi.rateSession(sessionId, rating, review)
      toast.success('Thank you for your feedback!')
      onClose()
    } catch {
      toast.error('Failed to submit rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rate Your Session" closeOnOverlay={false}>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <p className="text-text-secondary mb-4">
            How was your session with <span className="text-text-primary font-semibold">{trainerName}</span>?
          </p>
          <div className="flex justify-center mb-2">
            <StarRating value={rating} onChange={setRating} size={36} label="Session rating" />
          </div>
          <p className="text-xs text-text-secondary">
            {rating === 0 ? 'Select a rating' : ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        </motion.div>

        <div>
          <label htmlFor="review" className="block text-sm font-medium text-text-secondary mb-1.5">
            Leave a comment (optional)
          </label>
          <textarea
            id="review"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            className="w-full bg-bg-primary border border-border-color rounded-xl px-4 py-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-purple resize-none text-sm"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} fullWidth>
            Skip
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting} fullWidth>
            Submit Rating
          </Button>
        </div>
      </div>
    </Modal>
  )
}
