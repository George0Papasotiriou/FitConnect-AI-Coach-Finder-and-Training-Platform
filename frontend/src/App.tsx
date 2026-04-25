import { Routes, Route, Navigate } from 'react-router-dom'
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

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, token } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  if (token && user) {
    if (user.role === 'trainer') return <Navigate to="/trainer/dashboard" replace />
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/trainee/dashboard" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { user, token } = useAuthStore()

  return (
    <>
      <Routes>
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/trainer-application" element={<PublicRoute><TrainerApplication /></PublicRoute>} />
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
    </>
  )
}
