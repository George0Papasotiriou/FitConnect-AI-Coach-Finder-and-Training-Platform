import OpenAI from 'openai';

const MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
const FALLBACK_MODELS = ['openai/gpt-4o-mini', 'anthropic/claude-3-haiku', 'mistralai/mistral-7b-instruct'];

/** Returns a redacted key prefix safe for logging, e.g. "sk-or-v1-****" */
function maskKey(key: string): string {
  if (!key) return '(not set)';
  const prefix = key.slice(0, 12);
  return `${prefix}****`;
}

function makeClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://fitconnect.app',
      'X-Title': 'Insta Coach',
    },
  });
}

// Validate keys at startup — warn loudly but don't crash so the rest of the
// app remains functional even when AI features are unavailable.
const PRIMARY_KEY = process.env.OPENROUTER_API_KEY || '';
const FALLBACK_KEY = process.env.OPENROUTER_API_KEY_FALLBACK || '';

if (!PRIMARY_KEY) {
  console.warn('[AI] WARNING: OPENROUTER_API_KEY is not set. AI features will be unavailable.');
} else {
  console.log(`[AI] Primary key loaded: ${maskKey(PRIMARY_KEY)}`);
}

if (!FALLBACK_KEY) {
  console.warn('[AI] WARNING: OPENROUTER_API_KEY_FALLBACK is not set. No fallback key available.');
} else {
  console.log(`[AI] Fallback key loaded: ${maskKey(FALLBACK_KEY)}`);
}

// Only create clients for keys that are actually present.
const primaryClient = PRIMARY_KEY ? makeClient(PRIMARY_KEY) : null;
// Use a distinct fallback client only when a separate fallback key is provided.
const fallbackClient = FALLBACK_KEY ? makeClient(FALLBACK_KEY) : primaryClient;

/** Returns true when the error indicates an authentication/authorisation failure. */
function isAuthError(err: any): boolean {
  const msg: string = err?.message || '';
  const status: number = err?.status ?? err?.response?.status ?? 0;
  return (
    status === 401 ||
    status === 403 ||
    msg.includes('invalid_api_key') ||
    msg.includes('Unauthorized') ||
    msg.includes('No auth credentials')
  );
}

/** Returns true when the error is transient and retrying with another model may help. */
function isRetryableError(err: any): boolean {
  const status: number = err?.status ?? err?.response?.status ?? 0;
  return status === 429 || status === 503 || status === 502;
}

async function callAI(messages: any[], maxTokens = 400, temperature = 0.7): Promise<string> {
  if (!primaryClient && !fallbackClient) {
    console.error('[AI] No API clients available — both primary and fallback keys are missing.');
    return '';
  }

  const models = [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)];

  // Build a deduplicated list of [client, keyLabel] pairs so we don't retry
  // the same key twice when no separate fallback key was configured.
  const clientPairs: Array<[OpenAI, string]> = [];
  if (primaryClient) clientPairs.push([primaryClient, `primary (${maskKey(PRIMARY_KEY)})`]);
  if (fallbackClient && fallbackClient !== primaryClient) {
    clientPairs.push([fallbackClient, `fallback (${maskKey(FALLBACK_KEY)})`]);
  }

  for (const [client, keyLabel] of clientPairs) {
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
        if (isAuthError(err)) {
          console.error(`[AI] Auth error with key ${keyLabel} on model "${model}". Skipping to next key.`);
          // Auth failure is key-level — no point trying other models with this key.
          break;
        }
        if (isRetryableError(err)) {
          console.warn(`[AI] Transient error (${err?.status ?? 'unknown'}) with model "${model}" using key ${keyLabel}. Trying next model.`);
          continue;
        }
        // Unknown error — log and try the next model.
        console.warn(`[AI] Unexpected error with model "${model}" using key ${keyLabel}: ${err?.message ?? err}`);
        continue;
      }
    }
  }
  return '';
}

