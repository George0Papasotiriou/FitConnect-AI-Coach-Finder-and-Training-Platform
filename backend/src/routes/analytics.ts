/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Analytics agent HTTP routes.
 */

import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  generateEditorialBriefing,
  generateSuggestions,
  getUserContextFor,
  resetConversation,
  runAnalyticsQuery,
  type LockedContext,
} from '../services/analytics.js';

const router = Router();

router.post('/query', authenticate, async (req: AuthRequest, res) => {
  try {
    const { question, conversationId, lockedContext } = req.body as {
      question?: string;
      conversationId?: string;
      lockedContext?: LockedContext | null;
    };

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ message: 'question is required' });
    }
    if (!conversationId || typeof conversationId !== 'string') {
      return res.status(400).json({ message: 'conversationId is required' });
    }
    if (question.length > 1000) {
      return res.status(400).json({ message: 'question too long' });
    }

    const ctx = await getUserContextFor(req.user!.id);
    const result = await runAnalyticsQuery(req.user!.id, ctx.role, {
      question,
      conversationId,
      lockedContext: lockedContext ?? null,
    });
    res.json(result);
  } catch (err: any) {
    console.error('[analytics:/query]', err);
    res.status(500).json({ message: 'Analytics query failed.' });
  }
});

router.get('/suggestions', authenticate, async (req: AuthRequest, res) => {
  try {
    const conversationId = (req.query.conversationId as string | undefined) ?? '';
    const lockedRaw = req.query.lockedContext as string | undefined;
    let locked: LockedContext | null = null;
    if (lockedRaw) {
      try {
        locked = JSON.parse(lockedRaw) as LockedContext;
      } catch {
        // ignore — treat as no locked context
      }
    }
    const ctx = await getUserContextFor(req.user!.id);
    const suggestions = await generateSuggestions(ctx.role, conversationId, locked);
    res.json({ suggestions });
  } catch (err) {
    console.error('[analytics:/suggestions]', err);
    res.status(500).json({ message: 'Suggestions failed.' });
  }
});

router.post('/conversations/:id/reset', authenticate, async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  resetConversation(id);
  res.json({ ok: true });
});

router.post('/editorial', authenticate, async (req: AuthRequest, res) => {
  try {
    const { conversationId } = req.body as { conversationId?: string };
    if (!conversationId || typeof conversationId !== 'string') {
      return res.status(400).json({ message: 'conversationId is required' });
    }
    const ctx = await getUserContextFor(req.user!.id);
    const result = await generateEditorialBriefing(conversationId, ctx.role);
    if (result.status === 'needs_more_charts') {
      return res.status(422).json({ ...result });
    }
    if (result.status === 'error') {
      return res.status(500).json({ ...result });
    }
    res.json(result);
  } catch (err) {
    console.error('[analytics:/editorial]', err);
    res.status(500).json({ message: 'Editorial generation failed.' });
  }
});

export default router;
