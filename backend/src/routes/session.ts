/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { awardXP, checkAchievements, createNotification } from '../services/gamification.js';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await db.all(`
      SELECT s.*,
        t.name as trainer_name, t.avatar as trainer_avatar,
        e.name as trainee_name, e.avatar as trainee_avatar
      FROM sessions s
      JOIN users t ON s.trainer_id = t.id
      JOIN users e ON s.trainee_id = e.id
      WHERE s.trainer_id = ? OR s.trainee_id = ?
      ORDER BY s.scheduled_at DESC
    `, req.user!.id, req.user!.id);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const session = await db.get(`
      SELECT s.*,
        t.name as trainer_name, t.avatar as trainer_avatar,
        e.name as trainee_name, e.avatar as trainee_avatar
      FROM sessions s
      JOIN users t ON s.trainer_id = t.id
      JOIN users e ON s.trainee_id = e.id
      WHERE s.id = ?
    `, req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { trainerId, traineeId, type, scheduledAt, notes } = req.body;
    const id = uuid();
    await db.run('INSERT INTO sessions (id, trainer_id, trainee_id, type, scheduled_at, notes) VALUES (?, ?, ?, ?, ?, ?)', id, trainerId, traineeId, type || 'video', scheduledAt, notes || null);

    // Create meeting reminders based on session type
    const isOnline = type === 'video' || type === 'audio';
    const title = isOnline ? 'Online Session Reminder' : 'In-Person Session Reminder';
    const message = isOnline 
      ? 'You have an online session scheduled. Be ready on the platform.' 
      : 'IN-PERSON MEETING: Please plan your travel time accordingly to arrive early and on time.';
    
    await createNotification(trainerId, 'session', title, message, '/trainer/sessions');
    await createNotification(traineeId, 'session', title, message, '/trainee/sessions');

    res.json({ id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/start', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await db.run("UPDATE sessions SET status = 'active', updated_at = NOW() WHERE id = ?", req.params.id);
    res.json({ message: 'Session started' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/end', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const session = await db.get('SELECT * FROM sessions WHERE id = ?', req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const duration = Math.floor((Date.now() - new Date(session.scheduledAt).getTime()) / 60000);
    await db.run("UPDATE sessions SET status = 'completed', duration = ?, updated_at = NOW() WHERE id = ?", Math.max(1, duration), req.params.id);

    await awardXP(session.trainerId, 30);
    await awardXP(session.traineeId, 50);
    await checkAchievements(session.trainerId);
    await checkAchievements(session.traineeId);

    res.json({ message: 'Session ended', duration });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    await db.run("UPDATE sessions SET status = 'cancelled', cancel_reason = ?, updated_at = NOW() WHERE id = ?", reason || null, req.params.id);
    res.json({ message: 'Session cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/rate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });

    const session = await db.get('SELECT * FROM sessions WHERE id = ?', req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const revieweeId = req.user!.id === session.trainerId ? session.traineeId : session.trainerId;

    const id = uuid();
    await db.run('INSERT INTO reviews (id, session_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)', id, req.params.id, req.user!.id, revieweeId, rating, review || null);

    if (revieweeId === session.trainerId) {
      const stats = await db.get('SELECT AVG(rating) as avg, COUNT(*) as total FROM reviews WHERE reviewee_id = ?', session.trainerId);
      await db.run('UPDATE trainer_profiles SET rating = ?, total_reviews = ?, updated_at = NOW() WHERE user_id = ?',
        Math.round(parseFloat(stats.avg) * 10) / 10, parseInt(stats.total), session.trainerId);
    }

    await awardXP(req.user!.id, 20);
    await checkAchievements(req.user!.id);
    await createNotification(revieweeId, 'review', '⭐ New Review', `${req.user!.name} rated your session ${rating}/5`, '/trainer/profile');

    res.json({ message: 'Rating submitted' });
  } catch (err) {
    console.error('Rate session error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
