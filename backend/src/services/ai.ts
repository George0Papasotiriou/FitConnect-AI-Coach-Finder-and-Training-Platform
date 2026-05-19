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
 * File: ai.ts (service)
 * Created: 2026-05-14
 */

import OpenAI from 'openai';

const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const FALLBACK_MODELS = ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'mistralai/mistral-7b-instruct'];

// 30-second timeout so requests never hang indefinitely
const CLIENT_TIMEOUT_MS = 30_000;

function maskKey(key: string): string {
  if (!key || key.length < 8) return '(empty)';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

function makeOpenRouterClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    timeout: CLIENT_TIMEOUT_MS,
    defaultHeaders: {
      'HTTP-Referer': 'https://fitconnect.app',
      'X-Title': 'AbiliFit',
    },
  });
}

// ── Startup validation ────────────────────────────────────────────────────────
const primaryKey = process.env.OPENROUTER_API_KEY || '';
const fallbackKey = process.env.OPENROUTER_API_KEY_FALLBACK || '';

if (!primaryKey) {
  console.warn('⚠️  [AI] OPENROUTER_API_KEY is not set — AI features will not work!');
} else {
  console.log(`✅ [AI] Primary key loaded: ${maskKey(primaryKey)}`);
}
if (fallbackKey && fallbackKey !== primaryKey) {
  console.log(`✅ [AI] Fallback key loaded: ${maskKey(fallbackKey)}`);
}

// ── Clients — only instantiate keys that are actually configured ──────────────
const primaryClient = makeOpenRouterClient(primaryKey);

// Build the ordered list of {client, models} pairs.
// Only include a fallback entry when its key is set AND differs from the primary
// so we don't waste time retrying the same key twice.
const fallbackKeysAndModels: { client: OpenAI; models: string[] }[] = [
  { client: primaryClient, models: [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)] },
];

if (fallbackKey && fallbackKey !== primaryKey) {
  fallbackKeysAndModels.push({
    client: makeOpenRouterClient(fallbackKey),
    models: [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)],
  });
}

// NOTE: Gemini requires the @google/generative-ai SDK, not the OpenAI SDK.
// NVIDIA / ZAI / MiniMax / DeepSeek fallbacks are intentionally omitted here
// because those keys are not configured in Railway. Add them back only when
// the corresponding env vars are confirmed to be set.

export const exportedClientsForVision = fallbackKeysAndModels; // For analyzeFormImages

// ── Core AI caller ────────────────────────────────────────────────────────────
async function callAI(messages: any[], maxTokens = 400, temperature = 0.7): Promise<string> {
  for (const fallback of fallbackKeysAndModels) {
    for (const model of fallback.models) {
      try {
        const completion = await fallback.client.chat.completions.create({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        });
        const content = completion.choices[0]?.message?.content;
        if (content) return content;
      } catch (err: any) {
        const msg: string = err?.message || '';
        const status: number | undefined = err?.status;

        // Timeout — log and bail out of this key entirely
        if (err?.name === 'APIConnectionTimeoutError' || msg.includes('timed out') || msg.includes('timeout')) {
          console.error(`[AI] Request timed out (model=${model}, timeout=${CLIENT_TIMEOUT_MS}ms)`);
          break; // try next key, not next model on the same key
        }

        // Auth failure — this key is dead, skip remaining models for it
        if (status === 401 || msg.includes('invalid_api_key') || msg.includes('Unauthorized')) {
          console.error(`[AI] Auth failure for model=${model} — skipping key`);
          break;
        }

        // Rate-limited or server error — log and try next model
        console.warn(`[AI] Model ${model} failed (status=${status ?? 'unknown'}): ${msg.slice(0, 120)}`);
        continue;
      }
    }
  }
  return '';
}

