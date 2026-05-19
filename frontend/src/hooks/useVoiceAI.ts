/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Global voice-AI hook for the floating VoiceOrb.
 *
 * Design notes — these are the bugs the previous version had, and how this
 * one prevents them:
 *
 *  1. "TTS keeps speaking after I close the assistant"
 *     Cause: speechSynthesis is a global queue. Closing the modal didn't
 *     drain it. Fixed: we share ONE cancelAI() (lib/voiceSynth) and call it
 *     on stop AND on unmount, even if the consumer forgot.
 *
 *  2. "Sometimes the mic doesn't start when I tap it"
 *     Cause: SpeechRecognition.start() throws if an instance is already
 *     starting. The previous code created a fresh instance per start but
 *     also auto-restarted on onend, so racing taps overlapped. Fixed: we
 *     keep at most ONE recognition instance and gate start/stop on a
 *     `wantListenRef`; tapping stop is immediate and idempotent.
 *
 *  3. Continuous-listen restart loop after closing the modal
 *     Cause: onend re-started recognition while modal was unmounting.
 *     Fixed: wantListenRef flips to false BEFORE we call recognition.stop(),
 *     so onend exits without restarting. We also abort() on unmount.
 *
 *  4. Stale closures over `aiSpeaking` blocked listen-first
 *     Fixed: an `aiSpeakingRef` mirrors state so amplitude polling can
 *     read the current value without re-subscribing.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { aiApi } from '../api/ai'
import { clickByLabel, emitVoiceAction, type VoiceAction } from '../lib/voiceActionBus'
import { cancelAI, setGlobalSpeakHandlers, speakAI } from '../lib/voiceSynth'

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export interface ActionLogEntry {
  id: string
  type: string
  summary: string
  ok: boolean
  at: number
}

interface UseVoiceAIReturn {
  isListening: boolean
  isProcessing: boolean
  transcript: string
  interim: string
  response: string
  aiSpeaking: boolean
  amplitude: number
  currentAction: VoiceAction | null
  /** What the assistant most recently did (for the validation UI). */
  actionLog: ActionLogEntry[]
  /** Current pathname (also handy for the validation UI). */
  currentPath: string
  startListening: () => Promise<void>
  stopListening: () => void
  speak: (text: string) => void
  clearAction: () => void
}

