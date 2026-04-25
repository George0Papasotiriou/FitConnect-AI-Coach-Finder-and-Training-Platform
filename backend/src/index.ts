import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import { initializeDatabase } from './db.js';
import { initializeSocket } from './socket/index.js';
import authRoutes from './routes/auth.js';
import traineeRoutes from './routes/trainee.js';
import trainerPublicRoutes, { trainerRouter } from './routes/trainer.js';
import chatRoutes from './routes/chat.js';
import sessionRoutes from './routes/session.js';
import gamificationRoutes from './routes/gamification.js';
import notificationRoutes from './routes/notification.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trainee', traineeRoutes);
app.use('/api/trainer', trainerRouter);
app.use('/api/trainers', trainerPublicRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, 'public');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

import db from './db.js';
import { seed } from './seed.js';

const PORT = parseInt(process.env.PORT || '3001');

(async () => {
  try {
    await initializeDatabase();
    
    const userCount = await db.get('SELECT COUNT(*) as c FROM users') as any;
    if (!userCount || parseInt(userCount.c) === 0) {
      console.log('📦 Empty database detected. Auto-seeding initial data...');
      await seed();
    }

    initializeSocket(io);

    server.listen(PORT, () => {
      console.log(`\n🚀 FitConnect API running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO ready for connections`);
      console.log(`💾 Database initialized\n`);
    });
  } catch (err: any) {
    const isConnRefused = err?.code === 'ECONNREFUSED' || err?.message?.includes('ECONNREFUSED') ||
      (Array.isArray(err?.errors) && err.errors.some((e: any) => e?.code === 'ECONNREFUSED'));

    if (isConnRefused) {
      console.error('\n\x1b[31m╔══════════════════════════════════════════════════════════╗');
      console.error('║        PostgreSQL is NOT running or not installed        ║');
      console.error('╚══════════════════════════════════════════════════════════╝\x1b[0m');
      console.error('\n\x1b[33mFix options:\x1b[0m');
      console.error('  1. Run the setup script (from the project root):');
      console.error('     \x1b[36mSet-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass\x1b[0m');
      console.error('     \x1b[36m.\\setup-postgres.ps1\x1b[0m\n');
      console.error('  2. Or start the PostgreSQL service manually:');
      console.error('     \x1b[36mnet start postgresql-x64-16\x1b[0m');
      console.error('     (check your version in Windows Services)\n');
      console.error('  3. Or update DATABASE_URL in backend\\.env with your');
      console.error('     actual PostgreSQL host/port/password.\n');
      console.error(`\x1b[90mCurrent DATABASE_URL: ${process.env.DATABASE_URL || '(not set)'}\x1b[0m\n`);
    } else {
      console.error('\n\x1b[31mFailed to start server:\x1b[0m', err);
    }
    process.exit(1);
  }
})();

export { io };
