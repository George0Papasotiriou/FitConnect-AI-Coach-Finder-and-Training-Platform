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
    { to: '/trainee/dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
    { to: '/progress-hub', icon: <Sparkles size={22} />, label: 'Progress' },
    { to: '/programs', icon: <Dumbbell size={22} />, label: 'Programs' },
    { to: '/chat', icon: <MessageCircle size={22} />, label: 'Chat' },
    { to: '/leaderboard', icon: <Trophy size={22} />, label: 'Rank' },
  ]

  const trainerItems = [
    { to: '/trainer/dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
    { to: '/trainer/clients', icon: <Users size={22} />, label: 'Clients' },
    { to: '/trainer/sessions', icon: <CalendarDays size={22} />, label: 'Sessions' },
    { to: '/chat', icon: <MessageCircle size={22} />, label: 'Chat' },
    { to: '/trainer/profile', icon: <User size={22} />, label: 'Profile' }
  ]

  const adminItems = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
    { to: '/chat', icon: <MessageCircle size={22} />, label: 'Chat' },
    { to: '/notifications', icon: <Bell size={22} />, label: 'Alerts' },
    { to: '/settings', icon: <User size={22} />, label: 'Profile' }
  ]

  const items = user?.role === 'trainer' ? trainerItems : user?.role === 'admin' ? adminItems : traineeItems

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-bg-primary/90 backdrop-blur-xl border-t border-border-color z-40 lg:hidden pb-[env(safe-area-inset-bottom,16px)] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-center justify-around h-[64px] px-2 relative">
        {items.map((item) => (
          <li key={item.to} className="flex-1 relative h-full">
            <NavLink
              to={item.to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-1 w-full h-full relative z-10
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-xl
                ${isActive ? 'text-accent-purple' : 'text-text-secondary hover:text-text-primary'}
              `}
              aria-label={item.label}
            >
              {({ isActive }) => (
                  <>
                      {isActive && (
                          <motion.div 
                              layoutId="mobileNavIndicator"
                              className="absolute -top-px left-1/2 -translate-x-1/2 w-10 h-1 bg-accent-purple rounded-b-full shadow-[0_2px_10px_rgba(16,185,129,0.5)]" 
                              initial={false}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                      )}
                      <motion.span 
                          className="relative"
                          animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {item.icon}
                        {item.label === 'Chat' && unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent-orange text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md border-2 border-bg-primary">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </motion.span>
                      <span className={`text-[10px] font-bold transition-opacity ${isActive ? 'opacity-100' : 'opacity-70 font-medium'}`}>
                          {item.label}
                      </span>
                  </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
