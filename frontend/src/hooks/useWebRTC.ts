import { useRef, useState, useCallback, useEffect } from 'react'
import SimplePeer from 'simple-peer'
import { useSocket } from './useSocket'
import { toast } from 'sonner'

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
  const signalQueueRef = useRef<SimplePeer.SignalData[]>([])
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isInitiatorRef = useRef(isInitiator)
  const sessionIdRef = useRef(sessionId)

  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [callDuration, setCallDuration] = useState(0)

  const { emit, on } = useSocket()

  // Keep refs in sync
  isInitiatorRef.current = isInitiator
  sessionIdRef.current = sessionId

  const createPeer = useCallback((initiator: boolean, stream?: MediaStream) => {
    if (peerRef.current) {
      console.log('⚠️ Peer already exists, skipping creation')
      return peerRef.current
    }

    console.log('🏗️ Creating SimplePeer. initiator:', initiator, 'hasStream:', !!stream)

    const peer = new SimplePeer({
      initiator,
      stream: stream || undefined,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ]
      }
    })

    peer.on('signal', (data) => {
      console.log('📤 Sending Signal:', data.type || 'candidate')
      emit('webrtc_signal', { sessionId: sessionIdRef.current, signal: data })
    })

    peer.on('connect', () => {
      console.log('✅ Peer connection ESTABLISHED!')
      setIsConnected(true)
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((d) => d + 1)
      }, 1000)
    })

    peer.on('stream', (remoteStream) => {
      console.log('📺 Got remote stream')
      remoteStreamRef.current = remoteStream
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
      // Also mark connected when we get a stream (belt and suspenders)
      setIsConnected(true)
      if (!durationIntervalRef.current) {
        durationIntervalRef.current = setInterval(() => {
          setCallDuration((d) => d + 1)
        }, 1000)
      }
    })

    peer.on('close', () => {
      console.log('📴 Peer connection closed')
      setIsConnected(false)
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      onCallEnded?.()
    })

    peer.on('error', (err) => {
      console.error('❌ Peer error:', err.message)
    })

    peerRef.current = peer

    // Flush any signals that arrived before the peer was created
    console.log(`📦 Flushing ${signalQueueRef.current.length} queued signals`)
    while (signalQueueRef.current.length > 0) {
      const sig = signalQueueRef.current.shift()
      if (sig) {
        try {
          peer.signal(sig)
        } catch (e) {
          console.error('Error applying queued signal:', e)
        }
      }
    }

    return peer
  }, [emit, onCallEnded])

  const startCall = useCallback(async () => {
    console.log('📞 startCall() called. isInitiator:', isInitiatorRef.current, 'sessionId:', sessionIdRef.current)

    // 1. Join the session room FIRST — before anything else
    //    This ensures we are in the room to receive peer_joined/peer_ready events
    //    while the other user might still be getting their camera
    emit('join_session', sessionIdRef.current)
    console.log('🔌 Joined session room:', sessionIdRef.current)

    // 2. Get media (best-effort, non-blocking for connection)
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = stream
      if (localVideoRef.current) localVideoRef.current.srcObject = stream
    } catch (err) {
      console.warn('Video+Audio failed, trying audio-only:', err)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        localStreamRef.current = stream
        setIsCameraOff(true)
        toast.info('Joining with Audio Only (Camera may be in use)')
      } catch (fallbackErr) {
        console.warn('All media access failed, joining without media:', fallbackErr)
        toast.warning('Joining without camera or microphone')
      }
    }

    // 3. If a peer was already created by event handlers during getUserMedia, add our stream
    if (stream && peerRef.current) {
      console.log('🎥 Adding late stream to existing peer')
      try {
        peerRef.current.addStream(stream)
      } catch (e) {
        console.warn('Could not add stream to existing peer:', e)
      }
    }

    // 4. Create peer and signal readiness
    if (!isInitiatorRef.current) {
      if (!peerRef.current) {
        // Receiver: create non-initiator peer and tell initiator we're ready
        console.log('📱 Receiver: creating non-initiator peer now')
        createPeer(false, stream || undefined)
      }
      emit('peer_ready', { sessionId: sessionIdRef.current })
    } else {
      // Initiator: If the receiver already joined (peer_joined was fired while we
      // were getting media), peerRef.current might already be set by the event handler.
      // If not, we wait — the peer_joined / peer_ready handler will create it.
      if (!peerRef.current) {
        console.log('🕐 Initiator: waiting for receiver to join...')
      }
    }
  }, [emit, createPeer])

  const endCall = useCallback(() => {
    peerRef.current?.destroy()
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
    emit('call_ended', { sessionId: sessionIdRef.current })
    setIsConnected(false)
    onCallEnded?.()
  }, [emit, onCallEnded])

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
<<<<<<< HEAD
      const audioTracks = localStreamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        const newState = !audioTracks[0].enabled
        audioTracks.forEach(t => t.enabled = newState)
        setIsMuted(!newState)
