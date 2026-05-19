/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Lightweight voice hook tailored for the AI Analytics canvas:
 *  - continuous listening with interim results so subtitles update live
 *  - listen-first: speakAI() is interrupted as soon as the user starts speaking
 *  - emits each finalised utterance to a caller-supplied onUtterance handler
 *  - smart command detection: recognises canvas commands like "clear", "reset",
 *    "zoom in/out", "export", "new conversation" before hitting the API
 *  - greets the user on start so they know the assistant is ready
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { cancelAI, speakAI } from '../lib/voiceSynth'

interface UseAnalyticsVoiceOptions {
  onUtterance: (text: string) => void | Promise<void>
  onCanvasCommand?: (cmd: CanvasVoiceCommand) => void
}

export type CanvasVoiceCommand =
  | { type: 'clear_canvas' }
  | { type: 'new_conversation' }
  | { type: 'zoom_in' }
  | { type: 'zoom_out' }
  | { type: 'zoom_reset' }
  | { type: 'export_pdf' }
  | { type: 'generate_briefing' }

interface UseAnalyticsVoiceReturn {
  active: boolean
  listening: boolean
  aiSpeaking: boolean
  userInterim: string
  userFinal: string
  aiCaption: string
  amplitude: number
  start: () => Promise<void>
  stop: () => void
  speakAI: (text: string) => void
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export function useAnalyticsVoice({ onUtterance, onCanvasCommand }: UseAnalyticsVoiceOptions): UseAnalyticsVoiceReturn {
  const [active, setActive] = useState(false)
  const [listening, setListening] = useState(false)
  const [aiSpeaking, setAiSpeaking] = useState(false)
  const [userInterim, setUserInterim] = useState('')
  const [userFinal, setUserFinal] = useState('')
  const [aiCaption, setAiCaption] = useState('')
  const [amplitude, setAmplitude] = useState(0)

  const recognitionRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const utteranceQueueRef = useRef<string[]>([])
  const onUtteranceRef = useRef(onUtterance)
  const onCanvasCommandRef = useRef(onCanvasCommand)
  const activeRef = useRef(false)
  const aiSpeakingRef = useRef(false)
  useEffect(() => { onUtteranceRef.current = onUtterance }, [onUtterance])
  useEffect(() => { onCanvasCommandRef.current = onCanvasCommand }, [onCanvasCommand])
  useEffect(() => { activeRef.current = active }, [active])
  useEffect(() => { aiSpeakingRef.current = aiSpeaking }, [aiSpeaking])

  /** Detect canvas control commands from voice input */
  const tryCanvasCommand = useCallback((text: string): boolean => {
    const lower = text.toLowerCase().trim()
    const handler = onCanvasCommandRef.current
    if (!handler) return false

    if (/\b(clear|wipe|erase)\b.*\b(canvas|charts?|everything|all|screen)\b/.test(lower) || lower === 'clear canvas') {
      handler({ type: 'clear_canvas' })
      return true
    }
    if (/\b(new|fresh|start over|reset)\b.*\b(conversation|session|chat)\b/.test(lower) || lower === 'new conversation') {
      handler({ type: 'new_conversation' })
      return true
    }
    if (/\bzoom\s*(in|closer)\b/.test(lower)) {
      handler({ type: 'zoom_in' })
      return true
    }
    if (/\bzoom\s*(out|back|away)\b/.test(lower)) {
      handler({ type: 'zoom_out' })
      return true
    }
    if (/\b(reset|normal)\s*zoom\b|\bzoom\s*(reset|100|normal)\b/.test(lower)) {
      handler({ type: 'zoom_reset' })
      return true
    }
    if (/\b(export|download|save)\b.*\b(pdf|report|charts?)\b/.test(lower)) {
      handler({ type: 'export_pdf' })
      return true
    }
    if (/\b(generate|create|make)\b.*\b(briefing|editorial|report|summary)\b/.test(lower)) {
      handler({ type: 'generate_briefing' })
      return true
    }
    return false
  }, [])

  const cancelTTS = useCallback(() => {
    cancelAI()
    setAiSpeaking(false)
  }, [])

  const speakAICb = useCallback((text: string) => {
    if (!text) return
    setAiCaption(text)
    void speakAI(text, {
      onStart: () => setAiSpeaking(true),
      onEnd: () => setAiSpeaking(false),
    })
  }, [])

  const startAmplitude = useCallback(async (stream: MediaStream) => {
    audioCtxRef.current = new AudioContext()
    analyserRef.current = audioCtxRef.current.createAnalyser()
    analyserRef.current.fftSize = 256
    sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream)
    sourceRef.current.connect(analyserRef.current)
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    const loop = () => {
      analyserRef.current?.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      const normalised = avg / 128
      setAmplitude(normalised)
      // Listen-first: if user starts speaking while AI is talking, cut TTS.
      if (normalised > 0.55 && aiSpeakingRef.current) {
        cancelTTS()
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [cancelTTS])

  const stopAmplitude = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    sourceRef.current?.disconnect()
    audioCtxRef.current?.close().catch(() => {})
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setAmplitude(0)
  }, [])

  const start = useCallback(async () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setAiCaption('Voice input is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      await startAmplitude(stream)
    } catch {
      setAiCaption('Microphone access is required for voice mode.')
      return
    }

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onstart = () => {
      setActive(true)
      activeRef.current = true
      setListening(true)
    }
    rec.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      if (interim) setUserInterim(interim)
      if (final.trim()) {
        const trimmed = final.trim()
        setUserFinal(trimmed)
        setUserInterim('')
        cancelTTS()
        // Try canvas commands first before hitting the API
        if (tryCanvasCommand(trimmed)) {
          speakAICb('Done!')
        } else {
          utteranceQueueRef.current.push(trimmed)
          void onUtteranceRef.current(trimmed)
        }
      }
    }
    rec.onerror = (e: any) => {
      // Common: "no-speech", "aborted" — quietly continue.
      if (e?.error === 'not-allowed') {
        setAiCaption('Microphone permission denied.')
        setActive(false)
        setListening(false)
      }
    }
    rec.onend = () => {
      // Continuous mode auto-restarts unless user toggled off.
      if (activeRef.current) {
        try { rec.start() } catch { /* already starting */ }
      } else {
        setListening(false)
      }
    }
    recognitionRef.current = rec
    rec.start()
    // Greet the user so they know the assistant is ready
    speakAICb('Analytics voice mode is active. Ask me anything about your data, or say commands like clear canvas, zoom in, or generate briefing.')
  }, [cancelTTS, startAmplitude, speakAICb])

  const stop = useCallback(() => {
    setActive(false)
    activeRef.current = false
    setListening(false)
    cancelTTS()
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    recognitionRef.current = null
    stopAmplitude()
    setUserInterim('')
  }, [cancelTTS, stopAmplitude])

  useEffect(() => () => {
    try { recognitionRef.current?.stop() } catch { /* ignore */ }
    stopAmplitude()
    cancelTTS()
  }, [cancelTTS, stopAmplitude])

  return {
    active,
    listening,
    aiSpeaking,
    userInterim,
    userFinal,
    aiCaption,
    amplitude,
    start,
    stop,
    speakAI: speakAICb,
  }
}
