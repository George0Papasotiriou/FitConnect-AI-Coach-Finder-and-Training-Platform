import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
<<<<<<< HEAD
import { analyzeFormImages } from '../services/ai.js';
=======
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff

const router = Router();

// Get strength history
router.get('/history', authenticate, async (req: any, res) => {
  try {
    const history = await db.all(
      'SELECT * FROM strength_history WHERE user_id = ? ORDER BY created_at DESC',
      req.user.id
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Log a new strength record (also updates muscle fatigue estimation)
router.post('/log', authenticate, async (req: any, res) => {
  const { exercise, weight, reps, muscleGroup } = req.body;
  
  if (!exercise || !weight || !reps || !muscleGroup) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const id = uuidv4();
    await db.run(
      'INSERT INTO strength_history (id, user_id, exercise, weight, reps, muscle_group) VALUES (?, ?, ?, ?, ?, ?)',
      id, req.user.id, exercise, weight, reps, muscleGroup
    );

    // Update user XP for logging a record
    await db.run('UPDATE users SET xp = xp + 20 WHERE id = ?', req.user.id);

    res.json({ id, message: 'Record logged successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log record' });
  }
});

// AI Form Analysis
router.post('/analyze-form', authenticate, async (req: any, res) => {
<<<<<<< HEAD
  const { videoUrl, type, images } = req.body;
  
  try {
    let score = 7.5;
    let feedback = ["Ensure steady pacing.", "Keep a neutral spine.", "Focus on breathing."];

    if (images && Array.isArray(images) && images.length > 0) {
      const result = await analyzeFormImages(images, type || 'exercise');
      score = result.score;
      feedback = result.feedback;
    } else {
      // Simulate AI analysis delay
      score = Math.random() * 3 + 7; // 7-10 score
      feedback = [
        "Keep your back straighter during the bottom phase.",
        "Great depth on your squats!",
        "Engage your core more to increase stability."
      ];
    }
=======
  const { videoUrl, type } = req.body;
  
  try {
    // Simulate AI analysis delay
    const score = Math.random() * 3 + 7; // 7-10 score
    const feedback = [
      "Keep your back straighter during the bottom phase.",
      "Great depth on your squats!",
      "Engage your core more to increase stability."
    ];
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff

    const id = uuidv4();
    await db.run(
      'INSERT INTO form_analysis (id, user_id, video_url, feedback_json, score) VALUES (?, ?, ?, ?, ?)',
<<<<<<< HEAD
      id, req.user.id, videoUrl || 'vision_upload', JSON.stringify(feedback), score
=======
      id, req.user.id, videoUrl, JSON.stringify(feedback), score
>>>>>>> 28ad2278a7bf82835d1bd4cd03e2cc8facff4fff
    );

    res.json({ id, score, feedback });
  } catch (error) {
    res.status(500).json({ error: 'Simulation failed' });
  }
});

export default router;
