import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { uploadDocument, uploadAvatar } from '../middleware/upload.js';
import { createNotification } from '../services/gamification.js';

const router = Router();

router.get('/search', authenticate, async (req: AuthRequest, res) => {
  try {
    const { specialty, minRating, maxRate, query, page = '1', limit = '20' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    let sql = `SELECT tp.*, u.name, u.email, u.avatar FROM trainer_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.application_status = 'approved' AND u.is_banned = 0`;
    const params: any[] = [];

    if (query) { sql += ` AND (u.name ILIKE ? OR tp.bio ILIKE ?)`; params.push(`%${query}%`, `%${query}%`); }
    if (specialty) { sql += ` AND tp.specialties ILIKE ?`; params.push(`%${specialty}%`); }
    if (minRating) { sql += ` AND tp.rating >= ?`; params.push(parseFloat(minRating as string)); }
    if (maxRate) { sql += ` AND tp.hourly_rate <= ?`; params.push(parseFloat(maxRate as string)); }

    sql += ` ORDER BY tp.rating DESC, tp.total_reviews DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit as string), offset);

    const trainers = await db.all(sql, ...params);
    const result = trainers.map(t => ({
      ...t, specialties: JSON.parse(t.specialties || '[]'),
      credentials: JSON.parse(t.credentials || '[]'), documents: JSON.parse(t.documents || '[]')
    }));
    res.json(result);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const trainer = await db.get(`SELECT tp.*, u.name, u.email, u.avatar FROM trainer_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.user_id = ? AND tp.application_status = 'approved'`, req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    res.json({ ...trainer, specialties: JSON.parse(trainer.specialties || '[]'), credentials: JSON.parse(trainer.credentials || '[]') });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/reviews', authenticate, async (req: AuthRequest, res) => {
  try {
    const reviews = await db.all(`SELECT r.*, u.name as reviewer_name, u.avatar as reviewer_avatar FROM reviews r JOIN users u ON r.reviewer_id = u.id WHERE r.reviewee_id = ? ORDER BY r.created_at DESC`, req.params.id);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

export const trainerRouter = Router();

trainerRouter.get('/profile', authenticate, requireRole('trainer'), async (req: AuthRequest, res) => {
  try {
    const profile = await db.get('SELECT tp.*, u.name, u.email, u.avatar FROM trainer_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.user_id = ?', req.user!.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json({ ...profile, specialties: JSON.parse(profile.specialties || '[]'), credentials: JSON.parse(profile.credentials || '[]'), documents: JSON.parse(profile.documents || '[]') });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.put('/profile', authenticate, requireRole('trainer'), async (req: AuthRequest, res) => {
  try {
    const { bio, description, specialties, experience, hourlyRate, isAvailable, credentials } = req.body;
    const updates: string[] = [];
    const params: any[] = [];

    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (specialties !== undefined) { updates.push('specialties = ?'); params.push(JSON.stringify(specialties)); }
    if (experience !== undefined) { updates.push('experience = ?'); params.push(experience); }
    if (hourlyRate !== undefined) { updates.push('hourly_rate = ?'); params.push(hourlyRate); }
    if (isAvailable !== undefined) { updates.push('is_available = ?'); params.push(isAvailable ? 1 : 0); }
    if (credentials !== undefined) { updates.push('credentials = ?'); params.push(JSON.stringify(credentials)); }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()');
      params.push(req.user!.id);
      await db.run(`UPDATE trainer_profiles SET ${updates.join(', ')} WHERE user_id = ?`, ...params);
    }

    if (req.body.name) await db.run('UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?', req.body.name, req.user!.id);

    const profile = await db.get('SELECT tp.*, u.name, u.email, u.avatar FROM trainer_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.user_id = ?', req.user!.id);
    res.json({ ...profile, specialties: JSON.parse(profile.specialties || '[]'), credentials: JSON.parse(profile.credentials || '[]') });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.get('/stats', authenticate, requireRole('trainer'), async (req: AuthRequest, res) => {
  try {
    const totalClientsRow = await db.get("SELECT COUNT(DISTINCT trainee_id) as c FROM coach_requests WHERE trainer_id = ? AND status = 'accepted'", req.user!.id);
    const sessionsWeekRow = await db.get("SELECT COUNT(*) as c FROM sessions WHERE trainer_id = ? AND scheduled_at >= NOW() - INTERVAL '7 days'", req.user!.id);
    const profile = await db.get('SELECT rating, total_reviews, hourly_rate FROM trainer_profiles WHERE user_id = ?', req.user!.id);
    const completedRow = await db.get("SELECT COUNT(*) as c FROM sessions WHERE trainer_id = ? AND status = 'completed'", req.user!.id);

    res.json({
      totalClients: parseInt(totalClientsRow?.c || 0),
      sessionsThisWeek: parseInt(sessionsWeekRow?.c || 0),
      averageRating: profile?.rating || 0,
      earnings: parseInt(completedRow?.c || 0) * (profile?.hourlyRate || 0),
      totalReviews: profile?.totalReviews || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.get('/clients', authenticate, requireRole('trainer'), async (req: AuthRequest, res) => {
  try {
    const requests = await db.all(`SELECT cr.*, u.name, u.avatar, tp.fitness_level, tp.goals FROM coach_requests cr JOIN users u ON cr.trainee_id = u.id LEFT JOIN trainee_profiles tp ON tp.user_id = cr.trainee_id WHERE cr.trainer_id = ? ORDER BY cr.created_at DESC`, req.user!.id);
    const result = requests.map(r => ({
      id: r.id, status: r.status, createdAt: r.createdAt,
      trainee: { id: r.traineeId, name: r.name, avatar: r.avatar, fitnessLevel: r.fitnessLevel, goals: JSON.parse(r.goals || '[]') }
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.post('/clients/:id/accept', authenticate, requireRole('trainer'), async (req: AuthRequest, res) => {
  try {
    const request = await db.get('SELECT * FROM coach_requests WHERE id = ? AND trainer_id = ?', req.params.id, req.user!.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await db.run("UPDATE coach_requests SET status = 'accepted', updated_at = NOW() WHERE id = ?", req.params.id);
    await db.run('UPDATE trainee_profiles SET current_coach_id = ?, updated_at = NOW() WHERE user_id = ?', req.user!.id, request.traineeId);

    const convId = uuid();
    await db.run('INSERT INTO conversations (id) VALUES (?)', convId);
    await db.run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', convId, req.user!.id);
    await db.run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', convId, request.traineeId);

    await createNotification(request.traineeId, 'request', '🎉 Coach Accepted!', `${req.user!.name} has accepted your coaching request!`, '/my-coach');
    res.json({ message: 'Client accepted' });
  } catch (err) {
    console.error('Accept client error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.post('/clients/:id/reject', authenticate, requireRole('trainer'), async (req: AuthRequest, res) => {
  try {
    const request = await db.get('SELECT * FROM coach_requests WHERE id = ? AND trainer_id = ?', req.params.id, req.user!.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    await db.run("UPDATE coach_requests SET status = 'rejected', updated_at = NOW() WHERE id = ?", req.params.id);
    await createNotification(request.traineeId, 'request', 'Request Update', 'Your coaching request was not accepted. Try finding another coach!', '/search');
    res.json({ message: 'Client rejected' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.get('/sessions', authenticate, requireRole('trainer'), async (req: AuthRequest, res) => {
  try {
    const sessions = await db.all(`SELECT s.*, u.name as trainee_name, u.avatar as trainee_avatar FROM sessions s JOIN users u ON s.trainee_id = u.id WHERE s.trainer_id = ? ORDER BY s.scheduled_at DESC`, req.user!.id);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.post('/application', authenticate, requireRole('trainer'), async (req: AuthRequest, res) => {
  try {
    const { bio, description, specialties, experience, hourlyRate } = req.body;
    await db.run('UPDATE trainer_profiles SET bio = ?, description = ?, specialties = ?, experience = ?, hourly_rate = ?, application_status = ?, updated_at = NOW() WHERE user_id = ?',
      bio, description, JSON.stringify(specialties), experience, hourlyRate, 'pending', req.user!.id);

    const admins = await db.all("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins) {
      await createNotification(admin.id, 'system', '📋 New Trainer Application', `${req.user!.name} has submitted a trainer application`, '/admin/dashboard');
    }

    res.json({ message: 'Application submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.post('/upload-document', authenticate, requireRole('trainer'), uploadDocument.single('document'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = `/uploads/documents/${req.file.filename}`;
    const profile = await db.get('SELECT documents FROM trainer_profiles WHERE user_id = ?', req.user!.id);
    const docs = JSON.parse(profile?.documents || '[]');
    docs.push(url);
    await db.run('UPDATE trainer_profiles SET documents = ?, updated_at = NOW() WHERE user_id = ?', JSON.stringify(docs), req.user!.id);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

trainerRouter.post('/upload-avatar', authenticate, uploadAvatar.single('avatar'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const url = `/uploads/avatars/${req.file.filename}`;
    await db.run('UPDATE users SET avatar = ?, updated_at = NOW() WHERE id = ?', url, req.user!.id);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
