/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, X } from 'lucide-react'
import { useVoiceAI } from '../../hooks/useVoiceAI'
import Spinner from '../common/Spinner'

export default function VoiceOrb() {
  const [isOpen, setIsOpen] = useState(false)
  const { isListening, isProcessing, transcript, response, amplitude, startListening, stopListening } = useVoiceAI()

  const handleToggle = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true)
    } else {
      if (isListening) stopListening()
      setIsOpen(false)
    }
  }, [isOpen, isListening, stopListening])

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  const scale = 1 + amplitude * 0.4

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
            role="dialog"
            aria-modal="true"
            aria-label="Voice AI Assistant"
          >
            <button
              onClick={handleToggle}
              className="absolute top-6 right-6 p-2 rounded-full bg-bg-card text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
              aria-label="Close Voice AI"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center gap-8 px-6 max-w-md w-full text-center">
              <motion.div
                animate={{ scale: isListening ? scale : [1, 1.04, 1] }}
                transition={isListening
                  ? { duration: 0.1 }
                  : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                }
                className="relative cursor-pointer"
                onClick={handleMicToggle}
                role="button"
                tabIndex={0}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                onKeyDown={(e) => e.key === 'Enter' && handleMicToggle()}
              >
                <div
                  className="w-40 h-40 rounded-full flex items-center justify-center relative"
                  style={{
                    background: 'radial-gradient(circle at 40% 35%, #34d399, #10b981 50%, #059669)',
                    boxShadow: isListening
                      ? `0 0 ${40 + amplitude * 60}px rgba(16,185,129,0.8), 0 0 ${80 + amplitude * 100}px rgba(5,150,105,0.4)`
                      : '0 0 40px rgba(16,185,129,0.4), 0 0 80px rgba(5,150,105,0.2)'
                  }}
                >
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-full border border-accent-purple/30"
                      animate={{ scale: [1, 1.3 + i * 0.15], opacity: [0.6, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: 'easeOut'
                      }}
                    />
                  ))}

                  {isProcessing ? (
                    <Spinner size="lg" color="border-white" />
                  ) : (
                    <motion.div
                      animate={{ scale: isListening ? [1, 1.1, 1] : 1 }}
                      transition={{ duration: 0.5, repeat: isListening ? Infinity : 0 }}
                    >
                      {isListening ? (
                        <MicOff size={48} className="text-white" />
                      ) : (
                        <Mic size={48} className="text-white" />
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>

              <div className="space-y-3 min-h-[80px]">
                <p className="text-sm text-text-secondary">
                  {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Tap orb to speak'}
                </p>

                {transcript && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-bg-card/60 rounded-xl px-4 py-3 border border-border-color"
                  >
                    <p className="text-sm text-text-secondary mb-1 font-medium">You said:</p>
                    <p className="text-text-primary">{transcript}</p>
                  </motion.div>
                )}

                {response && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-accent-purple/10 rounded-xl px-4 py-3 border border-accent-purple/20"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    <p className="text-sm text-accent-purple mb-1 font-medium">Insta Coach AI:</p>
                    <p className="text-text-primary">{response}</p>
                  </motion.div>
                )}
              </div>

              <p className="text-xs text-text-secondary">
                Try: "Go to search", "Find yoga coach", "Show my achievements"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
        style={{
          background: 'linear-gradient(135deg, #10b981, #059669)',
          boxShadow: '0 0 20px rgba(16,185,129,0.5)'
        }}
        aria-label="Open Voice AI Assistant"
        aria-expanded={isOpen}
      >
        <motion.div
          animate={isOpen ? {} : { scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Mic size={24} className="text-white" />
        </motion.div>
      </motion.button>
    </>
  )
}
