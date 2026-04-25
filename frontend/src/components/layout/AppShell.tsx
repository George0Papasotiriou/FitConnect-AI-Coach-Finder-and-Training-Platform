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
    <div className="min-h-screen bg-bg-primary">
      {!isMobile && (
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      )}

      <TopNav sidebarCollapsed={isMobile ? false : collapsed} />

      <main
        id="main-content"
        tabIndex={-1}
        className="transition-all duration-300 pt-16 pb-20 lg:pb-0 min-h-screen"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {isMobile && <MobileNav />}
    </div>
  )
}