export function useVoiceAI(): UseVoiceAIReturn {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [response, setResponse] = useState('')
  const [currentAction, setCurrentAction] = useState<VoiceAction | null>(null)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [amplitude, setAmplitude] = useState(0)
  const [actionLog, setActionLog] = useState<ActionLogEntry[]>([])

  const recognitionRef = useRef<any>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const wantListenRef = useRef(false)
  const aiSpeakingRef = useRef(false)
  const startingRef = useRef(false)
  const chatHistoryRef = useRef<{role: 'user' | 'assistant', content: string}[]>([])

  const navigate = useNavigate()
  const location = useLocation()
  const currentPath = location.pathname

  useEffect(() => { aiSpeakingRef.current = aiSpeaking }, [aiSpeaking])

  /* Register global speak handlers so any other surface that calls speakAI
   * still updates this hook's `aiSpeaking`. Unregister on unmount. */
  useEffect(() => {
    setGlobalSpeakHandlers(
      () => setAiSpeaking(true),
      () => setAiSpeaking(false),
    )
    return () => setGlobalSpeakHandlers(null, null)
  }, [])

  const clearAction = useCallback(() => setCurrentAction(null), [])

  const pushAction = useCallback((entry: Omit<ActionLogEntry, 'id' | 'at'>) => {
    setActionLog((prev) => {
      const next: ActionLogEntry = { ...entry, id: crypto.randomUUID(), at: Date.now() }
      return [next, ...prev].slice(0, 6)
    })
  }, [])

  const speak = useCallback((text: string) => {
    void speakAI(text)
  }, [])

  /* ── Action dispatch ──────────────────────────────────────────────── */
  const dispatchAction = useCallback(
    (action: VoiceAction) => {
      setCurrentAction(action)
      switch (action.type) {
        case 'navigate': {
          if (typeof action.payload === 'string') {
            navigate(action.payload)
            pushAction({ type: 'navigate', summary: `Opened ${action.payload}`, ok: true })
          }
          break
        }
        case 'search': {
          if (typeof action.payload === 'string') {
            navigate(`/search?q=${encodeURIComponent(action.payload)}`)
            pushAction({ type: 'search', summary: `Searched “${action.payload}”`, ok: true })
          }
          break
        }
        case 'click': {
          if (typeof action.payload === 'string') {
            const ok = clickByLabel(action.payload)
            pushAction({
              type: 'click',
              summary: ok ? `Pressed “${action.payload}”` : `Couldn't find a “${action.payload}” button`,
              ok,
            })
            if (!ok) {
              speak(`I couldn't find a ${action.payload} button on this page.`)
            }
          }
          break
        }
        default:
          // log_rep / switch_exercise / start_timer / rep_counter_start — broadcast.
          emitVoiceAction(action)
          {
            const p = (action as any).payload
            let summary = action.type.replace(/_/g, ' ')
            if (action.type === 'log_rep' && p) {
              summary = `Logged ${p.reps ?? '?'} × ${p.weight ?? '?'}kg${p.exercise ? ` of ${p.exercise}` : ''}`
            } else if (action.type === 'switch_exercise') {
              summary = `Switched to ${p}`
            } else if (action.type === 'start_timer') {
              summary = `Started ${p}s timer`
            } else if (action.type === 'ai_chat_send' && typeof p === 'string') {
              summary = `Asked AI trainer: "${p.slice(0, 40)}${p.length > 40 ? '…' : ''}"`
            }
            pushAction({ type: action.type, summary, ok: true })
          }
          break
      }
    },
    [navigate, pushAction, speak],
  )

  /* ── Process a finalised user utterance ───────────────────────────── */
  const processVoiceCommand = useCallback(
    async (text: string) => {
      setIsProcessing(true)
      try {
        const currentHistory = chatHistoryRef.current

        const result = await aiApi.sendVoiceMessage({
          transcript: text,
          context: window.location.pathname,
          history: currentHistory
        })
        setResponse(result.response)

        chatHistoryRef.current = [
            ...currentHistory,
            { role: 'user', content: text },
            { role: 'assistant', content: result.response }
        ]

        if (result.action) {
          dispatchAction(result.action as VoiceAction)
        }
        if (result.response) speak(result.response)
      } catch {
        const fallback = "Sorry, I couldn't process that. Could you try again?"
        setResponse(fallback)
        speak(fallback)
      } finally {
        setIsProcessing(false)
      }
    },
    [dispatchAction, speak],
  )

  /* ── Amplitude tracking (also drives listen-first) ────────────────── */
  const startAmplitude = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const Ctx = window.AudioContext || (window as any).webkitAudioContext
      audioCtxRef.current = new Ctx()
      analyserRef.current = audioCtxRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream)
      sourceRef.current.connect(analyserRef.current)
      const data = new Uint8Array(analyserRef.current.frequencyBinCount)
      const loop = () => {
        analyserRef.current?.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const n = avg / 128
        setAmplitude(n)
        // Listen-first: cut TTS if the user starts talking.
        if (n > 0.55 && aiSpeakingRef.current) {
          cancelAI()
        }
        rafRef.current = requestAnimationFrame(loop)
      }
      rafRef.current = requestAnimationFrame(loop)
      return true
    } catch (err: any) {
      // Bubble up permission failures so the caller can show a UI.
      const message = err?.name === 'NotAllowedError'
        ? 'I need microphone permission to listen.'
        : 'Couldn\'t access the microphone.'
      setResponse(message)
      speak(message)
      return false
    }
  }, [speak])

  const stopAmplitude = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    try { sourceRef.current?.disconnect() } catch { /* ignore */ }
    sourceRef.current = null
    try { audioCtxRef.current?.close() } catch { /* ignore */ }
    audioCtxRef.current = null
    streamRef.current?.getTracks().forEach((t) => {
      try { t.stop() } catch { /* ignore */ }
    })
    streamRef.current = null
    setAmplitude(0)
  }, [])

  /* ── Recognition lifecycle ────────────────────────────────────────── */
  const teardownRecognition = useCallback(() => {
    const rec = recognitionRef.current
    if (!rec) return
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    rec.onstart = null
    try { rec.abort() } catch { /* ignore */ }
    recognitionRef.current = null
  }, [])

  const startListening = useCallback(async () => {
    if (startingRef.current) return
    if (wantListenRef.current && recognitionRef.current) return
    startingRef.current = true

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      const msg = 'Speech recognition is not supported in this browser.'
      setResponse(msg)
      speak(msg)
      startingRef.current = false
      return
    }

    wantListenRef.current = true
    const got = await startAmplitude()
    if (!got) {
      wantListenRef.current = false
      startingRef.current = false
      return
    }

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => {
      setIsListening(true)
      setInterim('')
    }
    rec.onresult = (event: any) => {
      let interimText = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      if (interimText) setInterim(interimText)
      if (finalText.trim()) {
        const trimmed = finalText.trim()
        setTranscript(trimmed)
        setInterim('')
        cancelAI() // user is taking the floor
        void processVoiceCommand(trimmed)
      }
    }
    rec.onerror = (e: any) => {
      const err = e?.error
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        const msg = 'Microphone permission is blocked. Please allow it in your browser.'
        setResponse(msg)
        speak(msg)
        wantListenRef.current = false
        setIsListening(false)
        return
      }
      // network/no-speech/aborted — let onend handle restart.
    }
    rec.onend = () => {
      setIsListening(false)
      // Only auto-restart if the user still wants to listen AND we still own
      // the recognition instance (i.e. we weren't torn down).
      if (wantListenRef.current && recognitionRef.current === rec) {
        try { rec.start() } catch { /* already starting */ }
      }
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      // Some browsers throw "already started"; retry once after a tick.
      window.setTimeout(() => {
        if (wantListenRef.current && recognitionRef.current === rec) {
          try { rec.start() } catch { /* give up */ }
        }
      }, 50)
    }
    startingRef.current = false
  }, [processVoiceCommand, speak, startAmplitude])

  const stopListening = useCallback(() => {
    // Flip want-flag FIRST so the onend handler exits without restarting.
    wantListenRef.current = false
    cancelAI()
    teardownRecognition()
    stopAmplitude()
    setIsListening(false)
    setInterim('')
  }, [stopAmplitude, teardownRecognition])

  /* ── Cleanup on unmount ───────────────────────────────────────────── */
  useEffect(() => {
    return () => {
      wantListenRef.current = false
      cancelAI()
      teardownRecognition()
      stopAmplitude()
    }
  }, [stopAmplitude, teardownRecognition])

  return {
    isListening,
    isProcessing,
    transcript,
    interim,
    response,
    aiSpeaking,
    amplitude,
    currentAction,
    actionLog,
    currentPath,
    startListening,
    stopListening,
    speak,
    clearAction,
  }
}
