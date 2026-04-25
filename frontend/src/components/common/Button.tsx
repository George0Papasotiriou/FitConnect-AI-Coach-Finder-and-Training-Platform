import { forwardRef, ButtonHTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import Spinner from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses = {
  primary: 'bg-accent-purple hover:bg-purple-600 text-white border border-transparent',
  secondary: 'bg-transparent border border-accent-purple text-accent-purple hover:bg-accent-purple hover:text-white',
  ghost: 'bg-transparent border border-border-color text-text-secondary hover:bg-bg-card-hover hover:text-text-primary',
  danger: 'bg-red-600 hover:bg-red-700 text-white border border-transparent',
  teal: 'bg-accent-teal hover:bg-teal-500 text-bg-primary border border-transparent font-bold'
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}, ref) => {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        transition-all duration-200 cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </motion.button>
  )
})

Button.displayName = 'Button'
export default Button
