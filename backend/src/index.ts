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

// Get the correct PORT for Railway
const PORT = parseInt(process.env.PORT || '3001');

// Setup CORS Origin - Dynamic for both local and Railway
const allowedOrigins = [
  'http://localhost:5173',
  process.env.CORS_ORIGIN
].filter(Boolean) as string[];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ 
  origin: allowedOrigins.length > 0 ? allowedOrigins : true, 
  credentials: true 
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Request logging for debugging Railway
app.use((req, _res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Serve frontend in production
const frontendDist = path.join(__dirname, 'public');
app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error sending index.html:', err);
      res.status(500).send('Frontend build not found. Please check deployment logs.');
    }
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

import db from './db.js';
import { seed } from './seed.js';

(async () => {
  try {
    console.log('🏗️ Starting production server initialization...');
    await initializeDatabase();
    
    const userCount = await db.get('SELECT COUNT(*) as c FROM users') as any;
    if (!userCount || parseInt(userCount.c) === 0) {
      console.log('📦 Empty database detected. Auto-seeding initial data...');
      await seed();
    }

    initializeSocket(io);

    // Use Railway's dynamic PORT or default to 8080
    const finalPort = process.env.PORT || 8080;
    
    server.listen(Number(finalPort), '0.0.0.0', () => {
      console.log(`\n🚀 FitConnect API is LIVE on port ${finalPort}`);
      console.log(`🌍 URL: ${process.env.RAILWAY_STATIC_URL || 'Internal Railway Network'}`);
      console.log(`📡 Socket.IO ready for connections`);
      console.log(`✅ Database initialized and connected\n`);
    });
  } catch (err: any) {
    console.error('\n\x1b[31m❌ CRITICAL: Failed to start server:\x1b[0m', err);
    process.exit(1);
  }
})();

export { io };
