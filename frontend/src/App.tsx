/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import AppShell from './components/layout/AppShell'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import TrainerApplication from './pages/auth/TrainerApplication'
import TraineeOnboarding from './pages/onboarding/TraineeOnboarding'
import TrainerDashboard from './pages/trainer/TrainerDashboard'
import TrainerProfile from './pages/trainer/TrainerProfile'
import TrainerClients from './pages/trainer/TrainerClients'
import TrainerSessions from './pages/trainer/TrainerSessions'
import TraineeDashboard from './pages/trainee/TraineeDashboard'
import CoachSearch from './pages/trainee/CoachSearch'
import CoachProfile from './pages/trainee/CoachProfile'
import MyCoach from './pages/trainee/MyCoach'
import Chat from './pages/shared/Chat'
import Call from './pages/shared/Call'
import Notifications from './pages/shared/Notifications'
import Settings from './pages/shared/Settings'
import Leaderboard from './pages/gamification/Leaderboard'
import Achievements from './pages/gamification/Achievements'
import AdminDashboard from './pages/admin/AdminDashboard'
import ApplicationReview from './pages/admin/ApplicationReview'
import VoiceOrb from './components/voice/VoiceOrb'
import AITrainer from './pages/trainee/AITrainer'
import TrainingPrograms from './pages/trainee/TrainingPrograms'
import ProgressVisualizer from './pages/trainee/ProgressVisualizer'
import FormCritic from './pages/trainee/FormCritic'
import RecoveryDashboard from './pages/trainee/RecoveryDashboard'
import BountyBoard from './pages/shared/BountyBoard'
import CircadianOptimizer from './pages/trainee/CircadianOptimizer'
import CommunityMap from './pages/shared/CommunityMap'
import VirtualGym from './pages/shared/VirtualGym'
import IncomingCallModal from './components/call/IncomingCallModal'
import SocketManager from './components/layout/SocketManager'
import ProgressHub from './pages/shared/ProgressHub'
import GlobalCallOverlay from './components/call/GlobalCallOverlay'

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, token } = useAuthStore()
  const location = useLocation()
  if (!token || !user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  // Redirect trainees to onboarding if they haven't completed it yet
  if (
    user.role === 'trainee' &&
    user.onboardingComplete === false &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  const location = useLocation()
  // Allow logged-in trainee to see /onboarding (they just registered but haven't completed setup)
  if (location.pathname === '/onboarding') return <>{children}</>
  if (token && user) {
    if (user.role === 'trainer') return <Navigate to="/trainer/dashboard" replace />
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (user.role === 'trainee' && user.onboardingComplete === false) return <Navigate to="/onboarding" replace />
    return <Navigate to="/trainee/dashboard" replace />
  }
  return <>{children}</>
}

import TwoFactorSetup from './components/auth/TwoFactorSetup'
import { authApi } from './api/auth'

const DISMISSED_KEY = '2fa_dismissed_at'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000

function isDismissedRecently(): boolean {
  const ts = localStorage.getItem(DISMISSED_KEY)
  if (!ts) return false
  return Date.now() - parseInt(ts, 10) < DISMISS_TTL_MS
}

export default function App() {
  const { user, token, setUser } = useAuthStore()
  const [dismissed2FA, setDismissed2FA] = useState(isDismissedRecently)
  const show2FA = !!(token && user && !user.twoFactorEnabled && !dismissed2FA)

  const handle2FAComplete = () => {
    if (user) setUser({ ...user, twoFactorEnabled: true })
    localStorage.removeItem(DISMISSED_KEY)
  }

  const handle2FASkip = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    setDismissed2FA(true)
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/trainer-application" element={
          <PrivateRoute roles={['trainer']}><TrainerApplication /></PrivateRoute>
        } />
        <Route path="/onboarding" element={
          <PrivateRoute roles={['trainee']}>
            <TraineeOnboarding />
          </PrivateRoute>
        } />

        <Route element={
          <PrivateRoute>
            <AppShell />
          </PrivateRoute>
        }>
          <Route path="/trainer/dashboard" element={
            <PrivateRoute roles={['trainer']}>
              <TrainerDashboard />
            </PrivateRoute>
          } />
          <Route path="/trainer/profile" element={
            <PrivateRoute roles={['trainer']}>
              <TrainerProfile />
            </PrivateRoute>
          } />
          <Route path="/trainer/clients" element={
            <PrivateRoute roles={['trainer']}>
              <TrainerClients />
            </PrivateRoute>
          } />
          <Route path="/trainer/sessions" element={
            <PrivateRoute roles={['trainer']}>
              <TrainerSessions />
            </PrivateRoute>
          } />

          <Route path="/trainee/dashboard" element={
            <PrivateRoute roles={['trainee']}>
              <TraineeDashboard />
            </PrivateRoute>
          } />
          <Route path="/progress-hub" element={
            <PrivateRoute roles={['trainee']}>
              <ProgressHub />
            </PrivateRoute>
          } />
          <Route path="/search" element={
            <PrivateRoute roles={['trainee']}>
              <CoachSearch />
            </PrivateRoute>
          } />
          <Route path="/coach/:id" element={
            <PrivateRoute roles={['trainee']}>
              <CoachProfile />
            </PrivateRoute>
          } />
          <Route path="/my-coach" element={
            <PrivateRoute roles={['trainee']}>
              <MyCoach />
            </PrivateRoute>
          } />
          <Route path="/ai-trainer" element={
            <PrivateRoute roles={['trainee']}>
              <AITrainer />
            </PrivateRoute>
          } />
          <Route path="/programs" element={
            <PrivateRoute roles={['trainee']}>
              <TrainingPrograms />
            </PrivateRoute>
          } />
          <Route path="/progress" element={
            <PrivateRoute roles={['trainee']}>
              <ProgressVisualizer />
            </PrivateRoute>
          } />
          <Route path="/form-critic" element={
            <PrivateRoute roles={['trainee']}>
              <FormCritic />
            </PrivateRoute>
          } />
          <Route path="/recovery" element={
            <PrivateRoute roles={['trainee']}>
              <RecoveryDashboard />
            </PrivateRoute>
          } />
          <Route path="/bounties" element={
            <PrivateRoute>
              <BountyBoard />
            </PrivateRoute>
          } />
          <Route path="/circadian" element={
            <PrivateRoute roles={['trainee']}>
              <CircadianOptimizer />
            </PrivateRoute>
          } />
          <Route path="/map" element={
            <PrivateRoute>
              <CommunityMap />
            </PrivateRoute>
          } />
          <Route path="/virtual-gym" element={
            <PrivateRoute>
              <VirtualGym />
            </PrivateRoute>
          } />

          <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/chat/:id" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/call/:id" element={<PrivateRoute><Call /></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/achievements" element={<PrivateRoute><Achievements /></PrivateRoute>} />

          <Route path="/admin/dashboard" element={
            <PrivateRoute roles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          } />
          <Route path="/admin/applications/:id" element={
            <PrivateRoute roles={['admin']}>
              <ApplicationReview />
            </PrivateRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {token && user && <VoiceOrb />}
      {token && user && <IncomingCallModal />}
      {token && user && <SocketManager />}
      {token && user && <GlobalCallOverlay />}
      {show2FA && <TwoFactorSetup onComplete={handle2FAComplete} onSkip={handle2FASkip} />}
    </>
  )
}
