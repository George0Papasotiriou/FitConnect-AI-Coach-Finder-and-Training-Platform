/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

/**
 * AbiliFit — AI-Powered Fitness & Coach Finder Platform
 * Copyright © 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * File: auth.ts (routes)
 * Created: 2026-05-14
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import db from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Rate limiting for login attempts (in-memory)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 10;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(email: string): boolean {
  const record = loginAttempts.get(email);
  if (!record) return true;
  if (Date.now() - record.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(email);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordAttempt(email: string) {
  const record = loginAttempts.get(email);
  if (record) {
    record.count++;
    record.lastAttempt = Date.now();
  } else {
    loginAttempts.set(email, { count: 1, lastAttempt: Date.now() });
  }
}

function clearAttempts(email: string) {
  loginAttempts.delete(email);
}

// ── Register ──
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

// ── Login ──
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    // Rate limiting
    if (!checkRateLimit(email)) {
      return res.status(429).json({ message: 'Too many login attempts. Please wait 15 minutes before trying again.' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    if (!user) {
      recordAttempt(email);
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.isBanned) return res.status(403).json({ message: 'Account is suspended' });

    const valid = await bcrypt.compare(password, user.password as string);
    if (!valid) {
      recordAttempt(email);
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Clear rate limit on successful login
    clearAttempts(email);

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

// ── 2FA Setup ──
router.post('/2fa/setup', authenticate, async (req: AuthRequest, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `AbiliFit (${req.user!.email})` });
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

// ── Password Reset Flow ──
const resetTokens = new Map<string, { userId: string; expires: number }>();

router.post('/forgot-password', async (req, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email required' });

    const user = await db.get('SELECT id, two_factor_enabled, two_factor_secret FROM users WHERE email = ?', email);
    if (!user) return res.status(404).json({ message: 'No account found with this email address' });

    const has2FA = !!(user.twoFactorEnabled && user.twoFactorSecret);
    res.json({ has2FA });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-reset', async (req, res: Response) => {
  try {
    const { email, totpCode } = req.body;
    if (!email || !totpCode) return res.status(400).json({ message: 'Email and code required' });

    const user = await db.get('SELECT id, two_factor_secret FROM users WHERE email = ?', email);
    if (!user || !user.twoFactorSecret) return res.status(400).json({ message: 'Account not eligible for 2FA reset' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1
    });

    if (!verified) return res.status(400).json({ message: 'Invalid authenticator code. Please try again.' });

    const resetToken = uuid();
    resetTokens.set(resetToken, { userId: user.id, expires: Date.now() + 10 * 60 * 1000 });

    res.json({ resetToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', async (req, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(400).json({ message: 'Token and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const tokenData = resetTokens.get(resetToken);
    if (!tokenData) return res.status(400).json({ message: 'Invalid or expired reset token' });
    if (Date.now() > tokenData.expires) {
      resetTokens.delete(resetToken);
      return res.status(400).json({ message: 'Reset token has expired. Please start over.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.run('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', hashed, tokenData.userId);
    resetTokens.delete(resetToken);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Auth Info ──
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
