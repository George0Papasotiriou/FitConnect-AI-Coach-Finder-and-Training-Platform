/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { sessionApi } from '../../api/session'
import { useAuthStore } from '../../store/authStore'
import VideoCall from '../../components/call/VideoCall'
import Spinner from '../../components/common/Spinner'
import CheckoutModal from '../../components/payment/CheckoutModal'
import apiClient from '../../api/client'
import { useCallStore } from '../../store/callStore'

export default function Call() {
  const { id: sessionId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const isChatCall = searchParams.get('type') === 'chat'
  const targetName = searchParams.get('name') || 'User'
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    if (isChatCall) {
      setIsLoading(false)
      return
    }
    sessionApi.getSession(sessionId).then(data => {
      setSession(data)
      sessionApi.startSession(sessionId).catch(() => {})
    }).catch(() => navigate('/chat')).finally(() => setIsLoading(false))
  }, [sessionId, isChatCall, navigate])

  const [showCheckout, setShowCheckout] = useState(false)
  const [billingInfo, setBillingInfo] = useState({ freeTrialUsed: true })

  useEffect(() => {
    if (user?.role === 'trainee') {
      apiClient.get('/billing/info').then(res => setBillingInfo(res.data)).catch(() => {})
    }
  }, [user])

  const { setActiveCall, activeCall, setMinimized } = useCallStore()

  useEffect(() => {
    if (!sessionId || isLoading) return

    const isInitiatorParam = searchParams.get('initiator') === 'true'
    const callData = {
      sessionId: sessionId!,
      isInitiator: isChatCall ? isInitiatorParam : user?.id === session?.traineeId,
      trainerName: isChatCall ? targetName : (user?.id === session?.traineeId ? session?.trainerName : session?.traineeName),
      isAdhoc: isChatCall
    }

    setActiveCall(callData)
  }, [sessionId, isLoading, session, user, isChatCall, searchParams, targetName, setActiveCall])

  const handleClose = () => {
    if (isChatCall) {
      navigate(-1)
      return
    }
    if (user?.role === 'trainee') {
      setShowCheckout(true)
    } else {
      if (sessionId) sessionApi.endSession(sessionId).catch(() => {})
      navigate(-1)
    }
  }

  const handleCheckoutSuccess = () => {
    if (sessionId) sessionApi.endSession(sessionId).catch(() => {})
    navigate('/trainee/dashboard')
  }

  if (isLoading) return <div className="fixed inset-0 bg-black flex items-center justify-center z-50"><Spinner size="lg" color="border-white" /></div>

  return (
    <>
      <Helmet><title>Video Call — AbiliFit</title></Helmet>
      
      {/* 
          We no longer render VideoCall here. 
          GlobalCallOverlay (in App.tsx) handles rendering based on useCallStore.
          This page now just serves as the Full Screen "anchor" for the call.
      */}

      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-accent-purple/10 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent-purple border-t-transparent rounded-full animate-spin" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-text-primary">Call in Progress</h2>
            <p className="text-text-secondary mt-2">The call window is managed globally.</p>
        </div>
        <button 
            onClick={() => setMinimized(true)}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-text-primary transition-all"
        >
            Minimize to Floating Window
        </button>
      </div>

      <CheckoutModal 
        isOpen={showCheckout}
        onClose={() => navigate('/trainee/dashboard')}
        onSuccess={handleCheckoutSuccess}
        type="session"
        trainerId={session?.trainerId}
        sessionId={sessionId}
        amount={billingInfo.freeTrialUsed ? 18 : 0}
      />
    </>
  )
}
