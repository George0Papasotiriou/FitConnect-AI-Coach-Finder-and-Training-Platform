interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
}

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }

export default function Spinner({ size = 'md', color = 'border-accent-purple' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${sizes[size]} border-2 ${color} border-t-transparent rounded-full animate-spin`}
    />
  )
}
