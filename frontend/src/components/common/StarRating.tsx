import { useState } from 'react'
import { Star } from 'lucide-react'

interface StarRatingProps {
  value?: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: number
  label?: string
}

export default function StarRating({ value = 0, onChange, readonly = false, size = 20, label = 'Rating' }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div
      role={readonly ? 'img' : 'radiogroup'}
      aria-label={`${label}: ${value} out of 5 stars`}
      className="flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role={readonly ? undefined : 'radio'}
          aria-checked={readonly ? undefined : value === star}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-all duration-150 ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple rounded'}`}
        >
          <Star
            size={size}
            className={`transition-colors duration-150 ${
              star <= display
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-transparent text-text-secondary'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
