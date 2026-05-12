import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/register', async (req, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: 'All fields are required' });
    if (!['trainee', 'trainer'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const id = uuid();
    const hashed = await bcrypt.hash(password, 12);
    await db.run('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)', id, name, email, hashed, role);

    if (role === 'trainee') {
      await db.run('INSERT INTO trainee_profiles (id, user_id) VALUES (?, ?)', uuid(), id);
    } else {
      await db.run('INSERT INTO trainer_profiles (id, user_id) VALUES (?, ?)', uuid(), id);
    }

    const token = jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    const user = await db.get('SELECT id, name, email, role, avatar, xp, level, onboarding_complete FROM users WHERE id = ?', id);

    res.status(201).json({ token, user: { ...user, onboardingComplete: !!user?.onboardingComplete } });
  } catch (err: any) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.isBanned) return res.status(403).json({ message: 'Account is suspended' });

    const valid = await bcrypt.compare(password, user.password as string);
    if (!valid) return res.status(401).json({ message: 'Incorrect password' });

    // Check if 2FA is required
    const needs2FA = !!user.twoFactorEnabled;

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        avatar: user.avatar, xp: user.xp, level: user.level,
        onboardingComplete: !!user.onboardingComplete,
        twoFactorEnabled: !!user.twoFactorEnabled,
        twoFactorSkipped: !!user.twoFactorSkipped
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

router.post('/2fa/setup', authenticate, async (req: AuthRequest, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `Insta Coach (${req.user!.id})` });
    await db.run('UPDATE users SET two_factor_secret = ? WHERE id = ?', secret.base32, req.user!.id);
    
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);
    res.json({ qrCode: qrCodeUrl, secret: secret.base32 });
  } catch (err) {
    res.status(500).json({ message: '2FA setup error' });
  }
});

router.post('/2fa/verify', authenticate, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body;
    const user = await db.get('SELECT two_factor_secret FROM users WHERE id = ?', req.user!.id);
    
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      await db.run('UPDATE users SET two_factor_enabled = 1 WHERE id = ?', req.user!.id);
      res.json({ success: true });
    } else {
      res.status(400).json({ message: 'Invalid token' });
    }
  } catch (err) {
    res.status(500).json({ message: '2FA verification error' });
  }
});

router.post('/2fa/skip', authenticate, async (req: AuthRequest, res) => {
  try {
    await db.run('UPDATE users SET two_factor_skipped = 1 WHERE id = ?', req.user!.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: '2FA skip error' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.get('SELECT id, name, email, role, avatar, xp, level, onboarding_complete, streak FROM users WHERE id = ?', req.user!.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ ...user, onboardingComplete: !!user.onboardingComplete });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/refresh', authenticate, (req: AuthRequest, res: Response) => {
  const token = jwt.sign({ id: req.user!.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  res.json({ token });
});

router.post('/logout', (_req, res: Response) => {
  res.json({ message: 'Logged out' });
});

export default router;
