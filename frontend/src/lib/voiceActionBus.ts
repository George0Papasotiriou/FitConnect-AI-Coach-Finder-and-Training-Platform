/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Tiny pub-sub for voice-AI actions. Pages can subscribe to actions like
 * "log_rep" / "switch_exercise" / "click" and react. Decouples the global
 * voice hook from any individual page's state shape.
 */

export type VoiceAction =
  | { type: 'navigate'; payload?: string }
  | { type: 'click'; payload?: string }
  | { type: 'log_rep'; payload?: { exercise?: string; reps?: number; weight?: number | null } }
  | { type: 'switch_exercise'; payload?: string }
  | { type: 'start_timer'; payload?: number }
  | { type: 'rep_counter_start'; payload?: string }
  | { type: 'search'; payload?: string }
  | { type: 'ai_chat_send'; payload?: string }
  | { type: string; payload?: any }

type Listener = (action: VoiceAction) => void

const listeners = new Set<Listener>()

export function emitVoiceAction(action: VoiceAction): void {
  for (const fn of listeners) {
    try {
      fn(action)
    } catch (err) {
      // never let one listener kill the bus
      console.warn('[voiceActionBus] listener error', err)
    }
  }
}

export function subscribeVoiceAction(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/**
 * Best-effort click of a button by visible text or aria-label.
 * Used by the "click" action.
 */
export function clickByLabel(label: string): boolean {
  if (!label) return false
  const needle = label.trim().toLowerCase()
  const candidates: HTMLElement[] = []
  document.querySelectorAll<HTMLElement>(
    'button, [role="button"], a[href], [data-voice-click]',
  ).forEach((el) => candidates.push(el))

  // Score candidates by best textual match
  const scored = candidates
    .map((el) => {
      const aria = el.getAttribute('aria-label')?.toLowerCase() ?? ''
      const title = el.getAttribute('title')?.toLowerCase() ?? ''
      const text = (el.innerText || el.textContent || '').toLowerCase()
      const score = aria === needle ? 100
        : title === needle ? 95
        : text.trim() === needle ? 90
        : aria.includes(needle) ? 70
        : text.includes(needle) ? 60
        : title.includes(needle) ? 50
        : 0
      return { el, score }
    })
    .filter((s) => s.score > 40)
    .sort((a, b) => b.score - a.score)

  const best = scored[0]?.el
  if (!best) return false
  best.scrollIntoView({ block: 'center', behavior: 'smooth' })
  // brief highlight so users can see what was clicked
  const prevOutline = best.style.outline
  best.style.outline = '3px solid var(--accent-purple, #a78bfa)'
  best.style.outlineOffset = '2px'
  window.setTimeout(() => { best.style.outline = prevOutline }, 600)
  best.click()
  return true
}
