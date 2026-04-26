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
import programRoutes from './routes/programs.js';
import uploadRoutes from './routes/upload.js';
import billingRoutes from './routes/billing.js';
import strengthRoutes from './routes/strength.js';
import bountyRoutes from './routes/bounties.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

console.log('--- SYSTEM RESTART DETECTED ---');
console.log('Timestamp:', new Date().toISOString());

// Get the correct PORT for Railway
const PORT = Number(process.env.PORT || 3001);

// Setup CORS Origin - Handle the common trailing slash mistake automatically
const rawOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const cleanOrigin = rawOrigin.replace(/\/$/, '');

const allowedOrigins = [
  'http://localhost:5173',
  cleanOrigin
].filter(Boolean) as string[];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Disable CSP for easier deployment troubleshooting
}));

app.use(cors({ 
  origin: allowedOrigins.length > 0 ? allowedOrigins : true, 
  credentials: true 
}));

// FORCE CACHE INVALIDATION FOR SPA
app.use((req, res, next) => {
  if (req.url === '/' || req.url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Simple request logger
app.use((req, res, next) => {
  if (!req.url.startsWith('/assets')) {
    console.log(`📡 ${req.method} ${req.url}`);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 1. API ROUTES FIRST
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
app.use('/api/programs', programRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/strength', strengthRoutes);
app.use('/api/bounties', bountyRoutes);
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), port: PORT });
});

// 2. STATIC ASSETS
const frontendDist = path.join(__dirname, 'public');
console.log(`📂 Serving static files from: ${frontendDist}`);
app.use(express.static(frontendDist));

// 3. WILDCARD SECOND-TO-LAST (Always serves index.html for SPA routing)
app.get('*', (req, res, next) => {
  // If it's an API route that reached here, it's a 404
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ message: 'API Route not found' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      console.error('❌ Missing index.html in:', frontendDist);
      res.status(500).send('Frontend not built correctly.');
    }
  });
});

// 4. ERROR HANDLER LAST
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Server error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

import db from './db.js';
import { seed } from './seed.js';

(async () => {
  try {
    console.log('🏗️ Starting production boot sequence...');
    await initializeDatabase();
    
    const userCount = await db.get('SELECT COUNT(*) as c FROM users') as any;
    if (!userCount || parseInt(userCount.c) === 0) {
      console.log('📦 Empty database detected. Seeding initial data...');
      await seed();
    }
    
    initializeSocket(io);
    
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 SERVER IS LIVE (Version: 1.1.0)`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌐 Origin Allowed: ${cleanOrigin}`);
      console.log(`📂 Serving static files from: ${frontendDist}`);
      console.log('✅ Ready to accept connections\n');
    });

    process.on('uncaughtException', (err) => {
      console.error('🔥 UNCAUGHT EXCEPTION:', err);
    });
    process.on('unhandledRejection', (reason) => {
      console.error('🔥 UNHANDLED REJECTION:', reason);
    });
  } catch (err: any) {
    console.error('\n\x1b[31m❌ FATAL BOOT ERROR:\x1b[0m', err);
    process.exit(1);
  }
})();

export { io };
