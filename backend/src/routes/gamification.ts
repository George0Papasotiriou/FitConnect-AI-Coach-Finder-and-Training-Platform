import { Router } from 'express';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { awardXP, calculateLevel, generateDailyTasks, checkAchievements } from '../services/gamification.js';

const router = Router();

router.get('/xp', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await db.get('SELECT xp, level FROM users WHERE id = ?', req.user!.id);
    const { level, currentLevelXp, nextLevelXp } = calculateLevel(user?.xp || 0);
    res.json({ xp: user?.xp || 0, level, currentLevelXp, nextLevelXp });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/achievements', authenticate, async (req: AuthRequest, res) => {
  try {
    await checkAchievements(req.user!.id);
    const achievements = await db.all(`
      SELECT a.*, COALESCE(ua.progress, 0) as progress, COALESCE(ua.unlocked, 0) as unlocked, ua.unlocked_at
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
      ORDER BY ua.unlocked DESC, a.category, a.name
    `, req.user!.id);

    res.json(achievements.map(a => ({ ...a, unlocked: !!a.unlocked })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/daily-tasks', authenticate, async (req: AuthRequest, res) => {
  try {
    await generateDailyTasks(req.user!.id);
    const today = new Date().toISOString().split('T')[0];
    const tasks = await db.all('SELECT * FROM daily_tasks WHERE user_id = ? AND date = ? ORDER BY completed ASC, created_at ASC', req.user!.id, today);
    res.json(tasks.map(t => ({ ...t, completed: !!t.completed })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/daily-tasks/:id/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    const task = await db.get('SELECT * FROM daily_tasks WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.completed) return res.status(400).json({ message: 'Task already completed' });

    await db.run('UPDATE daily_tasks SET completed = 1, completed_at = NOW() WHERE id = ?', req.params.id);
    const result = await awardXP(req.user!.id, task.xpReward);
    await checkAchievements(req.user!.id);

    res.json({ message: 'Task completed', xpGained: task.xpReward, ...result });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/leaderboard', authenticate, async (req: AuthRequest, res) => {
  try {
    const { period = 'weekly' } = req.query;
    let dateFilter = '';
    if (period === 'weekly') dateFilter = `AND u.updated_at >= NOW() - INTERVAL '7 days'`;
    else if (period === 'monthly') dateFilter = `AND u.updated_at >= NOW() - INTERVAL '30 days'`;

    const entries = await db.all(`
      SELECT u.id as user_id, u.name, u.avatar, u.xp, u.level,
      (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id AND ua.unlocked = 1) as achievements
      FROM users u
      WHERE u.role != 'admin' AND u.is_banned = 0 ${dateFilter}
      ORDER BY u.xp DESC
      LIMIT 100
    `);

    const result = entries.map((e: any, i: number) => ({ ...e, rank: i + 1 }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
