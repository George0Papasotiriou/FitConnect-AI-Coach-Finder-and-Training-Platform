import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { sessionApi } from '../../api/session'
import { useAuthStore } from '../../store/authStore'
import VideoCall from '../../components/call/VideoCall'
import Spinner from '../../components/common/Spinner'
import CheckoutModal from '../../components/payment/CheckoutModal'
import apiClient from '../../api/client'

export default function Call() {
  const { id: sessionId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    sessionApi.getSession(sessionId).then(data => {
      setSession(data)
      sessionApi.startSession(sessionId).catch(() => {})
    }).catch(() => navigate('/chat')).finally(() => setIsLoading(false))
  }, [sessionId])

  const [showCheckout, setShowCheckout] = useState(false)
  const [billingInfo, setBillingInfo] = useState({ freeTrialUsed: true })

  useEffect(() => {
    if (user?.role === 'trainee') {
      apiClient.get('/billing/info').then(res => setBillingInfo(res.data)).catch(() => {})
    }
  }, [user])

  const handleClose = () => {
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
      <Helmet><title>Video Call — Insta Coach</title></Helmet>
      <VideoCall
        sessionId={sessionId!}
        isInitiator={user?.id === session?.traineeId}
        trainerName={user?.id === session?.traineeId ? session?.trainerName : session?.traineeName}
        onClose={handleClose}
      />
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
