/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, MessageCircle, Trophy, User, Bell, Users, CalendarDays, Dumbbell, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'

export default function MobileNav() {
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  const traineeItems = [
    { to: '/trainee/dashboard', icon: <LayoutDashboard size={21} />, label: 'Home' },
    { to: '/progress-hub', icon: <Sparkles size={21} />, label: 'Progress' },
    { to: '/programs', icon: <Dumbbell size={21} />, label: 'Programs' },
    { to: '/chat', icon: <MessageCircle size={21} />, label: 'Chat' },
    { to: '/leaderboard', icon: <Trophy size={21} />, label: 'Rank' },
  ]

  const trainerItems = [
    { to: '/trainer/dashboard', icon: <LayoutDashboard size={21} />, label: 'Home' },
    { to: '/trainer/clients', icon: <Users size={21} />, label: 'Clients' },
    { to: '/trainer/sessions', icon: <CalendarDays size={21} />, label: 'Sessions' },
    { to: '/chat', icon: <MessageCircle size={21} />, label: 'Chat' },
    { to: '/trainer/profile', icon: <User size={21} />, label: 'Profile' }
  ]

  const adminItems = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={21} />, label: 'Home' },
    { to: '/chat', icon: <MessageCircle size={21} />, label: 'Chat' },
    { to: '/notifications', icon: <Bell size={21} />, label: 'Alerts' },
    { to: '/settings', icon: <User size={21} />, label: 'Profile' }
  ]

  const items = user?.role === 'trainer' ? trainerItems : user?.role === 'admin' ? adminItems : traineeItems

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden
        pb-[env(safe-area-inset-bottom,12px)]"
      aria-label="Mobile navigation"
    >
      {/* Floating glass dock with margin */}
      <div className="mx-3 mb-1 rounded-[1.75rem] overflow-hidden
        bg-[var(--glass-bg-heavy)] backdrop-blur-2xl
        border border-[var(--glass-border)]
        shadow-[inset_0_1px_0_0_var(--glass-inner-highlight),0_-2px_12px_0_var(--glass-shadow),0_-8px_32px_-4px_var(--glass-shadow-heavy)]"
      >
        <ul className="flex items-center justify-around h-[60px] px-1 relative">
          {items.map((item) => (
            <li key={item.to} className="flex-1 relative h-full">
              <NavLink
                to={item.to}
                className={({ isActive }) => `
                  flex flex-col items-center justify-center gap-0.5 w-full h-full relative z-10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-2xl
                  transition-all duration-200
                  ${isActive ? 'text-accent-purple' : 'text-text-secondary hover:text-text-primary'}
                `}
                aria-label={item.label}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="mobileNavIndicator"
                        className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full
                          bg-gradient-to-r from-accent-purple to-accent-teal
                          shadow-[0_2px_12px_rgba(16,185,129,0.4)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    )}
                    <motion.span
                      className="relative"
                      animate={isActive ? { scale: 1.12, y: -1 } : { scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      {item.icon}
                      {item.label === 'Chat' && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent-orange text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md shadow-accent-orange/30 border-2 border-[var(--bg-primary)]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </motion.span>
                    <span className={`text-[10px] font-bold transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 font-medium'}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
