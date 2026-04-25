import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { processVoiceCommand, getMotivationalQuote, getWorkoutSuggestion, getDietaryTip, getFormTip, getAIResponse, getAIChatResponse } from '../services/ai.js';
import db from '../db.js';

const router = Router();

// In-memory cache for link previews (1 hour TTL)
const linkPreviewCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

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

// Link preview endpoint
router.get('/link-preview', authenticate, async (req: AuthRequest, res) => {
  try {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ message: 'URL required' });

    // Check cache
    const cached = linkPreviewCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Fetch the URL
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Insta Coach-Bot/1.0' }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.json({ url, title: null, description: null, image: null, favicon: null });
      }

      const html = await response.text();
      const getMetaContent = (name: string): string | null => {
        const patterns = [
          new RegExp(`<meta[^>]*(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'),
          new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, 'i'),
        ];
        for (const pattern of patterns) {
          const match = html.match(pattern);
          if (match) return match[1];
        }
        return null;
      };

      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const parsedUrl = new URL(url);

      const data = {
        url,
        title: getMetaContent('og:title') || getMetaContent('twitter:title') || (titleMatch ? titleMatch[1].trim() : null),
        description: getMetaContent('og:description') || getMetaContent('twitter:description') || getMetaContent('description'),
        image: getMetaContent('og:image') || getMetaContent('twitter:image'),
        favicon: `${parsedUrl.protocol}//${parsedUrl.hostname}/favicon.ico`
      };

      // Resolve relative image URLs
      if (data.image && !data.image.startsWith('http')) {
        data.image = new URL(data.image, url).href;
      }

      // Cache the result
      linkPreviewCache.set(url, { data, timestamp: Date.now() });

      res.json(data);
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      res.json({ url, title: null, description: null, image: null, favicon: null });
    }
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

// AI Program Generation
router.post('/generate-program', authenticate, async (req: AuthRequest, res) => {
  try {
    const { goals, fitnessLevel, daysPerWeek, focusAreas } = req.body;

    const prompt = `Generate a weekly workout program as JSON with this structure:
{
  "name": "program name",
  "description": "brief description",
  "days": [
    {
      "dayOfWeek": "Monday",
      "exercises": [
        { "name": "Exercise Name", "category": "category", "sets": 3, "reps": 10, "notes": "optional notes" }
      ]
    }
  ]
}

User profile:
- Goals: ${goals?.join(', ') || 'general fitness'}
- Fitness Level: ${fitnessLevel || 'intermediate'}
- Days per week: ${daysPerWeek || 4}
- Focus areas: ${focusAreas?.join(', ') || 'full body'}

Categories must be one of: Chest, Back, Legs, Shoulders, Arms, Core, Cardio, Sport, Flexibility.
Include 4-6 exercises per day. Make it realistic and progressive.
Return ONLY valid JSON, no markdown or additional text.`;

    const response = await getAIResponse(prompt, 'You are an expert personal trainer. Generate structured workout programs. Return ONLY valid JSON.');

    try {
      // Try to parse the response as JSON
      let cleanedResponse = response.trim();
      // Remove markdown code fences if present
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const program = JSON.parse(cleanedResponse);
      res.json(program);
    } catch (parseErr) {
      // If parsing fails, return a default program
      res.json({
        name: `${fitnessLevel || 'Custom'} Training Program`,
        description: `A ${daysPerWeek || 4}-day program focused on ${focusAreas?.join(', ') || 'general fitness'}`,
        days: [
          {
            dayOfWeek: 'Monday',
            exercises: [
              { name: 'Bench Press', category: 'Chest', sets: 4, reps: 10, notes: 'Warm up with lighter weight' },
              { name: 'Incline Dumbbell Press', category: 'Chest', sets: 3, reps: 12 },
              { name: 'Cable Flyes', category: 'Chest', sets: 3, reps: 15 },
              { name: 'Tricep Dips', category: 'Arms', sets: 3, reps: 12 },
              { name: 'Overhead Tricep Extension', category: 'Arms', sets: 3, reps: 12 },
            ]
          },
          {
            dayOfWeek: 'Wednesday',
            exercises: [
              { name: 'Pull-ups', category: 'Back', sets: 4, reps: 8, notes: 'Use assistance if needed' },
              { name: 'Barbell Row', category: 'Back', sets: 4, reps: 10 },
              { name: 'Lat Pulldown', category: 'Back', sets: 3, reps: 12 },
              { name: 'Barbell Curl', category: 'Arms', sets: 3, reps: 12 },
              { name: 'Hammer Curls', category: 'Arms', sets: 3, reps: 12 },
            ]
          },
          {
            dayOfWeek: 'Friday',
            exercises: [
              { name: 'Squats', category: 'Legs', sets: 4, reps: 10, notes: 'Focus on depth' },
              { name: 'Romanian Deadlift', category: 'Legs', sets: 4, reps: 10 },
              { name: 'Leg Press', category: 'Legs', sets: 3, reps: 12 },
              { name: 'Calf Raises', category: 'Legs', sets: 4, reps: 15 },
              { name: 'Plank', category: 'Core', sets: 3, reps: 60, notes: '60 seconds each' },
            ]
          },
          {
            dayOfWeek: 'Saturday',
            exercises: [
              { name: 'Overhead Press', category: 'Shoulders', sets: 4, reps: 10 },
              { name: 'Lateral Raises', category: 'Shoulders', sets: 3, reps: 15 },
              { name: 'Face Pulls', category: 'Shoulders', sets: 3, reps: 15 },
              { name: 'Russian Twists', category: 'Core', sets: 3, reps: 20 },
              { name: 'Jump Rope', category: 'Cardio', sets: 3, reps: 60, notes: '60 seconds each' },
            ]
          }
        ]
      });
    }
  } catch (err) {
    console.error('AI generate program error:', err);
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

    const systemPrompt = `You are Insta Coach AI, a knowledgeable, friendly fitness and wellness coach. ${userContext}
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