const SYSTEM_PROMPT = `You are AbiliFit AI — a warm, eager, hands-on voice assistant for the AbiliFit platform.

Your job is to LISTEN to the user, then either DO what they asked (by emitting an action) or COACH them with a short, specific answer. After every action you take, ask a short, helpful follow-up question to keep the conversation moving.

# Conversational style
- Speak as if you're standing next to them. First-person, friendly, motivating.
- Default to one or two short sentences. Volunteer one helpful follow-up question at the end if it's natural ("Want me to start logging that?", "Should I pull up your progress next?").
- Never refuse a navigation/action request — if they want to go somewhere or do something, do it.
- When the user is mid-task, listen first. Do not interrupt unless asked.

# Available actions — emit at most ONE JSON object inside your reply
Navigation:
- "/trainee/dashboard"          (dashboard, home)
- "/progress-hub"               (my progress)
- "/programs"                   (my programs, workouts)
- "/ai-analytics"               (analytics, charts, data, stats over time)
- "/ai-trainer"                 (chat with AI trainer)
- "/bounties"                   (missions, bounties)
- "/map"                        (sweat map)
- "/virtual-gym"                (solo trainer, virtual gym)
- "/form-critic"                (form critic, check my form)
- "/recovery"                   (recovery dashboard)
- "/circadian"                  (circadian, sleep, metabolism)
- "/settings"
- "/leaderboard"
- "/chat"                       (messages)
- "/achievements"
- "/search"                     (find a coach)
- "/notifications"

Click / press a button on the current page:
{ "type": "click", "payload": "<button label or aria-label, exact or close>" }

Log a rep for an exercise during an active workout:
{ "type": "log_rep", "payload": { "exercise": "<name>", "reps": <number>, "weight": <number-or-null> } }

Switch the active exercise in the current workout:
{ "type": "switch_exercise", "payload": "<exercise name>" }

Start a timer:
{ "type": "start_timer", "payload": <seconds> }

Start the rep counter for an exercise:
{ "type": "rep_counter_start", "payload": "<exercise>" }

Send a message into the currently-open AI Trainer chat (only useful when the user is on /ai-trainer):
{ "type": "ai_chat_send", "payload": "<message text>" }

Search coaches:
{ "type": "search", "payload": "<query>" }

# Format
Return either:
1. A JSON object followed by your spoken response, OR
2. Just the spoken response if no action is needed.

Examples:
User: "Take me to my workouts"
You: { "type": "navigate", "payload": "/programs" } Heading to your programs now. Want me to start the first exercise too?

User: "Log a rep at 60 kilos"
You: { "type": "log_rep", "payload": { "exercise": "current", "reps": 1, "weight": 60 } } Logged. How did that one feel?

User: "Switch to squats"
You: { "type": "switch_exercise", "payload": "Squats" } Switching you over to squats. Want a quick form cue before you start?

User: "Show me my progress over the last month"
You: { "type": "navigate", "payload": "/ai-analytics" } Pulling up your analytics — I'll be there to chat through the numbers with you.

User: "How can I get stronger at squats?"
You: Three things matter most: depth, drive through the heels, and adding 2.5 kg every couple of sessions. Want me to set you up a four-week squat-focused block?

Always be eager and proactive. Never lecture.`;

export async function processVoiceCommand(transcript: string, context?: string, history?: { role: string; content: string }[]): Promise<{ response: string; action?: { type: string; payload?: any } }> {
  try {
    const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (context) messages.push({ role: 'system', content: `User context: ${context}` });
    
    if (history && history.length > 0) {
      for (const h of history.slice(-6)) {
        messages.push({ role: h.role, content: h.content });
      }
    }
    
    messages.push({ role: 'user', content: transcript });

    const raw = await callAI(messages, 300, 0.7);
    if (!raw) return { response: "I'm here to help! Could you say that again? 💪" };

    let response = raw;
    let action: { type: string; payload?: any } | undefined;

    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace && raw.includes('"type"')) {
      try {
        const jsonStr = raw.slice(firstBrace, lastBrace + 1);
        action = JSON.parse(jsonStr);
        response = raw.replace(jsonStr, '').trim();
      } catch (err) {
        console.error('Failed to parse AI action JSON:', err);
      }
    }

    return { response: response || "I'm on it! 💪", action };
  } catch (error) {
    console.error('AI voice error:', error);
    return { response: "I'm having a little trouble right now. Please try again! 💪" };
  }
}

