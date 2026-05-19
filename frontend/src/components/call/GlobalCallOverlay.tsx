/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { useCallStore } from '../../store/callStore'
import VideoCall from './VideoCall'
import PostCallRating from './PostCallRating'
import { motion, AnimatePresence } from 'framer-motion'
import { Maximize2, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function GlobalCallOverlay() {
  const { activeCall, isMinimized, setMinimized, endCall, ratingSession, setRatingSession } = useCallStore()
  const navigate = useNavigate()
  const location = useLocation()

  if (!activeCall && !ratingSession) return null

  const isOnCallPage = activeCall ? location.pathname.startsWith('/call/') : false

  const handleEnd = () => {
    endCall()
    if (isOnCallPage) navigate(-1)
  }

  const handleRestore = () => {
    if (activeCall) {
      setMinimized(false)
      navigate(`/call/${activeCall.sessionId}`)
    }
  }

  return (
    <>
      <AnimatePresence>
        {activeCall && (
          <motion.div
            layout
            initial={false}
            animate={isMinimized ? {
              width: 320,
              height: 180,
              right: 24,
              bottom: 24,
              top: 'auto',
              left: 'auto',
              borderRadius: 24,
              scale: 1,
              opacity: 1,
            } : {
              width: '100%',
              height: '100%',
              right: 0,
              bottom: 0,
              top: 0,
              left: 0,
              borderRadius: 0,
              scale: 1,
              opacity: isOnCallPage || !isMinimized ? 1 : 0
            }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed z-[9999] overflow-hidden bg-black shadow-2xl border border-white/10"
            style={{ pointerEvents: isMinimized || !isOnCallPage ? 'auto' : 'auto' }}
          >
            <VideoCall
              {...activeCall}
              onClose={handleEnd}
              isMinimized={isMinimized}
              onMinimize={() => {
                setMinimized(true)
                navigate(-1)
              }}
            />
            
            {isMinimized && (
              <>
                <button
                  onClick={handleRestore}
                  className="absolute top-2 right-12 z-[10000] p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors"
                  title="Restore Call"
                >
                  <Maximize2 size={16} />
                </button>
                <button
                  onClick={handleEnd}
                  className="absolute top-2 right-2 z-[10000] p-2 bg-red-500/80 hover:bg-red-600 backdrop-blur-md rounded-full text-white transition-colors"
                  title="End Call"
                >
                  <X size={16} />
                </button>
                <div 
                  className="absolute inset-0 z-[9999] cursor-pointer" 
                  onClick={handleRestore}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <PostCallRating
        isOpen={!!ratingSession}
        sessionId={ratingSession?.sessionId || ''}
        trainerName={ratingSession?.trainerName || ''}
        onClose={() => setRatingSession(null)}
      />
    </>
  )
}
