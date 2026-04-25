interface AvatarProps {
  src?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isOnline?: boolean
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-xl',
  xl: 'w-20 h-20 text-2xl'
}

const dotSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4'
}

function getInitials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getColorFromName(name?: string) {
  const colors = [
    'bg-purple-500', 'bg-teal-500', 'bg-blue-500', 'bg-orange-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-green-500', 'bg-red-500'
  ]
  if (!name) return colors[0]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export default function Avatar({ src, name, size = 'md', isOnline, className = '' }: AvatarProps) {
  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name ? `${name}'s avatar` : 'User avatar'}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-border-color`}
        />
      ) : (
        <div
          className={`${sizes[size]} ${getColorFromName(name)} rounded-full flex items-center justify-center font-bold text-white ring-2 ring-border-color`}
          aria-label={name ? `${name}'s avatar` : 'User avatar'}
        >
          {getInitials(name)}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizes[size]} rounded-full border-2 border-bg-card ${isOnline ? 'bg-accent-teal' : 'bg-text-secondary'}`}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      )}
    </div>
  )
}
