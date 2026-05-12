import { Router, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { awardXP, updateStreak, checkAchievements, generateDailyTasks, createNotification } from '../services/gamification.js';

const router = Router();

router.get('/profile', authenticate, requireRole('trainee'), async (req: AuthRequest, res: Response) => {
  try {
    const profile = await db.get(`SELECT tp.*, u.name, u.email, u.avatar, u.xp, u.level, u.onboarding_complete FROM trainee_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.user_id = ?`, req.user!.id);
    if (!profile) return res.status(404).json({ message: 'Profile not found' });

    let currentCoach = null;
    if (profile.currentCoachId) {
      currentCoach = await db.get('SELECT id, name, avatar FROM users WHERE id = ?', profile.currentCoachId);
    }

    res.json({
      ...profile,
      goals: JSON.parse(profile.goals || '[]'),
      accessibilityNeeds: JSON.parse(profile.accessibilityNeeds || '[]'),
      preferredWorkoutTypes: JSON.parse(profile.preferredWorkoutTypes || '[]'),
      onboardingComplete: !!profile.onboardingComplete,
      currentCoach
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/profile', authenticate, requireRole('trainee'), async (req: AuthRequest, res: Response) => {
  try {
    const { age, weight, height, fitnessLevel, goals, accessibilityNeeds, preferredWorkoutTypes, name } = req.body;
    if (age !== undefined) await db.run('UPDATE trainee_profiles SET age = ? WHERE user_id = ?', age, req.user!.id);
    if (weight !== undefined) await db.run('UPDATE trainee_profiles SET weight = ? WHERE user_id = ?', weight, req.user!.id);
    if (height !== undefined) await db.run('UPDATE trainee_profiles SET height = ? WHERE user_id = ?', height, req.user!.id);
    if (fitnessLevel !== undefined) await db.run('UPDATE trainee_profiles SET fitness_level = ? WHERE user_id = ?', fitnessLevel, req.user!.id);
    if (goals !== undefined) await db.run('UPDATE trainee_profiles SET goals = ? WHERE user_id = ?', JSON.stringify(goals), req.user!.id);
    if (accessibilityNeeds !== undefined) await db.run('UPDATE trainee_profiles SET accessibility_needs = ? WHERE user_id = ?', JSON.stringify(accessibilityNeeds), req.user!.id);
    if (preferredWorkoutTypes !== undefined) await db.run('UPDATE trainee_profiles SET preferred_workout_types = ? WHERE user_id = ?', JSON.stringify(preferredWorkoutTypes), req.user!.id);
    if (name) await db.run('UPDATE users SET name = ? WHERE id = ?', name, req.user!.id);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/onboarding', authenticate, requireRole('trainee'), async (req: AuthRequest, res: Response) => {
  try {
    const { age, weight, height, fitnessLevel, goals, accessibilityNeeds, preferredWorkoutTypes } = req.body;
    await db.run('UPDATE trainee_profiles SET age = ?, weight = ?, height = ?, fitness_level = ?, goals = ?, accessibility_needs = ?, preferred_workout_types = ? WHERE user_id = ?',
      age, weight, height, fitnessLevel, JSON.stringify(goals), JSON.stringify(accessibilityNeeds), JSON.stringify(preferredWorkoutTypes), req.user!.id);
    await db.run('UPDATE users SET onboarding_complete = 1 WHERE id = ?', req.user!.id);
    await awardXP(req.user!.id, 100);
    await generateDailyTasks(req.user!.id);
    res.json({ message: 'Onboarding complete' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/stats', authenticate, requireRole('trainee'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.get('SELECT xp, level, streak FROM users WHERE id = ?', req.user!.id);
    const r1 = await db.get("SELECT COUNT(*) as c FROM sessions WHERE trainee_id = ? AND status = 'completed'", req.user!.id);
    const r2 = await db.get('SELECT COUNT(*) as c FROM user_achievements WHERE user_id = ? AND unlocked = 1', req.user!.id);
    res.json({
      totalSessions: parseInt(r1?.c || 0),
      currentStreak: user?.streak || 0,
      achievements: parseInt(r2?.c || 0),
      xp: user?.xp || 0,
      level: user?.level || 1
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/request-coach/:coachId', authenticate, requireRole('trainee'), async (req: AuthRequest, res: Response) => {
  try {
    const coachId = req.params.coachId as string;
    const existing = await db.get("SELECT id FROM coach_requests WHERE trainee_id = ? AND trainer_id = ? AND status = 'pending'", req.user!.id, coachId);
    if (existing) return res.status(400).json({ message: 'Request already pending' });
    const id = uuid();
    await db.run('INSERT INTO coach_requests (id, trainee_id, trainer_id) VALUES (?, ?, ?)', id, req.user!.id, coachId);
    await createNotification(coachId, 'request', '🔔 New Client Request', `${req.user!.name} wants to train with you!`, '/trainer/clients');
    res.json({ message: 'Request sent', id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/instant-session/:coachId', authenticate, requireRole('trainee'), async (req: AuthRequest, res: Response) => {
  try {
    const coachId = req.params.coachId as string;
    const id = uuid();
    await db.run("INSERT INTO sessions (id, trainer_id, trainee_id, type, status, scheduled_at) VALUES (?, ?, ?, 'video', 'active', NOW())", id, coachId, req.user!.id);
    await createNotification(coachId, 'session', '📹 Instant Session', `${req.user!.name} wants to workout now!`, `/call/${id}`);
    res.json({ sessionId: id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/schedule-session/:coachId', authenticate, requireRole('trainee'), async (req: AuthRequest, res: Response) => {
  try {
    const coachId = req.params.coachId as string;
    const { date, time, notes } = req.body;
    const id = uuid();
    const scheduledAt = `${date}T${time}:00`;
    await db.run("INSERT INTO sessions (id, trainer_id, trainee_id, type, status, scheduled_at, notes) VALUES (?, ?, ?, 'video', 'scheduled', ?, ?)", id, coachId, req.user!.id, scheduledAt, notes || null);
    await createNotification(coachId, 'session', '📅 New Session Booked', `${req.user!.name} scheduled a session on ${date} at ${time}`, '/trainer/sessions');
    res.json({ sessionId: id });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/sessions/upcoming', authenticate, requireRole('trainee'), async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await db.all(`SELECT s.*, u.name as trainer_name, u.avatar as trainer_avatar FROM sessions s JOIN users u ON s.trainer_id = u.id WHERE s.trainee_id = ? AND s.status IN ('scheduled', 'active') ORDER BY s.scheduled_at ASC`, req.user!.id);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/motivational-quote', authenticate, async (_req, res: Response) => {
  const quotes = [
    { quote: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { quote: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
    { quote: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { quote: "The body achieves what the mind believes.", author: "Napoleon Hill" },
    { quote: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { quote: "It never gets easier, you just get stronger.", author: "Unknown" },
    { quote: "Your body can stand almost anything. It's your mind that you have to convince.", author: "Unknown" },
    { quote: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  ];
  res.json(quotes[Math.floor(Math.random() * quotes.length)]);
});

export default router;
