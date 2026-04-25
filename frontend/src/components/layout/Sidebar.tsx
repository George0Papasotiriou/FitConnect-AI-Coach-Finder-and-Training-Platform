import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Search, MessageCircle, Trophy, Star,
  Settings, Bell, LogOut, Users, Calendar, User,
  ChevronLeft, ChevronRight, Zap, Sparkles
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
    { to: '/search', icon: <Search size={20} />, label: 'Find Coach' },
    { to: '/my-coach', icon: <User size={20} />, label: 'My Coach' },
    { to: '/ai-trainer', icon: <Sparkles size={20} />, label: 'AI Trainer' },
    { to: '/chat', icon: <MessageCircle size={20} />, label: 'Messages' },
    { to: '/leaderboard', icon: <Trophy size={20} />, label: 'Leaderboard' },
    { to: '/achievements', icon: <Star size={20} />, label: 'Achievements' }
  ]

  const trainerNav = [
    { to: '/trainer/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { to: '/trainer/clients', icon: <Users size={20} />, label: 'Clients' },
    { to: '/trainer/sessions', icon: <Calendar size={20} />, label: 'Sessions' },
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
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-full bg-bg-card border-r border-border-color z-40 flex flex-col overflow-hidden"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between p-4 border-b border-border-color h-16 flex-shrink-0">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-teal rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" />
              </div>
              <span className="font-black text-lg gradient-text">FitConnect</span>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-teal rounded-lg flex items-center justify-center mx-auto">
            <Zap size={16} className="text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ml-auto"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin" aria-label="Site navigation">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple
                  ${isActive
                    ? 'bg-accent-purple/20 text-accent-purple font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'}
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

        <div className="mt-4 px-2 space-y-1 border-t border-border-color pt-4">
          <NavLink
            to="/notifications"
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative
              ${isActive ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'}
            `}
            title={collapsed ? 'Notifications' : undefined}
          >
            <span className="relative flex-shrink-0">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-orange text-white text-xs rounded-full flex items-center justify-center font-bold">
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
              flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150
              ${isActive ? 'bg-accent-purple/20 text-accent-purple' : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'}
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

      <div className="p-4 border-t border-border-color flex-shrink-0">
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
            className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
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
