import db from '../db.js';
import { v4 as uuid } from 'uuid';

const XP_PER_LEVEL = 1000;
const LEVEL_MULTIPLIER = 1.5;

export function calculateLevel(xp: number): { level: number; currentLevelXp: number; nextLevelXp: number } {
  let level = 1;
  let totalXpForLevel = XP_PER_LEVEL;
  let prevTotal = 0;
  while (xp >= totalXpForLevel) {
    level++;
    prevTotal = totalXpForLevel;
    totalXpForLevel += Math.floor(XP_PER_LEVEL * Math.pow(LEVEL_MULTIPLIER, level - 1));
  }
  return { level, currentLevelXp: prevTotal, nextLevelXp: totalXpForLevel };
}

export async function awardXP(userId: string, amount: number) {
  const user = await db.get('SELECT xp, level FROM users WHERE id = ?', userId);
  const newXp = ((user?.xp as number) || 0) + amount;
  const { level, currentLevelXp, nextLevelXp } = calculateLevel(newXp);
  const leveledUp = level > ((user?.level as number) || 1);
  await db.run('UPDATE users SET xp = ?, level = ?, updated_at = NOW() WHERE id = ?', newXp, level, userId);
  if (leveledUp) await createNotification(userId, 'achievement', '🎉 Level Up!', `Congratulations! You've reached level ${level}!`, '/achievements');
  return { xp: newXp, level, nextLevelXp, currentLevelXp, leveledUp };
}

export async function updateStreak(userId: string): Promise<number> {
  const user = await db.get('SELECT streak, last_active_date FROM users WHERE id = ?', userId);
  const today = new Date().toISOString().split('T')[0];
  if (user?.lastActiveDate === today) return user.streak as number;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  let newStreak = user?.lastActiveDate === yesterday ? ((user.streak as number) || 0) + 1 : 1;
  await db.run('UPDATE users SET streak = ?, last_active_date = ?, updated_at = NOW() WHERE id = ?', newStreak, today, userId);
  return newStreak;
}

export async function checkAchievements(userId: string): Promise<void> {
  const achievements = await db.all('SELECT * FROM achievements');
  const user = await db.get('SELECT xp, level, streak FROM users WHERE id = ?', userId);
  const sessionsRow = await db.get("SELECT COUNT(*) as c FROM sessions WHERE (trainer_id = ? OR trainee_id = ?) AND status = 'completed'", userId, userId);
  const reviewsRow = await db.get('SELECT COUNT(*) as c FROM reviews WHERE reviewer_id = ?', userId);
  const messagesRow = await db.get('SELECT COUNT(*) as c FROM messages WHERE sender_id = ?', userId);

  const totalSessions = parseInt(sessionsRow?.c || 0);
  const totalReviews = parseInt(reviewsRow?.c || 0);
  const totalMessages = parseInt(messagesRow?.c || 0);

  for (const ach of achievements) {
    let progress = 0;
    switch (ach.id) {
      case 'first-session': progress = totalSessions >= 1 ? 1 : 0; break;
      case 'five-sessions': progress = Math.min(totalSessions, 5); break;
      case 'twenty-sessions': progress = Math.min(totalSessions, 20); break;
      case 'fifty-sessions': progress = Math.min(totalSessions, 50); break;
      case 'streak-3': progress = Math.min((user?.streak as number) || 0, 3); break;
      case 'streak-7': progress = Math.min((user?.streak as number) || 0, 7); break;
      case 'streak-30': progress = Math.min((user?.streak as number) || 0, 30); break;
      case 'first-review': progress = totalReviews >= 1 ? 1 : 0; break;
      case 'level-5': progress = Math.min((user?.level as number) || 1, 5); break;
      case 'level-10': progress = Math.min((user?.level as number) || 1, 10); break;
      case 'social-butterfly': progress = Math.min(totalMessages, 100); break;
      case 'early-bird': {
        const earlySession = await db.get(`SELECT id FROM sessions WHERE (trainer_id = ? OR trainee_id = ?) AND status = 'completed' AND EXTRACT(HOUR FROM scheduled_at) < 9`, userId, userId);
        progress = earlySession ? 1 : 0;
        break;
      }
      default: continue;
    }
    const existing = await db.get('SELECT * FROM user_achievements WHERE user_id = ? AND achievement_id = ?', userId, ach.id as string);
    const isNowUnlocked = progress >= (ach.maxProgress as number);
    if (existing) {
      await db.run('UPDATE user_achievements SET progress = ?, unlocked = ?, unlocked_at = ? WHERE user_id = ? AND achievement_id = ?',
        progress, isNowUnlocked ? 1 : 0, isNowUnlocked && !existing.unlocked ? new Date().toISOString() : existing.unlockedAt, userId, ach.id as string);
      if (isNowUnlocked && !existing.unlocked) {
        await awardXP(userId, ach.xpReward as number);
        await createNotification(userId, 'achievement', `🏆 ${ach.name}`, `You've unlocked: ${ach.description}`, '/achievements');
      }
    } else {
      await db.run('INSERT INTO user_achievements (id, user_id, achievement_id, progress, unlocked, unlocked_at) VALUES (?, ?, ?, ?, ?, ?)',
        uuid(), userId, ach.id as string, progress, isNowUnlocked ? 1 : 0, isNowUnlocked ? new Date().toISOString() : null);
      if (isNowUnlocked) {
        await awardXP(userId, ach.xpReward as number);
        await createNotification(userId, 'achievement', `🏆 ${ach.name}`, `You've unlocked: ${ach.description}`, '/achievements');
      }
    }
  }
}

export async function generateDailyTasks(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const existing = await db.get('SELECT COUNT(*) as c FROM daily_tasks WHERE user_id = ? AND date = ?', userId, today);
  if (parseInt(existing?.c || 0) > 0) return;

  const tasks = [
    { title: 'Complete a workout session', description: 'Attend or complete any workout session today', xpReward: 50, type: 'session' },
    { title: 'Send an encouraging message', description: 'Send a message to your coach or trainee', xpReward: 20, type: 'social' },
    { title: 'Check the leaderboard', description: 'Visit the leaderboard page', xpReward: 10, type: 'engagement' },
    { title: 'Log your water intake', description: 'Stay hydrated — mark this when done', xpReward: 15, type: 'health' },
    { title: 'Review your progress', description: 'Check your stats and achievements', xpReward: 10, type: 'engagement' },
    { title: 'Stretch for 10 minutes', description: 'Do a quick stretching routine for mobility', xpReward: 25, type: 'health' },
  ];

  const shuffled = tasks.sort(() => Math.random() - 0.5).slice(0, 4);
  for (const task of shuffled) {
    await db.run('INSERT INTO daily_tasks (id, user_id, title, description, xp_reward, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(), userId, task.title, task.description, task.xpReward, task.type, today);
  }
}

export async function createNotification(userId: string, type: string, title: string, body: string, actionUrl?: string, metadata?: any): Promise<string> {
  const id = uuid();
  await db.run('INSERT INTO notifications (id, user_id, type, title, body, action_url, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, userId, type, title, body, actionUrl || null, JSON.stringify(metadata || {}));
  return id;
}