=======
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
      }
    }
  }, [])

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
<<<<<<< HEAD
      const videoTracks = localStreamRef.current.getVideoTracks()
      if (videoTracks.length > 0) {
        const newState = !videoTracks[0].enabled
        videoTracks.forEach(t => t.enabled = newState)
        setIsCameraOff(!newState)
=======
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsCameraOff(!videoTrack.enabled)
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
      }
    }
  }, [])

  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
        const screenTrack = screenStream.getVideoTracks()[0]
        const sender = peerRef.current
<<<<<<< HEAD
        const localStream = localStreamRef.current
        if (sender && localStream) {
          const videoTrack = localStream.getVideoTracks()[0]
          if (videoTrack) {
            sender.replaceTrack(videoTrack, screenTrack, localStream)
            videoTrack.enabled = false
          }
=======
        if (sender && localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0]
          if (videoTrack) videoTrack.enabled = false
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
          if (localVideoRef.current) localVideoRef.current.srcObject = screenStream
          setIsScreenSharing(true)
          screenTrack.onended = () => {
            setIsScreenSharing(false)
<<<<<<< HEAD
            if (localVideoRef.current) localVideoRef.current.srcObject = localStream
            if (videoTrack) {
              sender.replaceTrack(screenTrack, videoTrack, localStream)
              videoTrack.enabled = true
            }
=======
            if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
            if (videoTrack) videoTrack.enabled = true
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
          }
        }
      } catch (err) {
        console.error('Screen share error:', err)
      }
    } else {
      setIsScreenSharing(false)
<<<<<<< HEAD
      if (localVideoRef.current?.srcObject instanceof MediaStream) {
        const srcStream = localVideoRef.current.srcObject
        const screenTrack = srcStream.getVideoTracks()[0]
        if (screenTrack) {
          screenTrack.stop()
          if (screenTrack.onended) screenTrack.onended(new Event('ended'))
        }
      }
=======
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current
    }
  }, [isScreenSharing])

  // Socket event listeners - using refs to avoid stale closure issues
  useEffect(() => {
    console.log('🔧 Setting up socket listeners for session:', sessionId)

    const removeSignal = on('webrtc_signal', (data: any) => {
      console.log('📥 Received Signal:', data.signal?.type || 'candidate')
      if (peerRef.current) {
        try {
          peerRef.current.signal(data.signal)
        } catch (e) {
          console.error('Error applying signal:', e)
        }
      } else {
        console.log('📦 Queuing signal (peer not ready yet)')
        signalQueueRef.current.push(data.signal)
      }
    })

    const removePeerJoined = on('peer_joined', () => {
      console.log('🤝 peer_joined event received. isInitiator:', isInitiatorRef.current)
      // When we are the initiator and the other peer has joined, create our initiator peer
      if (isInitiatorRef.current && !peerRef.current) {
        console.log('🚀 Initiator: creating initiator peer now')
        createPeer(true, localStreamRef.current || undefined)
      }
    })

    const removePeerReady = on('peer_ready', () => {
      console.log('✅ peer_ready event received. isInitiator:', isInitiatorRef.current)
      // Backup trigger: if peer_joined didn't create the peer, peer_ready will
      if (isInitiatorRef.current && !peerRef.current) {
        console.log('🚀 Initiator: creating initiator peer (from peer_ready)')
        createPeer(true, localStreamRef.current || undefined)
      }
    })

    const removeEnded = on('call_ended', () => {
      console.log('📴 call_ended event received')
      peerRef.current?.destroy()
      peerRef.current = null
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      setIsConnected(false)
      onCallEnded?.()
    })

    const removeDeclined = on('call_declined', () => {
      console.log('❌ call_declined event received')
      peerRef.current?.destroy()
      peerRef.current = null
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current)
      setIsConnected(false)
      onCallEnded?.()
      toast.error('The other user declined your call.')
    })

    return () => {
      removeSignal()
      removePeerJoined()
      removePeerReady()
      removeEnded()
      removeDeclined()
    }
  }, [on, sessionId, createPeer, onCallEnded])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      peerRef.current?.destroy()
      peerRef.current = null
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
