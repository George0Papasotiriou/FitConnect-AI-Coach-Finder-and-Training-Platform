/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadAvatar } from '../middleware/upload.js';
import db from '../db.js';

const router = Router();

router.post('/avatar', authenticate, uploadAvatar.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    await db.run('UPDATE users SET avatar = ? WHERE id = ?', avatarUrl, req.user!.id);
    
    res.json({ 
      message: 'Avatar updated successfully',
      avatar: avatarUrl
    });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ message: 'Server error during upload' });
  }
});

export default router;
