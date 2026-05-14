/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="bg-bg-card-hover border border-border-color px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 bg-text-secondary rounded-full block"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  )
}
