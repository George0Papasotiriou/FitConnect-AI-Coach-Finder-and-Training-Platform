/**
 * AbiliFit - AI-Powered Fitness & Coach Finder Platform
 * Copyright (c) 2026 George Papasotiriou. All rights reserved.
 *
 * Whitelisted schema surface that the analytics agent is allowed to query.
 *
 * Every table here lists the columns the LLM may reference, the column that
 * holds the user id (for scope enforcement), and any role-based predicate
 * that must appear in a WHERE clause.
 *
 * The LLM prompt includes the table descriptions; the SQL validator enforces
 * that nothing outside this surface is reachable.
 */

export type Role = 'trainee' | 'trainer' | 'admin';

export interface ColumnDef {
  name: string;
  type: 'text' | 'number' | 'timestamp' | 'boolean' | 'json';
  description: string;
}

export interface TableDef {
  name: string;
  description: string;
  columns: ColumnDef[];
  /**
   * The column that must equal $USER_ID in the WHERE clause for trainees.
   * `null` means the table is global (no per-row scope).
   */
  userScopeColumn: string | null;
  /**
   * Optional alternate scope column for trainers (e.g. trainer_id).
   * Falls back to userScopeColumn if absent.
   */
  trainerScopeColumn?: string;
  /**
   * Roles that are allowed to query this table.
   */
  allowedRoles: Role[];
}

/**
 * Tables marked admin-only get appended to the schema description only when
 * the caller is an admin. They contain potentially sensitive fields (emails,
 * application notes, payment data) so we never expose them to trainees or
 * trainers.
 */
export const ADMIN_ONLY_TABLES: TableDef[] = [
  {
    name: 'trainer_profiles',
    description: 'Trainer profile data — public bio, rating, application status, hourly rate, specialties.',
    columns: [
      { name: 'id', type: 'text', description: 'Profile id' },
      { name: 'user_id', type: 'text', description: 'FK to users.id' },
      { name: 'bio', type: 'text', description: 'Public bio text' },
      { name: 'specialties', type: 'text', description: 'JSON array of specialties (e.g. ["Strength","Yoga"])' },
      { name: 'experience', type: 'number', description: 'Years of experience' },
      { name: 'hourly_rate', type: 'number', description: 'EUR per hour' },
      { name: 'rating', type: 'number', description: 'Average rating' },
      { name: 'total_reviews', type: 'number', description: 'Review count' },
      { name: 'application_status', type: 'text', description: 'pending | approved | rejected' },
      { name: 'is_available', type: 'number', description: '1 if available' },
      { name: 'gender', type: 'text', description: 'Trainer gender (self-reported)' },
      { name: 'age', type: 'number', description: 'Trainer age' },
      { name: 'languages', type: 'text', description: 'JSON array of spoken languages' },
      { name: 'created_at', type: 'timestamp', description: 'Created time' },
    ],
    userScopeColumn: null,
    allowedRoles: ['admin'],
  },
  {
    name: 'trainee_profiles',
    description:
      'Trainee profile — demographics, health, fitness goals, accessibility needs, training motivation. ' +
      'IMPORTANT for admin: this is where health-issue questions ("which users have injuries", ' +
      '"which users have heart conditions", etc.) are answered. JSON-text columns: medical_conditions, ' +
      'injured_limbs, accessibility_needs, goals. Use jsonb_array_elements_text(column::jsonb) to unnest.',
    columns: [
      { name: 'id', type: 'text', description: 'Profile id' },
      { name: 'user_id', type: 'text', description: 'FK to users.id' },
      { name: 'age', type: 'number', description: 'Age' },
      { name: 'weight', type: 'number', description: 'Weight kg' },
      { name: 'height', type: 'number', description: 'Height cm' },
      { name: 'gender', type: 'text', description: 'Self-reported gender' },
      { name: 'fitness_level', type: 'text', description: 'beginner | intermediate | advanced' },
      { name: 'goals', type: 'text', description: 'JSON array of fitness goals (e.g. ["lose_weight","build_muscle"])' },
      { name: 'medical_conditions', type: 'text', description: 'JSON array of medical conditions (e.g. ["asthma","diabetes"]). Empty array = "healthy".' },
      { name: 'injured_limbs', type: 'text', description: 'JSON array of injured body parts (e.g. ["lower_back","knee"]). Empty = no injuries.' },
      { name: 'injury_description', type: 'text', description: 'Free-text description of injuries (may be blank)' },
      { name: 'accessibility_needs', type: 'text', description: 'JSON array of accessibility needs (e.g. ["wheelchair","low_vision"])' },
      { name: 'preferred_workout_types', type: 'text', description: 'JSON array of preferred workouts' },
      { name: 'training_motivation', type: 'text', description: 'Free-text motivation statement (may be blank)' },
      { name: 'current_coach_id', type: 'text', description: 'FK to users.id (assigned trainer), nullable' },
      { name: 'created_at', type: 'timestamp', description: 'Profile created at' },
    ],
    userScopeColumn: null,
    allowedRoles: ['admin'],
  },
  {
    name: 'billing_history',
    description: 'Payment/withdrawal/subscription records.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'user_id', type: 'text', description: 'User id' },
      { name: 'amount', type: 'number', description: 'Amount' },
      { name: 'currency', type: 'text', description: 'EUR / USD' },
      { name: 'type', type: 'text', description: 'payment | withdrawal | subscription' },
      { name: 'status', type: 'text', description: 'pending | completed | failed' },
      { name: 'created_at', type: 'timestamp', description: 'Created time' },
    ],
    userScopeColumn: null,
    allowedRoles: ['admin'],
  },
  {
    name: 'notifications',
    description: 'Per-user notifications.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'user_id', type: 'text', description: 'User id' },
      { name: 'type', type: 'text', description: 'Type code' },
      { name: 'read', type: 'number', description: '1 if read' },
      { name: 'created_at', type: 'timestamp', description: 'Created time' },
    ],
    userScopeColumn: null,
    allowedRoles: ['admin'],
  },
  {
    name: 'messages',
    description: 'Chat messages. NEVER select content for non-admin queries. Admins may aggregate.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'conversation_id', type: 'text', description: 'Conversation id' },
      { name: 'sender_id', type: 'text', description: 'Sender user id' },
      { name: 'type', type: 'text', description: 'Message type' },
      { name: 'created_at', type: 'timestamp', description: 'Sent at' },
    ],
    userScopeColumn: null,
    allowedRoles: ['admin'],
  },
];