export async function getAIResponse(prompt: string, systemContext: string, maxTokens = 500): Promise<string> {
  try {
    const result = await callAI(
      [{ role: 'system', content: systemContext }, { role: 'user', content: prompt }],
      maxTokens,
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
export async function analyzeFormImages(imagesBase64: string[], exercise: string): Promise<{score: number, feedback: string[]}> {
  try {
    const contentObj: any[] = [
      {
        type: 'text',
        text: `You are an elite biomechanics critic and personal trainer. Analyze the form of a user executing a ${exercise} over a series of sequential frames from start to finish. Provide exactly a 1-10 numerical score (can be decimal) and an array of 3 highly critical and actionable feedback points.
Output STRICTLY and ONLY valid JSON matching this schema:
{"score": 8.5, "feedback": ["Use deeper depth", "Keep back straight", "Drive through heels"]}
Do not output markdown code blocks. Just the raw JSON string.`
      }
    ];

    imagesBase64.forEach(img => {
      contentObj.push({
        type: 'image_url',
        image_url: { url: img }
      });
    });

    const messages = [{ role: 'user', content: contentObj }];

    for (const fallback of exportedClientsForVision) {
      const modelsToTry = fallback.models.includes('gemini-2.5-flash') 
        ? ['gemini-2.5-flash'] 
        : ['google/gemini-2.5-flash:free', 'meta-llama/llama-3.2-90b-vision-instruct:free'];

      for (const model of modelsToTry) {
        try {
          const completion = await fallback.client.chat.completions.create({
            model,
            messages: messages as any,
            max_tokens: 400,
            temperature: 0.2,
          });
          const content = completion.choices[0]?.message?.content || "";
          
          let cleaned = content.trim();
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          
          return JSON.parse(cleaned);
        } catch (e: any) {
          const msg: string = e?.message || '';
          const status: number | undefined = e?.status;
          if (e?.name === 'APIConnectionTimeoutError' || msg.includes('timed out') || msg.includes('timeout')) {
            console.error(`[AI:vision] Request timed out (model=${model})`);
            break;
          }
          if (status === 401 || msg.includes('invalid_api_key') || msg.includes('Unauthorized')) {
            console.error(`[AI:vision] Auth failure for model=${model} — skipping key`);
            break;
          }
          console.warn(`[AI:vision] Model ${model} failed (status=${status ?? 'unknown'}): ${msg.slice(0, 120)}`);
          continue;
        }
      }
    }
    throw new Error("All vision models failed");
  } catch (error) {
    console.error('AI Form Analysis error:', error);
    return { score: 7.5, feedback: ["Ensure steady pacing throughout the movement.", "Keep a neutral spine, watch for hyper-extension.", "Focus on breathing during the lift."] };
  }
}

export async function getRecoveryTips(muscles: string[], hoursSinceWorkout: number): Promise<string> {
  const context = `You are an expert sports recovery specialist. The user worked the following muscles: ${muscles.join(', ')} about ${Math.round(hoursSinceWorkout)} hours ago. Provide 3-4 concise, actionable recovery tips including specific stretches, nutrition timing, and sleep advice. Be scientific but accessible. Keep response under 200 words.`;
  const result = await getAIResponse(`What should I do to recover my ${muscles.join(', ')}?`, context);
  return result || 'Focus on protein intake within 30 minutes, stay hydrated (3L water), do light stretching, and aim for 8 hours of sleep. Foam rolling can help reduce soreness.';
}

export async function getWorkoutSummary(exercises: string[], totalVolume: number, duration: number, musclesWorked: string[]): Promise<string> {
  const context = `You are an elite personal trainer providing post-workout analysis. Be motivational, specific, and actionable. Include a brief performance note, recovery timeline, and suggest what to train next. Keep under 150 words.`;
  const prompt = `Workout summary:\n- Exercises: ${exercises.join(', ')}\n- Total volume: ${totalVolume}kg\n- Duration: ${duration} minutes\n- Muscles worked: ${musclesWorked.join(', ')}\n\nGive me a motivational post-workout analysis.`;
  const result = await getAIResponse(prompt, context);
  return result || `Great session! You moved ${totalVolume}kg in ${duration} minutes targeting ${musclesWorked.join(', ')}. Allow 48-72h for those muscle groups to recover. Stay hydrated and prioritize sleep tonight!`;
}

export async function getSmartNextWorkout(recoveryStatus: Record<string, number>): Promise<string> {
  const context = `You are a smart workout planner. Based on the muscle recovery percentages, suggest the optimal workout for today. Be specific with exercises, sets, and reps. Keep under 100 words.`;
  const muscleList = Object.entries(recoveryStatus).map(([muscle, pct]) => `${muscle}: ${pct}% recovered`).join(', ');
  const result = await getAIResponse(`My muscle recovery: ${muscleList}. What should I train today?`, context);
  return result || 'Based on your recovery, consider a light upper body session or active recovery with yoga and mobility work.';
}
