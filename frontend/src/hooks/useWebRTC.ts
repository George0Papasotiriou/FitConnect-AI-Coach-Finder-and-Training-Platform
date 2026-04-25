import { useRef, useState, useCallback, useEffect } from 'react'
import SimplePeer from 'simple-peer'
import { useSocket } from './useSocket'

interface UseWebRTCProps {
  sessionId: string
  isInitiator: boolean
  onCallEnded?: () => void
}

export function useWebRTC({ sessionId, isInitiator, onCallEnded }: UseWebRTCProps) {
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)

  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const { emit, on, off } = useSocket()
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
      return stream
    } catch (err) {
      console.error('Error accessing media devices:', err)
      throw err
    }
  }, [])

  const createPeer = useCallback((stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: isInitiator,
      stream,
      trickle: false
    })

    peer.on('signal', (data) => {
      if (isInitiator) {
        emit('webrtc_offer', { sessionId, signal: data })
      } else {
        emit('webrtc_answer', { sessionId, signal: data })
      }
    })

    peer.on('stream', (remoteStream) => {
      remoteStreamRef.current = remoteStream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
      setIsConnected(true)
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((d) => d + 1)
      }, 1000)
    })

    peer.on('close', () => {
      setIsConnected(false)
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      onCallEnded?.()
    })

    peer.on('error', (err) => {
      console.error('Peer error:', err)
    })

    peerRef.current = peer
    return peer
  }, [isInitiator, sessionId, emit, onCallEnded])

  const startCall = useCallback(async () => {
    const stream = await startLocalStream()
    createPeer(stream)
  }, [startLocalStream, createPeer])

  const endCall = useCallback(() => {
    peerRef.current?.destroy()
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    emit('call_ended', { sessionId })
    setIsConnected(false)
    onCallEnded?.()
  }, [emit, sessionId, onCallEnded])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }, [])

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCameraOff(!videoTrack.enabled)
      }
    }
  }, [])

  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        const sender = peerRef.current
        if (sender && localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0]
          if (videoTrack) videoTrack.enabled = false
          if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
          setIsScreenSharing(true)
          screenTrack.onended = () => {
            setIsScreenSharing(false)
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
            if (videoTrack) videoTrack.enabled = true
          }
        }
      } catch (err) {
        console.error('Screen share error:', err)
      }
    } else {
      setIsScreenSharing(false)
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [isScreenSharing])

  useEffect(() => {
    const removeOffer = on('webrtc_offer', (data: unknown) => {
      const { signal } = data as { signal: SimplePeer.SignalData }
      peerRef.current?.signal(signal)
    })

    const removeAnswer = on('webrtc_answer', (data: unknown) => {
      const { signal } = data as { signal: SimplePeer.SignalData }
      peerRef.current?.signal(signal)
    })

    const removeIce = on('webrtc_ice_candidate', (data: unknown) => {
      const { signal } = data as { signal: SimplePeer.SignalData }
      peerRef.current?.signal(signal)
    })

    const removeEnded = on('call_ended', () => {
      endCall()
    })

    return () => {
      removeOffer()
      removeAnswer()
      removeIce()
      removeEnded()
    }
  }, [on, endCall])

  useEffect(() => {
    return () => {
      peerRef.current?.destroy()
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    }
  }, [])

  return {
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isConnected,
    callDuration,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare
  }
}