const SYSTEM_PROMPT = `You are Insta Coach AI, an omniscient accessibility guide and fitness assistant for the Insta Coach platform. 
You exist natively to help users with visual/hearing impairments navigate entirely by voice, as well as providing elite fitness advice.

**CRITICAL PLATFORM ROUTE MAP:**
- "Dashboard" / "Home" -> { "type": "navigate", "payload": "/trainee/dashboard" }
- "My Progress" / "Progress Hub" -> { "type": "navigate", "payload": "/progress-hub" }
- "My Programs" / "Workouts" -> { "type": "navigate", "payload": "/programs" }
- "Bounties" / "Missions" / "Daily Bounties" -> { "type": "navigate", "payload": "/bounties" }
- "Sweat Map" / "Community Map" -> { "type": "navigate", "payload": "/map" }
- "AI Trainer" / "Voice chat" -> { "type": "navigate", "payload": "/ai-trainer" }
- "Form Critic" / "Check my form" -> { "type": "navigate", "payload": "/form-critic" }
- "Circadian Optimizer" / "Sleep" / "Metabolism" -> { "type": "navigate", "payload": "/circadian" }
- "Recovery Dashboard" / "Recovery" -> { "type": "navigate", "payload": "/recovery" }
- "Settings" -> { "type": "navigate", "payload": "/settings" }
- "Leaderboard" -> { "type": "navigate", "payload": "/leaderboard" }
- "Messages" / "Chat" -> { "type": "navigate", "payload": "/chat" }
- "Achievements" -> { "type": "navigate", "payload": "/achievements" }
- "Search Coaches" / "Find a Coach" -> { "type": "navigate", "payload": "/search" }

If a user asks to go somewhere, YOU MUST respond with a JSON action matching the exact payload above.
If the user asks "Where am I?" or "Read this page to me", use the "User context: Current page:" string provided to describe their exact location aloud in a friendly, descriptive manner so they can understand via text-to-speech.

Other Actions:
- "Find yoga coach" → { "type": "search", "payload": "yoga" }
- "Start counting my reps" → { "type": "rep_counter_start", "payload": "squats" }

Format exactly one JSON object if an action is required, and append your spoken response outside of it.
Keep spoken responses extremely concise, warm, helpful, and accessible.`;

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
export async function analyzeFormImages(imagesBase64: string[], exercise: string): Promise<{score: number, feedback: string[]}> {
  try {
    // Utilizing free vision-capable models explicitly.
    const visionModels = ['google/gemini-2.5-flash:free', 'meta-llama/llama-3.2-90b-vision-instruct:free'];

    const contentObj: any[] = [
      {
        type: 'text',
        text: `You are an elite biomechanics critic and personal trainer. Analyze the form of a user executing a ${exercise} over a series of sequential frames from start to finish. Provide exactly a 1-10 numerical score (can be decimal) and an array of 3 highly critical and actionable feedback points.\nOutput STRICTLY and ONLY valid JSON matching this schema:\n{\"score\": 8.5, \"feedback\": [\"Use deeper depth\", \"Keep back straight\", \"Drive through heels\"]}\nDo not output markdown code blocks. Just the raw JSON string.`
      }
    ];

    imagesBase64.forEach(img => {
      contentObj.push({
        type: 'image_url',
        image_url: { url: img }
      });
    });

    const messages = [{ role: 'user', content: contentObj }];

    // Build deduplicated client pairs (same deduplication logic as callAI).
    const clientPairs: Array<[OpenAI, string]> = [];
    if (primaryClient) clientPairs.push([primaryClient, `primary (${maskKey(PRIMARY_KEY)})`]);
    if (fallbackClient && fallbackClient !== primaryClient) {
      clientPairs.push([fallbackClient, `fallback (${maskKey(FALLBACK_KEY)})`]);
    }

    if (clientPairs.length === 0) {
      throw new Error('No API clients available — both primary and fallback keys are missing.');
    }

    for (const [client, keyLabel] of clientPairs) {
      for (const model of visionModels) {
        try {
          const completion = await client.chat.completions.create({
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
          if (isAuthError(e)) {
            console.error(`[AI] Auth error with key ${keyLabel} on vision model "${model}". Skipping to next key.`);
            break;
          }
          console.warn(`[AI] Vision model "${model}" failed with key ${keyLabel}: ${e?.message ?? e}`);
          continue;
        }
      }
    }
    throw new Error('All vision models failed');
  } catch (error) {
    console.error('[AI] Form analysis error:', error);
    return { score: 7.5, feedback: ["Ensure steady pacing throughout the movement.", "Keep a neutral spine, watch for hyper-extension.", "Focus on breathing during the lift."] };
  }
}
