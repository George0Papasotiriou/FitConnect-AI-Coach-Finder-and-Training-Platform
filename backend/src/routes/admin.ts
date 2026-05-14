/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { createNotification } from '../services/gamification.js';

const router = Router();

router.get('/stats', authenticate, requireRole('admin'), async (_req: AuthRequest, res) => {
  try {
    const totalUsers = await db.get('SELECT COUNT(*) as c FROM users');
    const totalTrainers = await db.get("SELECT COUNT(*) as c FROM users WHERE role = 'trainer'");
    const totalTrainees = await db.get("SELECT COUNT(*) as c FROM users WHERE role = 'trainee'");
    const pendingApps = await db.get("SELECT COUNT(*) as c FROM trainer_profiles WHERE application_status = 'pending'");
    const totalSessions = await db.get('SELECT COUNT(*) as c FROM sessions');
    const activeSessions = await db.get("SELECT COUNT(*) as c FROM sessions WHERE status = 'active'");

    res.json({
      totalUsers: parseInt(totalUsers?.c || 0),
      totalTrainers: parseInt(totalTrainers?.c || 0),
      totalTrainees: parseInt(totalTrainees?.c || 0),
      pendingApplications: parseInt(pendingApps?.c || 0),
      totalSessions: parseInt(totalSessions?.c || 0),
      activeSessions: parseInt(activeSessions?.c || 0)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/applications', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT tp.*, u.name, u.email, u.avatar, u.created_at as user_created_at FROM trainer_profiles tp JOIN users u ON tp.user_id = u.id`;
    const params: any[] = [];
    if (status) { sql += ` WHERE tp.application_status = ?`; params.push(status); }
    sql += ` ORDER BY tp.created_at DESC`;

    const apps = await db.all(sql, ...params);
    res.json(apps.map(a => ({
      id: a.id, userId: a.userId, name: a.name, email: a.email, avatar: a.avatar,
      bio: a.bio, specialties: JSON.parse(a.specialties || '[]'), experience: a.experience,
      hourlyRate: a.hourlyRate, documents: JSON.parse(a.documents || '[]'),
      status: a.applicationStatus, createdAt: a.createdAt,
      reviewedAt: a.reviewedAt, reviewNotes: a.applicationNotes
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/applications/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const app = await db.get(`SELECT tp.*, u.name, u.email, u.avatar FROM trainer_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.id = ?`, req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json({
      ...app, specialties: JSON.parse(app.specialties || '[]'),
      credentials: JSON.parse(app.credentials || '[]'), documents: JSON.parse(app.documents || '[]'),
      status: app.applicationStatus
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/applications/:id/approve', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { notes } = req.body;
    const app = await db.get('SELECT tp.user_id FROM trainer_profiles tp WHERE tp.id = ?', req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    await db.run("UPDATE trainer_profiles SET application_status = 'approved', application_notes = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?", notes || null, req.params.id);
    await createNotification(app.userId, 'system', '🎉 Application Approved!', 'Congratulations! Your trainer application has been approved. You can now set up your profile!', '/trainer/profile');
    res.json({ message: 'Application approved' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/applications/:id/reject', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { notes } = req.body;
    const app = await db.get('SELECT tp.user_id FROM trainer_profiles tp WHERE tp.id = ?', req.params.id);
    if (!app) return res.status(404).json({ message: 'Application not found' });

    await db.run("UPDATE trainer_profiles SET application_status = 'rejected', application_notes = ?, reviewed_at = NOW(), updated_at = NOW() WHERE id = ?", notes || 'Does not meet requirements', req.params.id);
    await createNotification(app.userId, 'system', 'Application Update', 'Your trainer application was not approved. Please review the feedback and try again.', '/trainer-application');
    res.json({ message: 'Application rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { role, page = '1', limit = '50' } = req.query;
    let sql = 'SELECT id, name, email, role, avatar, xp, level, is_banned, created_at FROM users WHERE 1=1';
    const params: any[] = [];
    if (role) { sql += ' AND role = ?'; params.push(role); }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit as string), (parseInt(page as string) - 1) * parseInt(limit as string));

    const users = await db.all(sql, ...params);
    res.json(users.map(u => ({ ...u, isBanned: !!u.isBanned })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users/:id/ban', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body;
    await db.run('UPDATE users SET is_banned = 1, ban_reason = ?, updated_at = NOW() WHERE id = ?', reason, req.params.id);
    res.json({ message: 'User banned' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users/:id/unban', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    await db.run('UPDATE users SET is_banned = 0, ban_reason = NULL, updated_at = NOW() WHERE id = ?', req.params.id);
    res.json({ message: 'User unbanned' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
