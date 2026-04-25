import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import db from '../db.js';
import { v4 as uuid } from 'uuid';

const router = Router();

// Get billing info
router.get('/info', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.get('SELECT subscription_active, free_trial_used, role FROM users WHERE id = ?', req.user!.id);
    let balance = 0;
    
    if (user.role === 'trainer') {
      const profile = await db.get('SELECT balance FROM trainer_profiles WHERE user_id = ?', req.user!.id);
      balance = profile?.balance || 0;
    }
    
    const history = await db.all('SELECT * FROM billing_history WHERE user_id = ? ORDER BY created_at DESC', req.user!.id);
    
    res.json({
      subscriptionActive: !!user.subscription_active,
      freeTrialUsed: !!user.free_trial_used,
      balance,
      history
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Process session payment
router.post('/pay-session', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, trainerId, paymentMethod } = req.body;
    
    const user = await db.get('SELECT free_trial_used FROM users WHERE id = ?', req.user!.id);
    
    let amount = 18; // Default 18 EUR (15 for trainer + 3 platform fee)
    let isFree = false;

    if (!user.free_trial_used) {
      amount = 0;
      isFree = true;
    }

    await db.transaction(async (client) => {
      // 1. Record in history
      await client.query('INSERT INTO billing_history (id, user_id, amount, type, payment_method) VALUES ($1, $2, $3, $4, $5)', 
        [uuid(), req.user!.id, amount, 'payment', paymentMethod]);
      
      // 2. Mark free trial as used
      if (isFree) {
        await client.query('UPDATE users SET free_trial_used = 1 WHERE id = $1', [req.user!.id]);
      }

      // 3. Update trainer balance (15 EUR)
      if (!isFree) {
        await client.query('UPDATE trainer_profiles SET balance = balance + 15 WHERE user_id = $1', [trainerId]);
      }
      
      // 4. Update session status if needed
      if (sessionId) {
        await client.query("UPDATE sessions SET status = 'completed' WHERE id = $1", [sessionId]);
      }
    });

    res.json({ message: 'Payment successful', amount, isFree });
  } catch (err) {
    console.error('Payment error:', err);
    res.status(500).json({ message: 'Payment processing failed' });
  }
});

// Trainer subscription
router.post('/subscribe-trainer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMethod } = req.body;
    
    await db.transaction(async (client) => {
      await client.query('INSERT INTO billing_history (id, user_id, amount, type, payment_method) VALUES ($1, $2, $3, $4, $5)', 
        [uuid(), req.user!.id, 15, 'subscription', paymentMethod]);
      
      await client.query('UPDATE users SET subscription_active = 1 WHERE id = $1', [req.user!.id]);
    });

    res.json({ message: 'Subscription active' });
  } catch (err) {
    res.status(500).json({ message: 'Subscription failed' });
  }
});

// Withdrawal
router.post('/withdraw', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, paymentMethod } = req.body;
    const profile = await db.get('SELECT balance FROM trainer_profiles WHERE user_id = ?', req.user!.id);

    if (!profile || profile.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    await db.transaction(async (client) => {
      await client.query('INSERT INTO billing_history (id, user_id, amount, type, payment_method) VALUES ($1, $2, $3, $4, $5)', 
        [uuid(), req.user!.id, amount, 'withdrawal', paymentMethod]);
      
      await client.query('UPDATE trainer_profiles SET balance = balance - $1 WHERE user_id = $2', [amount, req.user!.id]);
    });

    res.json({ message: 'Withdrawal processed' });
  } catch (err) {
    res.status(500).json({ message: 'Withdrawal failed' });
  }
});

export default router;
