/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Speech synthesis helper. Picks a soothing female English voice once and
 * exposes a single speak()/cancel() pair so the whole app shares one queue.
 *
 * Why this exists:
 *   - `speechSynthesis.getVoices()` is async on Chrome (returns empty on first
 *     call; we wait for `voiceschanged`).
 *   - Several browsers ignore `cancel()` if you immediately call `speak()`
 *     in the same tick; we serialise via a short macrotask.
 *   - We want ONE place that knows "the AI's voice" so closing a modal kills
 *     every utterance, no matter who started it.
 */

const FEMALE_HINTS = [
  // Premium / cloud voices on most browsers
  'samantha', 'serena', 'allison', 'ava', 'susan', 'karen', 'fiona', 'moira',
  'tessa', 'veena', 'kate', 'kathy', 'victoria', 'zira',
  // Google
  'google uk english female', 'google us english',
  // Microsoft
  'microsoft aria', 'microsoft jenny', 'microsoft michelle', 'microsoft zira',
]

const PREFERRED_LOCALES = ['en-GB', 'en-US', 'en-AU', 'en-IE', 'en-CA']

let cached: SpeechSynthesisVoice | null = null
let voicesReadyPromise: Promise<void> | null = null
let onSpeakStartCb: (() => void) | null = null
let onSpeakEndCb: (() => void) | null = null

function isFemaleVoice(v: SpeechSynthesisVoice): boolean {
  const n = v.name.toLowerCase()
  if (FEMALE_HINTS.some((h) => n.includes(h))) return true
  // Many Microsoft voices include "Female" in the name on Windows.
  if (n.includes('female')) return true
  return false
}

function scoreVoice(v: SpeechSynthesisVoice): number {
  let score = 0
  const n = v.name.toLowerCase()
  if (n.includes('google us english') || n.includes('microsoft aria') || n.includes('microsoft jenny')) score += 500
  else if (isFemaleVoice(v)) score += 100
  
  const localeIdx = PREFERRED_LOCALES.indexOf(v.lang)
  if (localeIdx >= 0) score += 60 - localeIdx * 10
  if (v.lang?.startsWith('en')) score += 20
  if (v.localService) score += 5
  return score
}

function readyVoices(): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve()
  if (voicesReadyPromise) return voicesReadyPromise
  voicesReadyPromise = new Promise<void>((resolve) => {
    const tryNow = () => {
      const list = window.speechSynthesis.getVoices()
      if (list.length > 0) {
        resolve()
        return true
      }
      return false
    }
    if (tryNow()) return
    const onVoices = () => {
      if (tryNow()) {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    // Safety fallback — some browsers never fire the event.
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      resolve()
    }, 1500)
  })
  return voicesReadyPromise
}

async function pickVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cached) return cached
  await readyVoices()
  const list = window.speechSynthesis.getVoices()
  if (!list.length) return null
  const ranked = [...list].sort((a, b) => scoreVoice(b) - scoreVoice(a))
  cached = ranked[0] ?? null
  return cached
}

/** Reset the voice cache. Call after the user changes preferred voice. */
export function resetVoiceCache(): void {
  cached = null
}

export interface SpeakOptions {
  rate?: number
  pitch?: number
  /** Called when synthesis actually starts. */
  onStart?: () => void
  /** Called when synthesis ends (or is cancelled). */
  onEnd?: () => void
}

/**
 * Global "AI is speaking" callbacks — useful for things like a tab-wide pulse
 * animation that needs to react regardless of which surface initiated speech.
 */
export function setGlobalSpeakHandlers(
  onStart: (() => void) | null,
  onEnd: (() => void) | null,
): void {
  onSpeakStartCb = onStart
  onSpeakEndCb = onEnd
}

export async function speakAI(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const trimmed = text?.trim()
  if (!trimmed) return

  // Cancel everything in flight FIRST so we never overlap with a previous turn.
  cancelAI()

  const voice = await pickVoice()
  if (!voice) {
    // Synthesise without a voice — browser picks default.
  }

  // Tiny wait so cancel() actually drains the queue. Chrome occasionally
  // ignores rapid cancel→speak pairs in the same tick.
  await new Promise<void>((r) => window.setTimeout(r, 30))

  const u = new SpeechSynthesisUtterance(trimmed)
  if (voice) u.voice = voice
  u.lang = voice?.lang ?? 'en-US'
  u.rate = opts.rate ?? 1.0
  u.pitch = opts.pitch ?? 1.0
  u.volume = 1

  u.onstart = () => {
    onSpeakStartCb?.()
    opts.onStart?.()
  }
  u.onend = () => {
    onSpeakEndCb?.()
    opts.onEnd?.()
  }
  u.onerror = () => {
    onSpeakEndCb?.()
    opts.onEnd?.()
  }

  window.speechSynthesis.speak(u)
}

export function cancelAI(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
  } catch {
    // ignore — some browsers throw if there's nothing to cancel
  }
}
