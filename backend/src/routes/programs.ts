/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { createNotification } from '../services/gamification.js';

const router = Router();

// Get all programs for the current user
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const programs = await db.all('SELECT * FROM training_programs WHERE user_id = ? ORDER BY updated_at DESC', req.user!.id);

    const result = await Promise.all(programs.map(async (prog: any) => {
      const days = await db.all('SELECT * FROM program_days WHERE program_id = ? ORDER BY day_date ASC', prog.id);
      const daysWithExercises = await Promise.all(days.map(async (day: any) => {
        const exercises = await db.all('SELECT * FROM program_exercises WHERE day_id = ? ORDER BY sort_order ASC', day.id);
        return { ...day, exercises };
      }));
      return { ...prog, days: daysWithExercises };
    }));

    res.json(result);
  } catch (err) {
    console.error('Get programs error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single program
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    // Check if user is owner
    let program = await db.get('SELECT * FROM training_programs WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    
    // If not owner, check if user is a trainee of the program's owner
    if (!program) {
      const progOwner = await db.get('SELECT user_id FROM training_programs WHERE id = ?', req.params.id);
      if (progOwner) {
        const isTrainee = await db.get('SELECT id FROM trainee_profiles WHERE user_id = ? AND current_coach_id = ?', req.user!.id, progOwner.userId);
        if (isTrainee) {
          program = await db.get('SELECT * FROM training_programs WHERE id = ?', req.params.id);
        }
      }
    }

    if (!program) return res.status(404).json({ message: 'Program not found or access denied' });

    const days = await db.all('SELECT * FROM program_days WHERE program_id = ? ORDER BY day_date ASC', program.id);
    const daysWithExercises = await Promise.all(days.map(async (day: any) => {
      const exercises = await db.all('SELECT * FROM program_exercises WHERE day_id = ? ORDER BY sort_order ASC', day.id);
      return { ...day, exercises };
    }));

    res.json({ ...program, days: daysWithExercises });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create program
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;
    const id = uuid();
    await db.run('INSERT INTO training_programs (id, user_id, name, description) VALUES (?, ?, ?, ?)',
      id, req.user!.id, name || 'My Program', description || '');
    const program = await db.get('SELECT * FROM training_programs WHERE id = ?', id);
    res.json({ ...program, days: [] });
  } catch (err) {
    console.error('Create program error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update program (including days and exercises)
router.put('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const program = await db.get('SELECT * FROM training_programs WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    if (!program) return res.status(404).json({ message: 'Program not found' });

    const { name, description, days } = req.body;

    if (name !== undefined) await db.run('UPDATE training_programs SET name = ?, updated_at = NOW() WHERE id = ?', name, req.params.id);
    if (description !== undefined) await db.run('UPDATE training_programs SET description = ?, updated_at = NOW() WHERE id = ?', description, req.params.id);

    if (days) {
      // Delete existing days and exercises
      const existingDays = await db.all('SELECT id FROM program_days WHERE program_id = ?', req.params.id);
      for (const day of existingDays) {
        await db.run('DELETE FROM program_exercises WHERE day_id = ?', day.id);
      }
      await db.run('DELETE FROM program_days WHERE program_id = ?', req.params.id);

      // Insert new days and exercises
      for (const day of days) {
        const dayId = uuid();
        await db.run('INSERT INTO program_days (id, program_id, day_date, notes) VALUES (?, ?, ?, ?)',
          dayId, req.params.id, day.dayDate, day.notes || '');

        for (const exercise of (day.exercises || [])) {
          await db.run(
            'INSERT INTO program_exercises (id, day_id, exercise_name, exercise_category, sets, reps, duration, weight, notes, video_url, sort_order, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            uuid(), dayId, exercise.exerciseName, exercise.exerciseCategory,
            exercise.sets || 3, exercise.reps || 10, exercise.duration || null,
            exercise.weight || null, exercise.notes || '', exercise.videoUrl || null,
            exercise.sortOrder || 0, exercise.isCustom ? 1 : 0
          );
        }
      }
    }

    // Fetch updated program
    const updated = await db.get('SELECT * FROM training_programs WHERE id = ?', req.params.id);
    const updatedDays = await db.all('SELECT * FROM program_days WHERE program_id = ? ORDER BY day_date ASC', req.params.id);
    const result = await Promise.all(updatedDays.map(async (day: any) => {
      const exercises = await db.all('SELECT * FROM program_exercises WHERE day_id = ? ORDER BY sort_order ASC', day.id);
      return { ...day, exercises };
    }));

    res.json({ ...updated, days: result });
  } catch (err) {
    console.error('Update program error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Save a single day
router.post('/:id/days', authenticate, async (req: AuthRequest, res) => {
  try {
    const program = await db.get('SELECT * FROM training_programs WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    if (!program) return res.status(404).json({ message: 'Program not found' });

    const { dayDate, notes, exercises } = req.body;
    const dayId = uuid();
    await db.run('INSERT INTO program_days (id, program_id, day_date, notes) VALUES (?, ?, ?, ?)',
      dayId, req.params.id, dayDate, notes || '');

    for (const exercise of (exercises || [])) {
      await db.run(
        'INSERT INTO program_exercises (id, day_id, exercise_name, exercise_category, sets, reps, duration, weight, notes, video_url, sort_order, is_custom) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        uuid(), dayId, exercise.exerciseName, exercise.exerciseCategory,
        exercise.sets || 3, exercise.reps || 10, exercise.duration || null,
        exercise.weight || null, exercise.notes || '', exercise.videoUrl || null,
        exercise.sortOrder || 0, exercise.isCustom ? 1 : 0
      );
    }

    await db.run('UPDATE training_programs SET updated_at = NOW() WHERE id = ?', req.params.id);
    res.json({ id: dayId, dayDate, exercises });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a day
router.delete('/:id/days/:dayId', authenticate, async (req: AuthRequest, res) => {
  try {
    await db.run('DELETE FROM program_exercises WHERE day_id = ?', req.params.dayId);
    await db.run('DELETE FROM program_days WHERE id = ? AND program_id = ?', req.params.dayId, req.params.id);
    res.json({ message: 'Day deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete program
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const days = await db.all('SELECT id FROM program_days WHERE program_id = ?', req.params.id);
    for (const day of days) {
      await db.run('DELETE FROM program_exercises WHERE day_id = ?', day.id);
    }
    await db.run('DELETE FROM program_days WHERE program_id = ?', req.params.id);
    await db.run('DELETE FROM training_programs WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    res.json({ message: 'Program deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Share program with coach via chat
router.post('/:id/share', authenticate, async (req: AuthRequest, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId) return res.status(400).json({ message: 'Recipient ID required' });

    const program = await db.get('SELECT * FROM training_programs WHERE id = ? AND user_id = ?', req.params.id, req.user!.id);
    if (!program) return res.status(404).json({ message: 'Program not found' });

    const days = await db.all('SELECT * FROM program_days WHERE program_id = ? ORDER BY day_date ASC', req.params.id);
    const daysWithEx = await Promise.all(days.map(async (day: any) => {
      const exs = await db.all('SELECT * FROM program_exercises WHERE day_id = ? ORDER BY sort_order ASC', day.id);
      return { ...day, exercises: exs };
    }));

    // Find or create conversation with recipient
    let conversation = await db.get(`
      SELECT c.id FROM conversations c
      JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
      JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
    `, req.user!.id, recipientId);

    if (!conversation) {
      const convId = uuid();
      await db.run('INSERT INTO conversations (id) VALUES (?)', convId);
      await db.run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', convId, req.user!.id);
      await db.run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', convId, recipientId);
      conversation = { id: convId };
    }

    // Send as special program message
    const msgId = uuid();
    await db.run('INSERT INTO messages (id, conversation_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)',
      msgId, conversation.id, req.user!.id, JSON.stringify({ programId: program.id, name: program.name }), 'program');
    await db.run('UPDATE conversations SET updated_at = NOW() WHERE id = ?', conversation.id);

    const message = await db.get('SELECT m.*, u.name as sender_name, u.avatar as sender_avatar FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = ?', msgId);
    const io = req.app.get('io');
    if (io) {
      io.to(`conv:${conversation.id}`).emit('new_message', message);
    }

    // Notify recipient
    await createNotification(recipientId, 'message', '📋 Training Program Shared',
      `${req.user!.name} shared a workout program: ${program.name}`, `/chat/${conversation.id}`);

    res.json({ message: 'Program shared', conversationId: conversation.id });
  } catch (err) {
    console.error('Share program error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
