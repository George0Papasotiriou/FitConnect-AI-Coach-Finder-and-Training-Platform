import { cn } from "@/lib/utils";

interface ApertureLogoProps {
  className?: string;
  size?: number;
}

/**
 * Aperture mark — a single tilted vesica piscis (lens/almond). One
 * continuous filled path; no separate strokes or shapes. Reads as an
 * iris, a lens, an eye, an opening. Tilt gives it momentum.
 */
export function ApertureLogo({ className, size = 32 }: ApertureLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-label="Aperture"
      role="img"
      className={cn(className)}
    >
      <g transform="rotate(-22 50 50)">
        <path d="M 10 50 Q 50 18, 90 50 Q 50 82, 10 50 Z" />
      </g>
    </svg>
  );
}
