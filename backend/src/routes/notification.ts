/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const notifications = await db.all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50', req.user!.id);
    res.json(notifications.map(n => ({ ...n, read: !!n.read, metadata: JSON.parse(n.metadata || '{}') })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    await db.run('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/read-all', authenticate, async (req: AuthRequest, res) => {
  try {
    await db.run('UPDATE notifications SET read = 1 WHERE user_id = ?', req.user!.id);
    res.json({ message: 'All marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    await db.run('DELETE FROM notifications WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/push-subscribe', authenticate, async (req: AuthRequest, res) => {
  try {
    const { subscription } = req.body;
    await db.run(
      'INSERT INTO push_subscriptions (id, user_id, subscription) VALUES (?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET subscription = EXCLUDED.subscription',
      uuid(), req.user!.id, JSON.stringify(subscription)
    );
    res.json({ message: 'Subscribed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
