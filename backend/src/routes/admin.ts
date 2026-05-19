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
import { getAIResponse } from '../services/ai.js';
import crypto from 'crypto';

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

// ─── SQL SAFETY VALIDATOR ───
function isSqlSafe(sql: string): boolean {
  const clean = sql.toLowerCase().trim();
  const dangerousKeywords = [
    'drop', 'delete', 'update', 'insert', 'alter', 'create', 'truncate', 
    'grant', 'revoke', 'replace', 'upsert', 'merge', 'schema', 'dbcc', 'system'
  ];
  return !dangerousKeywords.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    return regex.test(clean);
  });
}

// ─── GET DB METADATA FOR FEW-SHOTS ───
const SYSTEM_ANALYTICS_CONTEXT = `You are the master database analyst and natural-language-to-SQL converter for the AbiliFit Fitness & Training platform.
The database is PostgreSQL. Here is the database schema:

1. **users**:
   - id: TEXT (primary key)
   - name: TEXT
   - email: TEXT
   - role: TEXT ('trainee', 'trainer', 'admin')
   - xp: INTEGER
   - level: INTEGER
   - streak: INTEGER
   - is_banned: INTEGER (0 or 1)
   - created_at: TIMESTAMP

2. **trainer_profiles**:
   - id: TEXT (primary key)
   - user_id: TEXT (foreign key to users.id)
   - bio: TEXT
   - specialties: TEXT (JSON array of strings, e.g., ["Strength", "Yoga"])
   - experience: INTEGER (years)
   - hourly_rate: REAL
   - rating: REAL
   - total_reviews: INTEGER
   - balance: REAL (trainer wallet earnings)
   - application_status: TEXT ('pending', 'approved', 'rejected')

3. **trainee_profiles**:
   - id: TEXT (primary key)
   - user_id: TEXT (foreign key to users.id)
   - age: INTEGER
   - weight: REAL (kg)
   - height: REAL (cm)
   - fitness_level: TEXT ('beginner', 'intermediate', 'advanced')
   - goals: TEXT (JSON array of strings)

4. **sessions**:
   - id: TEXT (primary key)
   - trainer_id: TEXT (foreign key to users.id)
   - trainee_id: TEXT (foreign key to users.id)
   - type: TEXT ('video', 'audio', 'in-person')
   - status: TEXT ('scheduled', 'active', 'completed', 'cancelled')
   - scheduled_at: TIMESTAMP
   - duration: INTEGER (minutes)

5. **reviews**:
   - id: TEXT (primary key)
   - session_id: TEXT (foreign key to sessions.id)
   - reviewer_id: TEXT
   - reviewee_id: TEXT
   - rating: INTEGER (1-5)
   - comment: TEXT

6. **billing_history**:
   - id: TEXT (primary key)
   - user_id: TEXT (foreign key to users.id)
   - amount: REAL
   - type: TEXT ('subscription', 'payment', 'withdrawal')
   - payment_method: TEXT
   - created_at: TIMESTAMP

**YOUR TASK:**
Given the user's natural language question, output a clean, read-only PostgreSQL query to answer it, along with a corresponding chart specification for Recharts.
Your response MUST be a single, strictly valid JSON object matching this schema exactly:
{
  "sql": "SELECT ...",
  "chartType": "pie" | "bar" | "line" | "kpi" | "table",
  "title": "Chart Title",
  "description": "Brief description of findings",
  "xAxisKey": "column_name_for_categories",
  "series": [
    { "key": "column_name_for_values", "name": "Human Readable Label", "color": "#a78bfa" }
  ],
  "explanation": "A 1-2 sentence professional narration summarizing the headline insights from the data."
}

**RULES:**
- For KPI chartType, xAxisKey can be empty, and series should target the calculated aggregate value.
- For pie chartType, series should target the value column, and xAxisKey represents the category slices.
- Do NOT wrap the JSON inside markdown code blocks. Return ONLY the raw JSON string.
- If a query requires joining, join users with trainer_profiles or trainee_profiles via user_id.
- ALWAYS use valid PostgreSQL syntax (e.g., NOW() instead of date('now')).`;


router.post('/analytics/query', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  const start = Date.now();
  try {
    const { question, conversationId } = req.body;
    if (!question) return res.status(400).json({ message: 'Question is required' });

    // 1. Generate SQL and Spec via Gemini
    const aiResponse = await getAIResponse(
      `Generate SQL and spec to answer: "${question}"`,
      SYSTEM_ANALYTICS_CONTEXT
    );

    let parsed: any;
    try {
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      return res.status(500).json({ 
        message: 'AI did not return a valid analytical spec. Please refine your query.' 
      });
    }

    const { sql, chartType, title, description, xAxisKey, series, explanation } = parsed;
    
    // 2. Safety Validation
    if (!sql || !isSqlSafe(sql)) {
      console.warn('❌ SQL Safety block triggered for query:', sql);
      return res.json({
        clarificationQuestion: 'I identified a query pattern that might compromise database integrity or privacy. Let\'s try asking about user metrics, role counts, or booking statistics instead!',
        spec: { chartType: 'table', title: 'Action Cancelled', sql: '', config: { series: [] } },
        data: [],
        explanation: 'Query blocked for safety.'
      });
    }

    // 3. Execute query
    let rows: any[] = [];
    try {
      rows = await db.all(sql);
    } catch (dbErr: any) {
      console.error('Database query execution error:', dbErr.message);
      return res.json({
        clarificationQuestion: `I generated the PostgreSQL query: "${sql}" but it returned a syntax error: "${dbErr.message}". Let\'s try rephrasing the question!`,
        spec: { chartType: 'table', title: 'Execution Error', sql, config: { series: [] } },
        data: [],
        explanation: 'Database query compilation error.'
      });
    }

    const latency = Date.now() - start;

    // 4. Return conforming payload
    res.json({
      spec: {
        chartType,
        title,
        description,
        config: {
          xAxisKey,
          series: series || []
        },
        sql
      },
      data: rows,
      explanation,
      metadata: {
        latencyMs: latency,
        tokenCost: 0,
        sqlRetries: 0,
        conversationId: conversationId || crypto.randomUUID(),
        requestId: crypto.randomUUID()
      }
    });

  } catch (err: any) {
    console.error('Query analytics error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/analytics/reset', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    // Reset conversation log (stateless mock in this branch is sufficient since canvas handles charts state client side)
    res.json({ message: 'Conversation memory reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
