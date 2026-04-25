import OpenAI from 'openai';

const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const FALLBACK_MODELS = ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'mistralai/mistral-7b-instruct'];

function makeClient(apiKey: string) {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://fitconnect.app',
      'X-Title': 'Insta Coach',
    },
  });
}

const primaryClient = makeClient(process.env.OPENROUTER_API_KEY || '');
const fallbackClient = makeClient(process.env.OPENROUTER_API_KEY_FALLBACK || process.env.OPENROUTER_API_KEY || '');

async function callAI(messages: any[], maxTokens = 400, temperature = 0.7): Promise<string> {
  const models = [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)];
  const clients = [primaryClient, fallbackClient];

  for (const client of clients) {
    for (const model of models) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        });
        const content = completion.choices[0]?.message?.content;
        if (content) return content;
      } catch (err: any) {
        const msg = err?.message || '';
        const isFatal = msg.includes('invalid_api_key') || msg.includes('Unauthorized');
        if (isFatal) break;
        continue;
      }
    }
  }
  return '';
}

const SYSTEM_PROMPT = `You are Insta Coach AI, a friendly and knowledgeable fitness assistant inside the Insta Coach coaching platform. You help users with:
- Navigating the app (finding coaches, settings, leaderboard, chat, etc.)
- Fitness advice, workout tips, form guidance
- Dietary and nutritional tips personalized to fitness goals
- Motivation and encouragement
- Accessibility assistance for users with special needs

When a user asks to navigate somewhere, respond with a JSON action. For example:
- "Go to search" → include action: { "type": "navigate", "payload": "/search" }
- "Find yoga coach" → include action: { "type": "search", "payload": "yoga" }
- "Show achievements" → include action: { "type": "navigate", "payload": "/achievements" }
- "Open chat" → include action: { "type": "navigate", "payload": "/chat" }
- "Go to settings" → include action: { "type": "navigate", "payload": "/settings" }
- "Show leaderboard" → include action: { "type": "navigate", "payload": "/leaderboard" }
- "AI trainer" → include action: { "type": "navigate", "payload": "/ai-trainer" }
- "I did 100 on bench for 5" → include action: { "type": "log_pr", "payload": { "exercise": "bench press", "weight": 100, "reps": 5 } }

Keep responses concise, warm, and encouraging. Use fitness-related emoji when appropriate.`;

export async function processVoiceCommand(transcript: string, context?: string): Promise<{ response: string; action?: { type: string; payload?: string } }> {
  try {
    const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (context) messages.push({ role: 'system', content: `User context: ${context}` });
    messages.push({ role: 'user', content: transcript });

    const raw = await callAI(messages, 300, 0.7);
    if (!raw) return { response: "I'm here to help! Could you say that again? 💪" };

    let response = raw;
    let action: { type: string; payload?: string } | undefined;

    const actionMatch = raw.match(/\{[\s\S]*?"type"[\s\S]*?\}/);
    if (actionMatch) {
      try {
        action = JSON.parse(actionMatch[0]);
        response = raw.replace(actionMatch[0], '').trim();
      } catch {}
    }

    return { response: response || "I'm on it! 💪", action };
  } catch (error) {
    console.error('AI voice error:', error);
    return { response: "I'm having a little trouble right now. Please try again! 💪" };
  }
}

export async function getAIResponse(prompt: string, systemContext: string): Promise<string> {
  try {
    const result = await callAI(
      [{ role: 'system', content: systemContext }, { role: 'user', content: prompt }],
      500,
      0.8
    );
    return result;
  } catch (error) {
    console.error('AI response error:', error);
    return '';
  }
}

export async function getAIChatResponse(message: string, history: { role: string; content: string }[], systemContext: string): Promise<string> {
  try {
    const messages: any[] = [{ role: 'system', content: systemContext }];
    for (const h of history.slice(-10)) {
      messages.push({ role: h.role as 'user' | 'assistant', content: h.content });
    }
    messages.push({ role: 'user', content: message });
    const result = await callAI(messages, 600, 0.75);
    return result || "I'm here to help with your fitness journey! Could you rephrase that?";
  } catch (error) {
    console.error('AI chat error:', error);
    return "I'm having trouble connecting right now. Please try again!";
  }
}

export async function getMotivationalQuote(): Promise<{ quote: string; author: string }> {
  try {
    const raw = await callAI(
      [
        { role: 'system', content: 'Generate a single motivational fitness quote. Respond ONLY in JSON format: {"quote": "...", "author": "..."}. Use real or fictional attributions. Keep it inspiring and fitness-related.' },
        { role: 'user', content: 'Give me a motivational fitness quote.' },
      ],
      100,
      1.0
    );
    if (raw) {
      const match = raw.match(/\{[\s\S]*?\}/);
      if (match) return JSON.parse(match[0]);
    }
  } catch {}
  const fallbacks = [
    { quote: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { quote: "Every champion was once a contender who refused to give up.", author: "Rocky Balboa" },
    { quote: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { quote: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export async function getWorkoutSuggestion(goals?: string[], fitnessLevel?: string): Promise<string> {
  const context = `Generate a quick workout suggestion${goals?.length ? ` for someone focused on: ${goals.join(', ')}` : ''}${fitnessLevel ? ` at ${fitnessLevel} level` : ''}. Keep it to 2-3 exercises with sets/reps. Be concise and enthusiastic.`;
  const result = await getAIResponse('Give me a workout idea for today', context);
  return result || 'Try 3 sets of 10 squats, 15 push-ups, and a 30-second plank! 💪';
}

export async function getDietaryTip(goals?: string[]): Promise<string> {
  const context = `Give a single actionable dietary tip${goals?.length ? ` for someone focused on: ${goals.join(', ')}` : ''}. Be specific, practical, and encouraging. Keep it to 1-2 sentences.`;
  const result = await getAIResponse('Give me a nutrition tip', context);
  return result || 'Try adding a serving of lean protein to every meal to support muscle recovery! 🥗';
}

export async function getFormTip(exercise: string): Promise<string> {
  const context = `Give a brief form tip for the exercise: ${exercise}. Focus on the most common mistake and how to fix it. 1-2 sentences max.`;
  const result = await getAIResponse(`Form tip for ${exercise}`, context);
  return result || 'Focus on controlled movements and proper breathing throughout the exercise.';
}
