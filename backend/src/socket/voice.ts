/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * This software is proprietary and confidential.
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import db from '../db.js';
import { getAIResponse } from '../services/ai.js';
import crypto from 'crypto';

// ─── SQL Safety Validator ───
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

1. **users**: id (TEXT), name (TEXT), email (TEXT), role (TEXT, e.g. trainee, trainer, admin), xp (INTEGER), level (INTEGER), streak (INTEGER), is_banned (INTEGER), created_at (TIMESTAMP)
2. **trainer_profiles**: id (TEXT), user_id (TEXT), bio (TEXT), specialties (TEXT, JSON array), experience (INTEGER), hourly_rate (REAL), rating (REAL), total_reviews (INTEGER), balance (REAL)
3. **trainee_profiles**: id (TEXT), user_id (TEXT), age (INTEGER), weight (REAL), height (REAL), fitness_level (TEXT), goals (TEXT, JSON array)
4. **sessions**: id (TEXT), trainer_id (TEXT), trainee_id (TEXT), type (TEXT, video/audio/in-person), status (TEXT, scheduled/active/completed/cancelled), scheduled_at (TIMESTAMP), duration (INTEGER)
5. **reviews**: id (TEXT), session_id (TEXT), reviewer_id (TEXT), reviewee_id (TEXT), rating (INTEGER), comment (TEXT)
6. **billing_history**: id (TEXT), user_id (TEXT), amount (REAL), type (TEXT), payment_method (TEXT), created_at (TIMESTAMP)

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

