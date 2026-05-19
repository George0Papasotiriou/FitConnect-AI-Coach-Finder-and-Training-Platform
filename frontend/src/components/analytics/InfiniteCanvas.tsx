/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Endless pan-and-zoom canvas. Children render in canvas-space (their own
 * left/top coordinates); this component applies a single transform to the
 * inner layer to pan and zoom everything as a group.
 *
 * Controls:
 *   - Click-and-drag on empty canvas to pan.
 *   - Ctrl/Cmd + mouse wheel to zoom (anchored at the cursor).
 *   - Programmatic zoomIn/zoomOut/zoomReset (via ref).
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

const ZOOM_MIN = 0.3
const ZOOM_MAX = 2.2

function clampZoom(z: number) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z))
}

export interface CanvasViewport {
  pan: { x: number; y: number }
  scale: number
}

export interface InfiniteCanvasHandle {
  zoomIn: () => void
  zoomOut: () => void
  zoomReset: () => void
  getViewport: () => CanvasViewport
  setViewport: (v: CanvasViewport) => void
}

interface Props {
  children: ReactNode
  initial?: CanvasViewport
  onChange?: (v: CanvasViewport) => void
  style?: CSSProperties
  /** Test id for the empty area; click-drag here pans the canvas. */
  className?: string
}

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, Props>(function InfiniteCanvas(
  { children, initial, onChange, className, style },
  ref,
) {
  const [pan, setPan] = useState(initial?.pan ?? { x: 0, y: 0 })
  const [scale, setScale] = useState(initial?.scale ?? 1)
  const panRef = useRef(pan)
  const scaleRef = useRef(scale)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)

  useEffect(() => { panRef.current = pan }, [pan])
  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => {
    onChange?.({ pan, scale })
  }, [pan, scale, onChange])

  const setViewport = useCallback((v: CanvasViewport) => {
    setPan(v.pan)
    setScale(clampZoom(v.scale))
  }, [])

  useImperativeHandle(ref, () => ({
    zoomIn: () => setScale((s) => clampZoom(s + 0.1)),
    zoomOut: () => setScale((s) => clampZoom(s - 0.1)),
    zoomReset: () => {
      setScale(1)
      setPan({ x: 0, y: 0 })
    },
    getViewport: () => ({ pan: panRef.current, scale: scaleRef.current }),
    setViewport,
  }))

  // Ctrl/Cmd + wheel = zoom anchored at the cursor.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      // Convert cursor → canvas-space before zoom
      const worldX = (cx - panRef.current.x) / scaleRef.current
      const worldY = (cy - panRef.current.y) / scaleRef.current
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const nextScale = clampZoom(scaleRef.current + delta * (scaleRef.current >= 1 ? 1 : 0.6))
      // Re-anchor pan so the same world point stays under the cursor
      const nextPanX = cx - worldX * nextScale
      const nextPanY = cy - worldY * nextScale
      setScale(nextScale)
      setPan({ x: nextPanX, y: nextPanY })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Pan with click-drag on empty space (mousedown originating on the wrapper
  // itself, not on a child).
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only pan if the user grabbed the canvas background, not a chart card.
    if (e.target !== e.currentTarget) return
    if (e.button !== 0 && e.button !== 1) return
    isPanningRef.current = true
    panStartRef.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y }
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isPanningRef.current || !panStartRef.current) return
      const dx = e.clientX - panStartRef.current.mx
      const dy = e.clientY - panStartRef.current.my
      setPan({ x: panStartRef.current.px + dx, y: panStartRef.current.py + dy })
    }
    const onUp = () => {
      isPanningRef.current = false
      panStartRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      onMouseDown={handleMouseDown}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        cursor: isPanningRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
})