export const ANALYTICS_TABLES: TableDef[] = [
  {
    name: 'strength_history',
    description: 'Each row is a completed set of an exercise (weight × reps) logged by a trainee.',
    columns: [
      { name: 'id', type: 'text', description: 'Set id' },
      { name: 'user_id', type: 'text', description: 'Trainee who performed the set' },
      { name: 'exercise', type: 'text', description: 'Exercise name (e.g. "Bench Press")' },
      { name: 'weight', type: 'number', description: 'Weight in kg' },
      { name: 'reps', type: 'number', description: 'Repetitions performed' },
      { name: 'muscle_group', type: 'text', description: 'Primary muscle group (Chest, Back, Legs, ...)' },
      { name: 'created_at', type: 'timestamp', description: 'When the set was logged' },
    ],
    userScopeColumn: 'user_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'sessions',
    description: 'Coaching sessions between trainers and trainees (video/audio/in-person).',
    columns: [
      { name: 'id', type: 'text', description: 'Session id' },
      { name: 'trainer_id', type: 'text', description: 'Trainer user id' },
      { name: 'trainee_id', type: 'text', description: 'Trainee user id' },
      { name: 'type', type: 'text', description: 'video | audio | in-person' },
      { name: 'status', type: 'text', description: 'scheduled | active | completed | cancelled' },
      { name: 'scheduled_at', type: 'timestamp', description: 'When the session is/was scheduled' },
      { name: 'duration', type: 'number', description: 'Duration in minutes' },
      { name: 'created_at', type: 'timestamp', description: 'Booking time' },
    ],
    userScopeColumn: 'trainee_id',
    trainerScopeColumn: 'trainer_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'daily_tasks',
    description: 'Daily gamified tasks assigned to users; each row is one task on one day.',
    columns: [
      { name: 'id', type: 'text', description: 'Task id' },
      { name: 'user_id', type: 'text', description: 'User the task belongs to' },
      { name: 'title', type: 'text', description: 'Task title' },
      { name: 'type', type: 'text', description: 'Task category' },
      { name: 'xp_reward', type: 'number', description: 'XP awarded on completion' },
      { name: 'completed', type: 'number', description: '1 if completed, else 0' },
      { name: 'completed_at', type: 'timestamp', description: 'Completion time, NULL if not completed' },
      { name: 'date', type: 'text', description: 'Task date (YYYY-MM-DD)' },
      { name: 'created_at', type: 'timestamp', description: 'Created time' },
    ],
    userScopeColumn: 'user_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'user_achievements',
    description: 'Junction table tracking each user\'s progress against achievements.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'user_id', type: 'text', description: 'User id' },
      { name: 'achievement_id', type: 'text', description: 'Achievement id' },
      { name: 'progress', type: 'number', description: 'Current progress towards max_progress' },
      { name: 'unlocked', type: 'number', description: '1 if unlocked' },
      { name: 'unlocked_at', type: 'timestamp', description: 'When unlocked' },
    ],
    userScopeColumn: 'user_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'achievements',
    description: 'Static catalogue of all achievements available on the platform (global).',
    columns: [
      { name: 'id', type: 'text', description: 'Achievement id' },
      { name: 'name', type: 'text', description: 'Achievement name' },
      { name: 'description', type: 'text', description: 'Achievement description' },
      { name: 'xp_reward', type: 'number', description: 'XP awarded when unlocked' },
      { name: 'max_progress', type: 'number', description: 'Target progress count' },
      { name: 'category', type: 'text', description: 'Achievement category' },
    ],
    userScopeColumn: null,
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'user_bounties',
    description: 'Bounties the user has accepted/completed.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'user_id', type: 'text', description: 'User id' },
      { name: 'bounty_id', type: 'text', description: 'Bounty id' },
      { name: 'status', type: 'text', description: 'pending | completed | failed' },
      { name: 'completed_at', type: 'timestamp', description: 'Completion time' },
    ],
    userScopeColumn: 'user_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'bounties',
    description: 'Static bounty catalogue (global).',
    columns: [
      { name: 'id', type: 'text', description: 'Bounty id' },
      { name: 'title', type: 'text', description: 'Bounty title' },
      { name: 'description', type: 'text', description: 'Bounty description' },
      { name: 'xp_reward', type: 'number', description: 'XP reward' },
      { name: 'exercise_type', type: 'text', description: 'Exercise type required' },
      { name: 'goal_value', type: 'number', description: 'Target value (e.g. reps, minutes)' },
      { name: 'expires_at', type: 'timestamp', description: 'Expiry' },
    ],
    userScopeColumn: null,
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'program_exercises',
    description: 'Exercises that make up the trainee\'s program days.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'day_id', type: 'text', description: 'FK to program_days.id' },
      { name: 'exercise_name', type: 'text', description: 'Exercise name' },
      { name: 'exercise_category', type: 'text', description: 'Category (Chest, Back, Legs, ...)' },
      { name: 'sets', type: 'number', description: 'Prescribed sets' },
      { name: 'reps', type: 'number', description: 'Prescribed reps' },
      { name: 'weight', type: 'number', description: 'Prescribed weight (nullable)' },
      { name: 'duration', type: 'number', description: 'Duration seconds (nullable)' },
    ],
    userScopeColumn: null,
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'program_days',
    description: 'A day in a trainee\'s training program.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'program_id', type: 'text', description: 'FK to training_programs.id' },
      { name: 'day_date', type: 'text', description: 'Day date YYYY-MM-DD' },
    ],
    userScopeColumn: null,
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'training_programs',
    description: 'A trainee\'s training program (parent of program_days).',
    columns: [
      { name: 'id', type: 'text', description: 'Program id' },
      { name: 'user_id', type: 'text', description: 'Trainee id' },
      { name: 'name', type: 'text', description: 'Program name' },
      { name: 'created_at', type: 'timestamp', description: 'Created time' },
    ],
    userScopeColumn: 'user_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'reviews',
    description: 'Reviews left after sessions (rating 1-5 + optional comment).',
    columns: [
      { name: 'id', type: 'text', description: 'Review id' },
      { name: 'session_id', type: 'text', description: 'Session id' },
      { name: 'reviewer_id', type: 'text', description: 'Reviewer user id' },
      { name: 'reviewee_id', type: 'text', description: 'Reviewee user id' },
      { name: 'rating', type: 'number', description: 'Rating 1-5' },
      { name: 'comment', type: 'text', description: 'Optional comment' },
      { name: 'created_at', type: 'timestamp', description: 'Created time' },
    ],
    userScopeColumn: 'reviewer_id',
    trainerScopeColumn: 'reviewee_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'form_analysis',
    description: 'AI form-critic results on a trainee\'s uploaded video.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'user_id', type: 'text', description: 'Trainee user id' },
      { name: 'score', type: 'number', description: 'Form score 0-10' },
      { name: 'created_at', type: 'timestamp', description: 'Analysis time' },
    ],
    userScopeColumn: 'user_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'coach_requests',
    description:
      'Coach<>client relationships. status=\'accepted\' means the trainer actively coaches the trainee. ' +
      'Trainers: this is your gateway to clients\' data — JOIN through this table to reach trainees\' rows. ' +
      'Trainees: filter trainee_id = $USER_ID.',
    columns: [
      { name: 'id', type: 'text', description: 'Row id' },
      { name: 'trainee_id', type: 'text', description: 'Trainee user id' },
      { name: 'trainer_id', type: 'text', description: 'Trainer user id' },
      { name: 'status', type: 'text', description: 'pending | accepted | rejected' },
      { name: 'created_at', type: 'timestamp', description: 'Request time' },
    ],
    userScopeColumn: 'trainee_id',
    trainerScopeColumn: 'trainer_id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
  {
    name: 'users',
    description:
      'User accounts. Email is exposed for admin only (do not return per-row email dumps; aggregate). ' +
      'Trainers: use a JOIN through coach_requests to see client names. Trainees: scope to id = $USER_ID.',
    columns: [
      { name: 'id', type: 'text', description: 'User id' },
      { name: 'name', type: 'text', description: 'Display name' },
      { name: 'email', type: 'text', description: 'Email (admin only; aggregate, do not dump rows)' },
      { name: 'role', type: 'text', description: 'trainee | trainer | admin' },
      { name: 'xp', type: 'number', description: 'Experience points' },
      { name: 'level', type: 'number', description: 'Level' },
      { name: 'streak', type: 'number', description: 'Current streak in days' },
      { name: 'last_active_date', type: 'text', description: 'Last active date (YYYY-MM-DD)' },
      { name: 'onboarding_complete', type: 'number', description: '1 if onboarding finished' },
      { name: 'subscription_active', type: 'number', description: '1 if a paid subscription is active' },
      { name: 'free_trial_used', type: 'number', description: '1 if free trial consumed' },
      { name: 'is_banned', type: 'number', description: '1 if banned' },
      { name: 'two_factor_enabled', type: 'number', description: '1 if 2FA enabled' },
      { name: 'created_at', type: 'timestamp', description: 'Account creation' },
    ],
    userScopeColumn: 'id',
    allowedRoles: ['trainee', 'trainer', 'admin'],
  },
];

export function tablesForRole(role: Role): TableDef[] {
  const base = ANALYTICS_TABLES.filter((t) => t.allowedRoles.includes(role));
  if (role === 'admin') {
    return [...base, ...ADMIN_ONLY_TABLES];
  }
  return base;
}

export function findTable(name: string, role: Role = 'admin'): TableDef | undefined {
  const lower = name.toLowerCase();
  const all = role === 'admin' ? [...ANALYTICS_TABLES, ...ADMIN_ONLY_TABLES] : ANALYTICS_TABLES;
  return all.find((t) => t.name === lower);
}

/**
 * Compact human-readable schema description for the LLM system prompt.
 */
export function schemaPromptFor(role: Role): string {
  const tables = tablesForRole(role);
  return tables
    .map((t) => {
      const cols = t.columns.map((c) => `  - ${c.name} (${c.type}): ${c.description}`).join('\n');
      const scope = t.userScopeColumn
        ? ` [scope: ${t.userScopeColumn}${t.trainerScopeColumn ? ` or ${t.trainerScopeColumn}` : ''} = $USER_ID]`
        : ' [global]';
      return `TABLE ${t.name}${scope}\n  ${t.description}\n${cols}`;
    })
    .join('\n\n');
}
