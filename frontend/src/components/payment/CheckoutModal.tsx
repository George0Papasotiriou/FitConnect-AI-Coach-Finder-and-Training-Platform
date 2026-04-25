import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CreditCard, Landmark, Apple, Play, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import Button from '../common/Button'
import Card from '../common/Card'
import { toast } from 'sonner'
import apiClient from '../../api/client'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  type: 'session' | 'subscription'
  trainerId?: string
  sessionId?: string
  amount: number
}

export default function CheckoutModal({ isOpen, onClose, onSuccess, type, trainerId, sessionId, amount }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'paypal' | 'apple' | 'google'>('card')

  const methods = [
    { id: 'card', name: 'Credit Card', icon: <CreditCard size={20} /> },
    { id: 'paypal', name: 'PayPal', icon: <Landmark size={20} /> },
    { id: 'apple', name: 'Apple Pay', icon: <Apple size={20} /> },
    { id: 'google', name: 'Google Play', icon: <Play size={20} /> },
  ]

  const handlePay = async () => {
    setLoading(true)
    try {
      const endpoint = type === 'session' ? '/billing/pay-session' : '/billing/subscribe-trainer'
      const payload = type === 'session' 
        ? { sessionId, trainerId, paymentMethod: selectedMethod }
        : { paymentMethod: selectedMethod }

      await apiClient.post(endpoint, payload)
      
      toast.success('Payment Successful!')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toast.error('Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-bg-primary w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10 border border-border-color">
            
            <div className="p-6 border-b border-border-color flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-text-primary flex items-center gap-2">
                  <ShieldCheck className="text-accent-purple" /> Secure Checkout
                </h3>
                <p className="text-xs text-text-secondary">All transactions are encrypted and secure</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-bg-card rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-accent-purple/5 border border-accent-purple/10 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-accent-purple uppercase tracking-wider">Total Amount</p>
                  <p className="text-3xl font-black text-text-primary">€{amount.toFixed(2)}</p>
                </div>
                <div className="bg-accent-purple/10 p-3 rounded-xl text-accent-purple">
                  <Sparkles size={24} />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  {methods.map(method => (
                    <button key={method.id} onClick={() => setSelectedMethod(method.id as any)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                        selectedMethod === method.id 
                        ? 'border-accent-purple bg-accent-purple/5 text-text-primary shadow-lg shadow-accent-purple/10' 
                        : 'border-border-color bg-bg-card text-text-secondary hover:border-accent-purple/30'
                      }`}>
                      {method.icon}
                      <span className="text-sm font-bold">{method.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-1">
                <input type="checkbox" id="save-payment" className="w-4 h-4 accent-accent-purple" defaultChecked />
                <label htmlFor="save-payment" className="text-sm text-text-secondary font-medium cursor-pointer">
                  Save card details for future training sessions
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <Button fullWidth size="lg" onClick={handlePay} isLoading={loading} leftIcon={<CheckCircle2 size={18} />}>
                  Pay Now
                </Button>
                <p className="text-[10px] text-center text-text-secondary px-4">
                  By clicking Pay Now, you agree to our Terms of Service and Privacy Policy. Insta Coach keeps a flat €3 processing fee.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
