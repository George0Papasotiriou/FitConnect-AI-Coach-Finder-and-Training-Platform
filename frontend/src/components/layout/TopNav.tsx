/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Bell, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../../store/notificationStore'
import { useAuthStore } from '../../store/authStore'
import Avatar from '../common/Avatar'
import ThemeToggle from '../common/ThemeToggle'

interface TopNavProps {
  sidebarCollapsed: boolean
  isMobile?: boolean
}

export default function TopNav({ sidebarCollapsed, isMobile }: TopNavProps) {
  const { unreadCount } = useNotificationStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  return (
    <header
      className="fixed top-0 right-0 h-16 z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-300 pt-[env(safe-area-inset-top,0px)]
        bg-[var(--glass-bg)] backdrop-blur-2xl border-b border-[var(--glass-border)]
        shadow-[0_1px_3px_0_var(--glass-shadow),0_4px_16px_-2px_var(--glass-shadow)]"
      style={{ left: isMobile ? 0 : (sidebarCollapsed ? 72 : 260) }}
      aria-label="Top navigation"
    >
      <div className="flex-1 max-w-md flex items-center gap-2">
        {isMobile && (
          <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-teal rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-accent-purple/20">
            <span className="text-white font-black text-xs">AF</span>
          </div>
        )}
        <div className={`relative ${isMobile ? 'hidden sm:block' : 'block'} flex-1`}>
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search the app"
            className="w-full rounded-2xl pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder-text-secondary/60
              bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)]
              shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.03)]
              focus:outline-none focus:border-accent-purple/40
              focus:shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.03),0_0_0_3px_rgba(16,185,129,0.1)]
              transition-all duration-300"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        {isMobile && (
          <button className="p-2.5 sm:hidden text-text-secondary hover:text-text-primary rounded-2xl
            hover:bg-[var(--glass-bg)] transition-all duration-200">
            <Search size={18} />
          </button>
        )}
        
        <ThemeToggle />
        
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2.5 rounded-2xl text-text-secondary hover:text-text-primary transition-all duration-200
            hover:bg-[var(--glass-bg)] hover:border-[var(--glass-border)]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-accent-orange text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md shadow-accent-orange/30">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate(user?.role === 'trainer' ? '/trainer/profile' : '/settings')}
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-2xl p-1 ml-1 transition-all duration-200
            hover:bg-[var(--glass-bg)]"
          aria-label="Your profile"
        >
          <Avatar src={user?.avatar} name={user?.name} size="sm" />
        </button>
      </div>
    </header>
  )
}
