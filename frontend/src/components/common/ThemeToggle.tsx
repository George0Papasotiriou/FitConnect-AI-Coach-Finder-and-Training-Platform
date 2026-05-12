import { motion } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <button
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple overflow-hidden flex items-center justify-center`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: theme === 'light' ? 0 : 90,
          scale: theme === 'light' ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Sun size={20} />
      </motion.div>
      <motion.div
        initial={false}
        animate={{
          rotate: theme === 'dark' ? 0 : -90,
          scale: theme === 'dark' ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
        className="absolute"
      >
        <Moon size={20} />
      </motion.div>
      
      {/* Invisible spacer to maintain button size */}
      <span className="invisible"><Sun size={20} /></span>
    </button>
  )
}