Do NOT wrap the JSON inside markdown code blocks. Return ONLY the raw JSON string.`;

export function initializeVoiceSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname === '/ws/voice') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (clientWs, request) => {
    console.log('📡 Voice WebSocket connection established');
    const urlObj = new URL(request.url || '', 'http://localhost');
    const conversationId = urlObj.searchParams.get('conversationId') || crypto.randomUUID();

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY is not defined in environment!');
      clientWs.send(JSON.stringify({ type: 'session_error', message: 'Gemini API Key missing' }));
      clientWs.close();
      return;
    }

    const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    const geminiWs = new WebSocket(geminiUrl);

    // Track active status to handle potential async interrupts
    let sessionActive = true;

    clientWs.send(JSON.stringify({
      type: 'session_started',
      session_id: crypto.randomUUID(),
      conversation_id: conversationId
    }));

    geminiWs.on('open', () => {
      console.log('🔗 Connected to Gemini Bidirectional Live API');
      
      // Send setup frame
      const setupFrame = {
        setup: {
          model: 'models/gemini-2.0-flash-exp',
          generationConfig: {
            responseModalities: ['audio'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck' // Premium dynamic spoken voice config
                }
              }
            }
          },
          systemInstruction: {
            parts: [{
              text: 'You are the intelligent spoken Voice Assistant for AbiliFit, acting as a virtual personal trainer and app navigator. You help users navigate the app, log workouts, switch exercises, and answer fitness questions. When asked to perform an action, ALWAYS use the provided tools first, then confirm the action verbally. Keep spoken replies short, encouraging, and conversational.'
            }]
          },
          tools: [{
            functionDeclarations: [
              {
                name: 'navigate',
                description: 'Navigate to a specific page or tab in the app (e.g. dashboard, solo trainer, settings, profile).',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    target: { type: 'STRING', description: 'The target page name' }
                  },
                  required: ['target']
                }
              },
              {
                name: 'click',
                description: 'Click a button or link on the screen using its label text.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    label: { type: 'STRING', description: 'The text of the button to click' }
                  },
                  required: ['label']
                }
              },
              {
                name: 'log_rep',
                description: 'Log a workout set (reps, weight) for an exercise.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    exercise: { type: 'STRING', description: 'Name of the exercise' },
                    reps: { type: 'INTEGER', description: 'Number of reps performed' },
                    weight: { type: 'NUMBER', description: 'Weight used (optional)' }
                  },
                  required: ['exercise', 'reps']
                }
              },
              {
                name: 'switch_exercise',
                description: 'Switch the currently active exercise in the virtual gym / solo trainer.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    exercise: { type: 'STRING', description: 'Name of the new exercise' }
                  },
                  required: ['exercise']
                }
              },
              {
                name: 'toggle_theme',
                description: 'Toggle visual dashboard theme color modes.',
                parameters: { type: 'OBJECT', properties: {} }
              }
            ]
          }]
        }
      };

      geminiWs.send(JSON.stringify(setupFrame));
    });

    geminiWs.on('message', async (data) => {
      if (!sessionActive) return;
      
      try {
        const frame = JSON.parse(data.toString());

        // Handle Audio Output
        if (frame.serverContent?.modelTurn?.parts) {
          for (const part of frame.serverContent.modelTurn.parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/')) {
              const base64Audio = part.inlineData.data;
              const binaryBuffer = Buffer.from(base64Audio, 'base64');
              clientWs.send(binaryBuffer);
            }
            if (part.text) {
              clientWs.send(JSON.stringify({
                type: 'transcript',
                source: 'agent',
                text: part.text
              }));
            }
          }
        }

        // Handle User Transcription Feedbacks
        if (frame.serverContent?.turnComplete) {
          clientWs.send(JSON.stringify({ type: 'turn_complete' }));
        }

        // Handle Tool Calls
        if (frame.toolCall?.functionCalls) {
          for (const call of frame.toolCall.functionCalls) {
            const { name, args, id: callId } = call;
            console.log(`🛠️ Tool requested by Gemini: ${name}`, args);

            if (name === 'navigate') {
              clientWs.send(JSON.stringify({ type: 'action_navigate', target: args.target }));
              geminiWs.send(JSON.stringify({
                toolResponse: {
                  functionResponses: [{
                    response: { output: { status: 'success', message: `Navigated to ${args.target}` } },
                    id: callId
                  }]
                }
              }));
            } else if (name === 'click') {
              clientWs.send(JSON.stringify({ type: 'action_click', label: args.label }));
              geminiWs.send(JSON.stringify({
                toolResponse: {
                  functionResponses: [{
                    response: { output: { status: 'success', message: `Clicked button ${args.label}` } },
                    id: callId
                  }]
                }
              }));
            } else if (name === 'log_rep') {
              clientWs.send(JSON.stringify({ 
                type: 'action_log_rep', 
                exercise: args.exercise, 
                reps: args.reps, 
                weight: args.weight 
              }));
              geminiWs.send(JSON.stringify({
                toolResponse: {
                  functionResponses: [{
                    response: { output: { status: 'success', message: `Logged ${args.reps} reps for ${args.exercise}` } },
                    id: callId
                  }]
                }
              }));
            } else if (name === 'switch_exercise') {
              clientWs.send(JSON.stringify({ type: 'action_switch_exercise', exercise: args.exercise }));
              geminiWs.send(JSON.stringify({
                toolResponse: {
                  functionResponses: [{
                    response: { output: { status: 'success', message: `Switched exercise to ${args.exercise}` } },
                    id: callId
                  }]
                }
              }));
            } else if (name === 'toggle_theme') {
              clientWs.send(JSON.stringify({ type: 'action_toggle_theme' }));
              geminiWs.send(JSON.stringify({
                toolResponse: {
                  functionResponses: [{
                    response: { output: { status: 'success', message: 'Theme color modes toggled successfully.' } },
                    id: callId
                  }]
                }
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error handling Gemini live frame:', err);
      }
    });

    clientWs.on('message', (message) => {
      // Direct stream routing from user microphone raw chunks to Gemini Live
      if (Buffer.isBuffer(message) || message instanceof ArrayBuffer) {
        const buffer = Buffer.isBuffer(message) ? message : Buffer.from(message as ArrayBuffer);
        const base64Audio = buffer.toString('base64');
        if (geminiWs.readyState === WebSocket.OPEN) {
          geminiWs.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: 'audio/pcm',
                data: base64Audio
              }]
            }
          }));
        }
      } else {
        // String JSON commands (e.g. manual text submissions, VAD interruptions)
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'text_input') {
            if (geminiWs.readyState === WebSocket.OPEN) {
              geminiWs.send(JSON.stringify({
                clientContent: {
                  turns: [{
                    role: 'user',
                    parts: [{ text: parsed.text }]
                  }],
                  turnComplete: true
                }
              }));
            }
          } else if (parsed.type === 'end_session') {
            console.log('Session termination requested by client');
            clientWs.close();
          }
        } catch {}
      }
    });

    geminiWs.on('close', () => {
      console.log('🔌 Gemini Live WebSocket connection closed');
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'session_ended', reason: 'Gemini server connection closed' }));
        clientWs.close();
      }
    });

    clientWs.on('close', () => {
      console.log('🔌 Client Voice WebSocket connection closed');
      sessionActive = false;
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close();
      }
    });

    clientWs.on('error', (err) => {
      console.error('Client socket session error:', err);
      sessionActive = false;
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close();
      }
    });
  });
}