import pg from 'pg';

const { Pool } = pg;

function toCamelCase(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

function parameterize(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

if (isProduction && !databaseUrl && !process.env.PGHOST) {
  console.error('❌ CRITICAL: No database configuration found in production!');
}

export const pool = new Pool({
  connectionString: databaseUrl,
  // Fallbacks for individual variables if connectionString is missing
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: Number(process.env.PGPORT || 5432),
  ssl: isProduction && !databaseUrl?.includes('railway.internal') ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle DB client:', err.message);
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    const maskedUrl = dbUrl.replace(/:([^@]+)@/, ':****@');
    console.log(`📡 Connecting to Database: ${maskedUrl || process.env.PGHOST || 'localhost'}`);
    
    const result = await client.query('SELECT current_database(), current_user, inet_server_addr()');
    const { current_database, current_user, inet_server_addr } = result.rows[0];
    
    console.log(`✅ Connected to DB: ${current_database} as User: ${current_user} (Server IP: ${inet_server_addr})`);
    console.log('✅ Database connection successful');
  } catch (err: any) {
    console.error('❌ Database connection failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

const db = {
  async run(sql: string, ...params: any[]): Promise<void> {
    await pool.query(parameterize(sql), params);
  },

  async get(sql: string, ...params: any[]): Promise<any | undefined> {
    const result = await pool.query(parameterize(sql), params);
    return result.rows[0] ? toCamelCase(result.rows[0]) : undefined;
  },

  async all(sql: string, ...params: any[]): Promise<any[]> {
    const result = await pool.query(parameterize(sql), params);
    return result.rows.map(toCamelCase);
  },

  async exec(sql: string): Promise<void> {
    await pool.query(sql);
  },

  async transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};

export default db;

export async function initializeDatabase() {
  await testConnection();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('trainee','trainer','admin')),
      avatar TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak INTEGER DEFAULT 0,
      last_active_date TEXT,
      onboarding_complete INTEGER DEFAULT 0,
      subscription_active INTEGER DEFAULT 0,
      free_trial_used INTEGER DEFAULT 0,
      is_banned INTEGER DEFAULT 0,
      ban_reason TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trainer_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      bio TEXT DEFAULT '',
      description TEXT DEFAULT '',
      specialties TEXT DEFAULT '[]',
      experience INTEGER DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      rating REAL DEFAULT 0,
      total_reviews INTEGER DEFAULT 0,
      credentials TEXT DEFAULT '[]',
      documents TEXT DEFAULT '[]',
      is_available INTEGER DEFAULT 1,
      balance REAL DEFAULT 0,
      application_status TEXT DEFAULT 'pending' CHECK(application_status IN ('pending','approved','rejected')),
      application_notes TEXT,
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS trainee_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      age INTEGER,
      weight REAL,
      height REAL,
      fitness_level TEXT DEFAULT 'beginner',
      goals TEXT DEFAULT '[]',
      accessibility_needs TEXT DEFAULT '[]',
      preferred_workout_types TEXT DEFAULT '[]',
      current_coach_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS balance REAL DEFAULT 0;


    CREATE TABLE IF NOT EXISTS coach_requests (
      id TEXT PRIMARY KEY,
      trainee_id TEXT NOT NULL,
      trainer_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      trainer_id TEXT NOT NULL,
      trainee_id TEXT NOT NULL,
      type TEXT DEFAULT 'video' CHECK(type IN ('video','audio','in-person')),
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','active','completed','cancelled')),
      scheduled_at TIMESTAMP NOT NULL,
      duration INTEGER,
      notes TEXT,
      cancel_reason TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewee_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      is_closed BOOLEAN DEFAULT FALSE,
      PRIMARY KEY (conversation_id, user_id)
    );

    ALTER TABLE conversation_participants ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT FALSE;

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text' CHECK(type IN ('text','image','file','voice','program')),
      file_url TEXT,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blocked_users (
      blocker_id TEXT NOT NULL,
      blocked_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('session','message','achievement','request','system','review')),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      action_url TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      xp_reward INTEGER NOT NULL,
      max_progress INTEGER NOT NULL,
      category TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      unlocked INTEGER DEFAULT 0,
      unlocked_at TIMESTAMP,
      UNIQUE(user_id, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS daily_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      xp_reward INTEGER NOT NULL,
      type TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TIMESTAMP,
      date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      subscription TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS training_programs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'My Program',
      description TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS program_days (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL,
      day_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS program_exercises (
      id TEXT PRIMARY KEY,
      day_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      exercise_category TEXT NOT NULL,
      sets INTEGER DEFAULT 3,
      reps INTEGER DEFAULT 10,
      duration INTEGER,
      weight REAL,
      notes TEXT DEFAULT '',
      video_url TEXT,
      sort_order INTEGER DEFAULT 0,
      is_custom INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS billing_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'EUR',
      type TEXT NOT NULL CHECK(type IN ('payment', 'withdrawal', 'subscription')),
      status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
      payment_method TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS strength_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exercise TEXT NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      muscle_group TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS bounties (
      id TEXT PRIMARY KEY,
      trainer_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      xp_reward INTEGER NOT NULL,
      exercise_type TEXT NOT NULL,
      goal_value REAL NOT NULL,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_bounties (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      bounty_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
      completed_at TIMESTAMP,
      UNIQUE(user_id, bounty_id)
    );

    CREATE TABLE IF NOT EXISTS form_analysis (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      video_url TEXT,
      feedback_json TEXT NOT NULL,
      score REAL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_trainer ON sessions(trainer_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_trainee ON sessions(trainee_id);
    CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_date ON daily_tasks(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_coach_requests_trainer ON coach_requests(trainer_id);
    CREATE INDEX IF NOT EXISTS idx_coach_requests_trainee ON coach_requests(trainee_id);
    CREATE INDEX IF NOT EXISTS idx_training_programs_user ON training_programs(user_id);
    CREATE INDEX IF NOT EXISTS idx_program_days_program ON program_days(program_id);
    CREATE INDEX IF NOT EXISTS idx_program_exercises_day ON program_exercises(day_id);
    CREATE INDEX IF NOT EXISTS idx_strength_history_user ON strength_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_bounties_user ON user_bounties(user_id);
  `);
}
