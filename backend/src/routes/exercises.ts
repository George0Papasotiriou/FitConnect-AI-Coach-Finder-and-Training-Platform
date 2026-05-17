/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// POST /api/exercises/rate — Upsert a user's rating for an exercise
router.post('/rate', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { exerciseId, rating } = req.body;

    if (!exerciseId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'exerciseId and rating (1-5) are required' });
    }

    const id = uuidv4();
    await db.run(
      `INSERT INTO exercise_ratings (id, user_id, exercise_id, rating, created_at, updated_at)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON CONFLICT (user_id, exercise_id)
       DO UPDATE SET rating = ?, updated_at = NOW()`,
      id, userId, exerciseId, rating, rating
    );

    // Get updated aggregate
    const agg = await db.get(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as total_ratings
       FROM exercise_ratings WHERE exercise_id = ?`,
      exerciseId
    );

    res.json({
      exerciseId,
      userRating: rating,
      avgRating: parseFloat(parseFloat(agg?.avgRating || rating).toFixed(1)),
      totalRatings: parseInt(agg?.totalRatings || '1'),
    });
  } catch (err: any) {
    console.error('❌ Rate exercise error:', err);
    res.status(500).json({ message: 'Failed to rate exercise' });
  }
});

// GET /api/exercises/ratings — Return all exercise ratings + current user's ratings
router.get('/ratings', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Aggregated ratings per exercise
    const aggregates = await db.all(
      `SELECT exercise_id, AVG(rating) as avg_rating, COUNT(*) as total_ratings
       FROM exercise_ratings GROUP BY exercise_id`
    );

    // Current user's ratings
    const userRatings = await db.all(
      `SELECT exercise_id, rating FROM exercise_ratings WHERE user_id = ?`,
      userId
    );

    const ratings: Record<string, { avg: number; count: number; userRating: number | null }> = {};

    for (const agg of aggregates) {
      ratings[agg.exerciseId] = {
        avg: parseFloat(parseFloat(agg.avgRating).toFixed(1)),
        count: parseInt(agg.totalRatings),
        userRating: null,
      };
    }

    for (const ur of userRatings) {
      if (ratings[ur.exerciseId]) {
        ratings[ur.exerciseId].userRating = ur.rating;
      } else {
        ratings[ur.exerciseId] = { avg: ur.rating, count: 1, userRating: ur.rating };
      }
    }

    res.json({ ratings });
  } catch (err: any) {
    console.error('❌ Get ratings error:', err);
    res.status(500).json({ message: 'Failed to get ratings' });
  }
});

export default router;
