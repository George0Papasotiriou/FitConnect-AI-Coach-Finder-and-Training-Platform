import { useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnOverlay?: boolean
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl'
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', closeOnOverlay = true }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Tab') {
      const focusables = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables?.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      setTimeout(() => firstFocusableRef.current?.focus(), 50)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={closeOnOverlay ? (e) => { if (e.target === e.currentTarget) onClose() } : undefined}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`w-full ${sizeClasses[size]} bg-bg-card border border-border-color rounded-2xl shadow-2xl`}
          >
            {title && (
              <div className="flex items-center justify-between p-6 border-b border-border-color">
                <h2 id="modal-title" className="text-lg font-bold text-text-primary">{title}</h2>
                <button
                  ref={firstFocusableRef}
                  onClick={onClose}
                  className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
                  aria-label="Close dialog"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className={title ? 'p-6' : 'p-6'}>
              {!title && (
                <div className="flex justify-end mb-4">
                  <button
                    ref={firstFocusableRef}
                    onClick={onClose}
                    className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors"
                    aria-label="Close dialog"
                  >
                    <X size={20} />
                  </button>
                </div>
              )}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
