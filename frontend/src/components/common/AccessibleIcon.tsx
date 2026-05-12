interface AccessibleIconProps {
  icon: React.ReactNode
  label: string
  className?: string
}

export default function AccessibleIcon({ icon, label, className = '' }: AccessibleIconProps) {
  return (
    <span className={`inline-flex ${className}`} aria-hidden="true" title={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  )
}
