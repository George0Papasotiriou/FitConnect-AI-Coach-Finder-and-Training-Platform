import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { aiApi } from '../api/ai'

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type SpeechRecognition = any;

interface UseVoiceAIReturn {
  isListening: boolean
  isProcessing: boolean
  transcript: string
  response: string
  amplitude: number
  currentAction: { type: string; payload?: any } | null
  startListening: () => void
  stopListening: () => void
  speak: (text: string) => void
  clearAction: () => void
}

export function useVoiceAI(): UseVoiceAIReturn {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [currentAction, setCurrentAction] = useState<{ type: string; payload?: any } | null>(null)
  const [amplitude, setAmplitude] = useState(0)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const navigate = useNavigate()

  const clearAction = useCallback(() => setCurrentAction(null), [])

  const processVoiceCommand = useCallback(async (text: string) => {
    setIsProcessing(true)
    try {
      const result = await aiApi.sendVoiceMessage({ transcript: text })
      setResponse(result.response)

      if (result.action) {
        setCurrentAction(result.action)
        switch (result.action.type) {
          case 'navigate':
            if (result.action.payload) navigate(result.action.payload)
            break
          case 'search':
            navigate(`/search?q=${encodeURIComponent(result.action.payload || '')}`)
            break
          case 'rep_counter_start':
            // This will be handled by components listening to the voice AI state
            break
        }
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(result.response)
        utterance.rate = 1.0
        utterance.pitch = 1.0
        window.speechSynthesis.speak(utterance)
      }
    } catch {
      setResponse('Sorry, I could not process your request.')
    } finally {
      setIsProcessing(false)
    }
  }, [navigate])

  const startAmplitudeTracking = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      analyserRef.current.fftSize = 256
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream)
      sourceRef.current.connect(analyserRef.current)

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      const updateAmplitude = () => {
        analyserRef.current?.getByteFrequencyData(dataArray)
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        setAmplitude(avg / 128)
        animFrameRef.current = requestAnimationFrame(updateAmplitude)
      }
      animFrameRef.current = requestAnimationFrame(updateAmplitude)
    } catch {}
  }, [])

  const stopAmplitudeTracking = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    sourceRef.current?.disconnect()
    audioContextRef.current?.close()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setAmplitude(0)
  }, [])

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition
      || (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setResponse('Speech recognition is not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
      setResponse('')
      startAmplitudeTracking()
    }

    recognition.onresult = (event: any) => {
      const current = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join('')
      setTranscript(current)
    }

    recognition.onend = () => {
      setIsListening(false)
      stopAmplitudeTracking()
      if (transcript) processVoiceCommand(transcript)
    }

    recognition.onerror = (event: any) => {
      setIsListening(false)
      stopAmplitudeTracking()
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [transcript, startAmplitudeTracking, stopAmplitudeTracking, processVoiceCommand])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    stopAmplitudeTracking()
  }, [stopAmplitudeTracking])

  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      window.speechSynthesis.speak(utterance)
    }
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      stopAmplitudeTracking()
    }
  }, [stopAmplitudeTracking])

  return { isListening, isProcessing, transcript, response, amplitude, currentAction, startListening, stopListening, speak, clearAction }
}
