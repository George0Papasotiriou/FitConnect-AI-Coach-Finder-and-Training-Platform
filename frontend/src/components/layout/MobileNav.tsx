import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, MessageCircle, Trophy, User, Bell, Users, Calendar, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useNotificationStore } from '../../store/notificationStore'

export default function MobileNav() {
  const { user } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  const traineeItems = [
    { to: '/trainee/dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
    { to: '/search', icon: <Search size={22} />, label: 'Search' },
    { to: '/ai-trainer', icon: <Sparkles size={22} />, label: 'AI' },
    { to: '/chat', icon: <MessageCircle size={22} />, label: 'Chat' },
    { to: '/leaderboard', icon: <Trophy size={22} />, label: 'Rank' },
  ]

  const trainerItems = [
    { to: '/trainer/dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
    { to: '/trainer/clients', icon: <Users size={22} />, label: 'Clients' },
    { to: '/trainer/sessions', icon: <Calendar size={22} />, label: 'Sessions' },
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
      className="fixed bottom-0 left-0 right-0 bg-bg-card/95 backdrop-blur-xl border-t border-border-color z-40 lg:hidden safe-area-pb"
      aria-label="Mobile navigation"
    >
      <ul className="flex items-center justify-around h-16">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-0.5 h-full py-2 transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-lg
                ${isActive ? 'text-accent-purple' : 'text-text-secondary'}
              `}
              aria-label={item.label}
            >
              <span className="relative">
                {item.icon}
                {item.label === 'Chat' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-accent-orange text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9' : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
