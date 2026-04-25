interface BadgeProps {
  children: React.ReactNode
  variant?: 'purple' | 'teal' | 'orange' | 'green' | 'red' | 'gray'
  size?: 'sm' | 'md'
  dot?: boolean
}

const variants = {
  purple: 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30',
  teal: 'bg-accent-teal/20 text-accent-teal border border-accent-teal/30',
  orange: 'bg-accent-orange/20 text-accent-orange border border-accent-orange/30',
  green: 'bg-green-500/20 text-green-400 border border-green-500/30',
  red: 'bg-red-500/20 text-red-400 border border-red-500/30',
  gray: 'bg-text-secondary/20 text-text-secondary border border-text-secondary/30'
}

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm'
}

export default function Badge({ children, variant = 'purple', size = 'sm', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variants[variant]} ${sizes[size]}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  )
}
