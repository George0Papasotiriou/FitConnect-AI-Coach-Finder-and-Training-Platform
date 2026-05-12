import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get active bounties for the trainee
router.get('/active', authenticate, async (req: any, res) => {
  try {
    const bounties = await db.all(`
      SELECT b.*, ub.status 
      FROM bounties b
      LEFT JOIN user_bounties ub ON b.id = ub.bounty_id AND ub.user_id = ?
      WHERE b.expires_at IS NULL OR b.expires_at > NOW()
    `, req.user.id);
    res.json(bounties);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bounties' });
  }
});

// Create a bounty (trainers only in a real app, but open for demo)
router.post('/create', authenticate, async (req: any, res) => {
  const { title, description, xpReward, exerciseType, goalValue } = req.body;
  
  try {
    const id = uuidv4();
    await db.run(
      'INSERT INTO bounties (id, trainer_id, title, description, xp_reward, exercise_type, goal_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, req.user.id, title, description, xpReward, exerciseType, goalValue
    );
    res.json({ id, message: 'Bounty created' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create bounty' });
  }
});

// Complete a bounty
router.post('/complete/:id', authenticate, async (req: any, res) => {
  const { id } = req.params;
  
  try {
    const bounty = await db.get('SELECT * FROM bounties WHERE id = ?', id);
    if (!bounty) return res.status(404).json({ error: 'Bounty not found' });

    const userBountyId = uuidv4();
    await db.run(
      'INSERT INTO user_bounties (id, user_id, bounty_id, status, completed_at) VALUES (?, ?, ?, ?, NOW()) ON CONFLICT(user_id, bounty_id) DO UPDATE SET status = ?, completed_at = NOW()',
      userBountyId, req.user.id, id, 'completed', 'completed'
    );

    // Reward XP
    await db.run('UPDATE users SET xp = xp + ? WHERE id = ?', bounty.xpReward, req.user.id);

    res.json({ message: 'Bounty completed! Rewards issued.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update bounty status' });
  }
});

<<<<<<< HEAD
// Get trainer's created bounties
router.get('/trainer', authenticate, async (req: any, res) => {
  if (req.user.role !== 'trainer') return res.status(403).json({ error: 'Trainers only' });
  try {
    const bounties = await db.all('SELECT * FROM bounties WHERE trainer_id = ? ORDER BY created_at DESC', req.user.id);
    res.json(bounties);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trainer bounties' });
  }
});

// Delete a bounty
router.delete('/:id', authenticate, async (req: any, res) => {
  if (req.user.role !== 'trainer') return res.status(403).json({ error: 'Trainers only' });
  try {
    const { id } = req.params;
    await db.run('DELETE FROM bounties WHERE id = ? AND trainer_id = ?', id, req.user.id);
    res.json({ message: 'Bounty deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bounty' });
  }
});

=======
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
export default router;
