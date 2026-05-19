/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Search, MessageCircle, Trophy, Star,
  Settings, Bell, LogOut, Users, CalendarDays, User,
  ChevronLeft, ChevronRight, Zap, Sparkles, Dumbbell, Camera,
  Brain, Heart, Target, Sun, Globe, Box
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'
import Avatar from '../common/Avatar'
import XPBar from '../common/XPBar'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const { unreadCount } = useNotificationStore()
  const navigate = useNavigate()

  const traineeNav = [
    { to: '/trainee/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/progress-hub', icon: <Sparkles size={20} />, label: 'My Progress' },
    { to: '/my-coach', icon: <User size={20} />, label: 'My Coach' },
    { to: '/programs', icon: <Dumbbell size={20} />, label: 'My Programs' },
    { to: '/map', icon: <Globe size={20} />, label: 'Sweat Map' },
    {to: '/virtual-gym', icon: <Box size={20} />, label: 'Solo Trainer' },
    { to: '/bounties', icon: <Target size={20} />, label: 'Bounties' },
    { to: '/ai-trainer', icon: <Zap size={20} />, label: 'AI Trainer' },
    { to: '/chat', icon: <MessageCircle size={20} />, label: 'Messages' },
    { to: '/leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard' }
  ]

  const trainerNav = [
    { to: '/trainer/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/trainer/clients', icon: <Users size={20} />, label: 'Clients' },
    { to: '/trainer/sessions', icon: <CalendarDays size={20} />, label: 'Sessions' },
    { to: '/bounties', icon: <Target size={20} />, label: 'Bounties' },
    { to: '/trainer/profile', icon: <User size={20} />, label: 'Profile' },
    { to: '/chat', icon: <MessageCircle size={20} />, label: 'Messages' },
    { to: '/leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard' }
  ]

  const adminNav = [
    { to: '/admin/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/chat', icon: <MessageCircle size={20} />, label: 'Messages' }
  ]

  const navItems = user?.role === 'trainer' ? trainerNav : user?.role === 'admin' ? adminNav : traineeNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-full z-40 flex flex-col overflow-hidden
        bg-[var(--glass-bg-heavy)] backdrop-blur-2xl border-r border-[var(--glass-border)]
        shadow-[1px_0_24px_-4px_var(--glass-shadow)]"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-[var(--glass-border)] h-16 flex-shrink-0 ${collapsed ? 'px-3 py-4' : 'p-4'}`}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-accent-purple to-accent-teal rounded-xl flex items-center justify-center shadow-lg shadow-accent-purple/20">
                <Zap size={14} className="text-white" />
              </div>
              <span className="font-black text-lg gradient-text">AbiliFit</span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-accent-purple to-accent-teal rounded-xl flex items-center justify-center shadow-lg shadow-accent-purple/20">
            <Zap size={14} className="text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary
            hover:bg-[var(--glass-bg)] transition-all duration-200 ml-auto
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin" aria-label="Site navigation">
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple
                  ${isActive
                    ? `bg-accent-purple/15 text-accent-purple font-semibold backdrop-blur-sm
                       border border-accent-purple/15
                       shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1),0_0_12px_-4px_rgba(16,185,129,0.15)]`
                    : 'text-text-secondary hover:text-text-primary hover:bg-[var(--glass-bg)] border border-transparent'}
                `}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-3 px-2 space-y-0.5 border-t border-[var(--glass-border)] pt-3">
          <NavLink
            to="/notifications"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 relative
              ${isActive
                ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/15'
                : 'text-text-secondary hover:text-text-primary hover:bg-[var(--glass-bg)] border border-transparent'}
            `}
            title={collapsed ? 'Notifications' : undefined}
          >
            <span className="relative flex-shrink-0">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-orange text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">
                  Notifications
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200
              ${isActive
                ? 'bg-accent-purple/15 text-accent-purple border border-accent-purple/15'
                : 'text-text-secondary hover:text-text-primary hover:bg-[var(--glass-bg)] border border-transparent'}
            `}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={20} className="flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-medium">
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        </div>
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-[var(--glass-border)] flex-shrink-0">
        {!collapsed && user && (
          <div className="mb-3">
            <XPBar compact />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Avatar src={user?.avatar} name={user?.name} size="sm" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
                <p className="text-xs text-text-secondary capitalize">{user?.role}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
