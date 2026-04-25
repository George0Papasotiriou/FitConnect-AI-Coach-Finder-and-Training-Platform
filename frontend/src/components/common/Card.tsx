import { HTMLAttributes } from 'react'
import { motion } from 'framer-motion'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  glass?: boolean
  gradient?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingClasses = { sm: 'p-4', md: 'p-6', lg: 'p-8', none: '' }

export default function Card({
  hover = false,
  glass = false,
  gradient = false,
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  const base = `
    rounded-2xl border
    ${glass
      ? 'backdrop-blur-xl bg-bg-card/80 border-accent-purple/20'
      : 'bg-bg-card border-border-color'}
    ${gradient ? 'bg-gradient-to-br from-bg-card to-bg-card-hover' : ''}
    ${paddingClasses[padding]}
    ${hover ? 'hover:border-accent-purple/40 hover:bg-bg-card-hover transition-all duration-200 cursor-pointer' : ''}
    ${className}
  `

  if (hover) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className={base}
        {...(props as React.ComponentProps<typeof motion.div>)}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div className={base} {...props}>
      {children}
    </div>
  )
}
