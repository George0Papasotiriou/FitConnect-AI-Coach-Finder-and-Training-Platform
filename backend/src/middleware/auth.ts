/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'trainee' | 'trainer' | 'admin';
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await db.get('SELECT id, name, email, role, is_banned FROM users WHERE id = ?', payload.id);
    if (!user) { 
      console.warn('🔓 Auth: User not found for ID:', payload.id);
      res.status(401).json({ message: 'User not found' }); 
      return; 
    }
    if (user.isBanned) { 
      console.warn('Locked Auth: User is banned:', user.id);
      res.status(403).json({ message: 'Account is suspended' }); 
      return; 
    }
    console.log(`🔐 Auth: Success for ${user.name} (${user.role})`);
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err: any) {
    console.error('🔓 Auth: Failed with error:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
