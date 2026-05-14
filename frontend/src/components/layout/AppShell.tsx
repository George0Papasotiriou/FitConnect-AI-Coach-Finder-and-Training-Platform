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

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sidebarWidth = collapsed ? 72 : 256

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}

      <TopNav sidebarCollapsed={collapsed} isMobile={isMobile} />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 transition-all duration-300 pt-16 md:pt-20 pb-[calc(env(safe-area-inset-bottom,24px)+64px)] lg:pb-0 min-h-screen"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <div className="p-4 md:p-6 max-w-7xl mx-auto h-full">
          <Outlet />
        </div>
      </main>

      {isMobile && <MobileNav />}
    </div>
  )
}
