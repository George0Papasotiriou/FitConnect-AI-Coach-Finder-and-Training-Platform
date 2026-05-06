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
      className="fixed top-0 right-0 h-16 bg-bg-primary/90 backdrop-blur-xl border-b border-border-color z-30 flex items-center justify-between px-4 md:px-6 transition-all duration-300 shadow-sm pt-[env(safe-area-inset-top,0px)]"
      style={{ left: isMobile ? 0 : (sidebarCollapsed ? 72 : 256) }}
      aria-label="Top navigation"
    >
      <div className="flex-1 max-w-md flex items-center gap-2">
        {isMobile && (
            <div className="w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-teal rounded-lg flex items-center justify-center flex-shrink-0">
               <span className="text-white font-black text-xs">IC</span>
            </div>
        )}
        <div className={`relative ${isMobile ? 'hidden sm:block' : 'block'}`}>
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search the app"
            className="w-full bg-bg-card border border-border-color rounded-xl pl-9 pr-4 py-2 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent-purple focus:ring-1 focus:ring-accent-purple transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-3">
        {isMobile && (
           <button className="p-2 sm:hidden text-text-secondary hover:text-text-primary rounded-xl">
               <Search size={20} />
           </button>
        )}
        
        <ThemeToggle />
        
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-accent-orange text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate(user?.role === 'trainer' ? '/trainer/profile' : '/settings')}
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded-xl p-1 ml-1"
          aria-label="Your profile"
        >
          <Avatar src={user?.avatar} name={user?.name} size="sm" />
        </button>
      </div>
    </header>
  )
}
