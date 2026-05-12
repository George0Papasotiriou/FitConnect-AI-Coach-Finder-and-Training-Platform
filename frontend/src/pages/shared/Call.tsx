import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { sessionApi } from '../../api/session'
import { useAuthStore } from '../../store/authStore'
import VideoCall from '../../components/call/VideoCall'
import Spinner from '../../components/common/Spinner'
import CheckoutModal from '../../components/payment/CheckoutModal'
import apiClient from '../../api/client'

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

  const isInitiatorParam = searchParams.get('initiator') === 'true'

  return (
    <>
      <Helmet><title>Video Call — Insta Coach</title></Helmet>
      <VideoCall
        sessionId={sessionId!}
        isInitiator={isChatCall ? isInitiatorParam : user?.id === session?.traineeId}
        trainerName={isChatCall ? targetName : (user?.id === session?.traineeId ? session?.trainerName : session?.traineeName)}
        onClose={handleClose}
        isAdhoc={isChatCall}
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
