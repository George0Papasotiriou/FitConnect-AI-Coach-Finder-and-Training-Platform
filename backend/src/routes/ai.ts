import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { processVoiceCommand, getMotivationalQuote, getWorkoutSuggestion, getDietaryTip, getFormTip, getAIResponse, getAIChatResponse } from '../services/ai.js';
import db from '../db.js';

const router = Router();

router.post('/voice', authenticate, async (req: AuthRequest, res) => {
  try {
    const { transcript, context } = req.body;
    if (!transcript) return res.status(400).json({ message: 'Transcript required' });

    const user = await db.get('SELECT name, role, level FROM users WHERE id = ?', req.user!.id);
    let userContext = `User: ${user?.name}, Role: ${user?.role}, Level: ${user?.level}`;
    if (context) userContext += `. Current page: ${context}`;

    const result = await processVoiceCommand(transcript, userContext);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/quote', authenticate, async (_req, res) => {
  try {
    const result = await getMotivationalQuote();
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/workout-suggestion', authenticate, async (req: AuthRequest, res) => {
  try {
    const profile = await db.get('SELECT goals, fitness_level FROM trainee_profiles WHERE user_id = ?', req.user!.id);
    const goals = profile ? JSON.parse(profile.goals || '[]') : [];
    const suggestion = await getWorkoutSuggestion(goals, profile?.fitnessLevel);
    res.json({ suggestion });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/dietary-tip', authenticate, async (req: AuthRequest, res) => {
  try {
    const profile = await db.get('SELECT goals FROM trainee_profiles WHERE user_id = ?', req.user!.id);
    const goals = profile ? JSON.parse(profile.goals || '[]') : [];
    const tip = await getDietaryTip(goals);
    res.json({ tip });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/form-tip/:exercise', authenticate, async (req: AuthRequest, res) => {
  try {
    const tip = await getFormTip(req.params.exercise as string);
    res.json({ tip });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/coach-match', authenticate, async (req: AuthRequest, res) => {
  try {
    const { goals, fitnessLevel, preferences } = req.body;
    const trainers = await db.all(`SELECT tp.*, u.name FROM trainer_profiles tp JOIN users u ON tp.user_id = u.id WHERE tp.application_status = 'approved' AND tp.is_available = 1 ORDER BY tp.rating DESC LIMIT 10`);

    const trainerList = trainers.map((t: any) => `${t.name}: ${t.bio} (Specialties: ${JSON.parse(t.specialties || '[]').join(', ')}, Rating: ${t.rating})`).join('\n');

    const prompt = `Based on these user preferences:
  Goals: ${goals?.join(', ')}
  Fitness Level: ${fitnessLevel}
  Preferences: ${preferences}

  Recommend the top 3 coaches from this list and explain why:
  ${trainerList}`;

    const recommendation = await getAIResponse(prompt, 'You are a fitness matchmaking AI. Recommend coaches based on user needs. Be concise.');
    res.json({ recommendation });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/chat', authenticate, async (req: AuthRequest, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ message: 'Message required' });

    const user = await db.get('SELECT name, role FROM users WHERE id = ?', req.user!.id);
    const profile = await db.get('SELECT goals, fitness_level FROM trainee_profiles WHERE user_id = ?', req.user!.id);
    const goals = profile ? JSON.parse(profile.goals || '[]') : [];
    const userContext = `User: ${user?.name}. Goals: ${goals.join(', ') || 'not set'}. Fitness level: ${profile?.fitnessLevel || 'not set'}.`;

    const systemPrompt = `You are FitConnect AI, a knowledgeable, friendly fitness and wellness coach. ${userContext}
Help with: fitness plans, workout tips, nutrition advice, recovery strategies, motivation, injury prevention, and app features.
Be warm, specific, and encouraging. Format responses clearly with bullet points where helpful.
For medical issues, always recommend consulting a healthcare professional.`;

    const response = await getAIChatResponse(message, history, systemPrompt);
    res.json({ response });
  } catch (err) {
    console.error('AI chat route error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
