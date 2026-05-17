/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import MobileNav from './MobileNav'
import AppTutorial from './AppTutorial'
import { useAuthStore } from '../../store/authStore'

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const { user } = useAuthStore()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sidebarWidth = collapsed ? 72 : 260

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--bg-primary)' }}>
      {/* Animated gradient mesh background for glass refraction */}
      <div className="gradient-mesh" aria-hidden="true">
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full opacity-15 dark:opacity-[0.06] blur-[140px] animate-subtle-float"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.3) 0%, transparent 70%)' }} />
      </div>

      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}

      <TopNav sidebarCollapsed={collapsed} isMobile={isMobile} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 transition-all duration-300 pt-16 md:pt-20 pb-[calc(env(safe-area-inset-bottom,24px)+80px)] lg:pb-4 min-h-screen relative"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <div className="p-4 md:p-6 max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>

      {isMobile && <MobileNav />}

      {/* Onboarding tutorial for trainees */}
      {user?.role === 'trainee' && <AppTutorial />}
    </div>
  )
}
