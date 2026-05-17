# AbiliFit — Adaptive Fitness Coaching PWA

A full-stack Progressive Web App connecting fitness coaches with trainees. Features real-time chat, video/voice calls, AI-powered coaching tips, gamification, voice-activated navigation, and full accessibility support for users with disabilities.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Framer Motion |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Realtime | Socket.IO |
| AI | OpenRouter API (GPT-4o-mini) |
| Video | WebRTC / SimplePeer |
| Auth | JWT (jsonwebtoken) |
| PWA | Vite Plugin PWA, Workbox |

---

## Running Locally

### Prerequisites

- **Node.js** v18+ — [nodejs.org](https://nodejs.org)
- **PostgreSQL** v14+ — [postgresql.org/download](https://www.postgresql.org/download/)
- **npm** v9+

---

### 1. Set up PostgreSQL

Open `psql` (or pgAdmin) and run:

```sql
CREATE DATABASE fitconnect;
```

If you want a dedicated user (recommended):

```sql
CREATE USER fitconnect_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE fitconnect TO fitconnect_user;
```

---

### 2. Clone / open the project

The project root is `C:\Users\Admin\Downloads\Coach APP`.

---

### 3. Configure the backend

Copy the example env and fill in your values:

```
copy backend\.env.example backend\.env
```

Open `backend\.env` and set at minimum:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/fitconnect
JWT_SECRET=replace-with-a-random-64-character-string
OPENROUTER_API_KEY=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
```

Generate a secure JWT secret with:

```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

### 4. Configure the frontend

```
copy frontend\.env.example frontend\.env
```

The defaults work for local development:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

---

### 5. Install dependencies

```
cd "C:\Users\Admin\Downloads\Coach APP\backend"
npm install

cd "..\frontend"
npm install
```

---

### 6. Start the backend (creates tables + seeds demo data automatically)

```
cd "C:\Users\Admin\Downloads\Coach APP\backend"
npm run dev
```

The backend starts on **http://localhost:3001**.

On first start with an empty database it automatically:
1. Creates all 15 database tables
2. Seeds 7 trainer profiles, 6 trainee profiles, sessions, chats, achievements, and daily tasks

---

### 7. Start the frontend

Open a second terminal:

```
cd "C:\Users\Admin\Downloads\Coach APP\frontend"
npm run dev
```

The app is now running at **http://localhost:5173**.

---

### Demo accounts (all passwords: `password123`)

| Role | Email | Description |
|------|-------|-------------|
| Admin | admin@fitconnect.com | Password: `admin123` |
| Trainer | elena@fitconnect.com | Yoga & Adaptive Fitness |
| Trainer | marcus@fitconnect.com | Strength & Nutrition |
| Trainer | aisha@fitconnect.com | Accessibility-focused |
| Trainee | sarah@example.com | Beginner — weight loss goals |
| Trainee | anna@example.com | Mobility issues — rehabilitation |
| Trainee | maria@example.com | Visual impairment — voice nav user |

---

### Re-seeding the database (optional)

To reset all demo data:

```
cd "C:\Users\Admin\Downloads\Coach APP\backend"
npm run seed
```

---

## Deploying to Railway

### Overview

We deploy both the backend API and the frontend (served as static files from the backend) as a single Railway service, plus a managed PostgreSQL database.

---

### Step 1 — Create a Railway account

Go to [railway.app](https://railway.app) and sign up (GitHub login is easiest).

---

### Step 2 — Create a new project

1. Click **New Project**
2. Select **Deploy from GitHub repo** (push your code to GitHub first — see below)

OR use the Railway CLI:

```
npm install -g @railway/cli
railway login
railway init
```

---

### Step 3 — Push code to GitHub

From the project root:

```
cd "C:\Users\Admin\Downloads\Coach APP"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/fitconnect.git
git push -u origin main
```

> **Important**: The `.gitignore` already excludes `.env`, `node_modules/`, `dist/`, and `uploads/`.

---

### Step 4 — Add a PostgreSQL database on Railway

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway creates a managed database and sets `DATABASE_URL` automatically
3. Click on the database service → **Variables** tab → copy the `DATABASE_URL` value

---

### Step 5 — Set environment variables

In your Railway service → **Variables** tab, add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | *(auto-set by Railway when you link the database)* |
| `JWT_SECRET` | *(generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)* |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://your-app.up.railway.app` *(set after first deploy)* |
| `OPENROUTER_API_KEY` | `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` |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` |
| `VITE_API_URL` | `https://your-app.up.railway.app` |
| `VITE_SOCKET_URL` | `https://your-app.up.railway.app` |

---

### Step 6 — Link the database

1. In your service settings → **Variables** → click **Reference a variable**
2. Select `DATABASE_URL` from the PostgreSQL service
3. This injects the correct connection string at runtime

---

### Step 7 — Deploy

Railway picks up `railway.toml` automatically. The build command:
1. Builds the backend TypeScript
2. Builds the frontend (Vite)
3. Copies the frontend `dist/` into `backend/dist/public/`

The backend then serves the frontend at `/` in production.

Click **Deploy** or push a new commit — Railway redeploys automatically.

---

### Step 8 — Run seed on Railway (first deploy)

The app auto-seeds on first start if the database is empty — no manual action needed.

To manually re-seed via Railway CLI:

```
railway run --service your-service-name npm run seed
```

---

### Step 9 — Configure CORS_ORIGIN

After the first successful deploy:
1. Copy your Railway app URL (e.g. `https://fitconnect-production.up.railway.app`)
2. Set `CORS_ORIGIN` in Railway variables to that URL
3. Redeploy

---

### Custom domain (optional)

1. Railway service → **Settings** → **Domains** → **Add custom domain**
2. Follow the DNS instructions for your registrar (CNAME record)
3. Update `CORS_ORIGIN` and `VITE_API_URL` to your custom domain

---

## Project Structure

```
Coach APP/
├── backend/
│   ├── src/
│   │   ├── db.ts              # PostgreSQL pool + schema + helpers
│   │   ├── index.ts           # Express server entry point
│   │   ├── seed.ts            # Demo data seeder
│   │   ├── middleware/
│   │   │   ├── auth.ts        # JWT authentication middleware
│   │   │   └── upload.ts      # Multer file upload middleware
│   │   ├── routes/
│   │   │   ├── auth.ts        # Register / login / me
│   │   │   ├── trainer.ts     # Trainer profiles + client management
│   │   │   ├── trainee.ts     # Trainee profiles + coach search
│   │   │   ├── chat.ts        # Messaging + conversations
│   │   │   ├── session.ts     # Video/audio session management
│   │   │   ├── gamification.ts# XP, levels, achievements, leaderboard
│   │   │   ├── notification.ts# Push notifications
│   │   │   ├── admin.ts       # Admin dashboard + application review
│   │   │   └── ai.ts          # AI coaching tips + voice assistant
│   │   ├── services/
│   │   │   └── gamification.ts# XP awards, streak tracking, achievements
│   │   └── socket/
│   │       └── index.ts       # Socket.IO realtime events
│   ├── uploads/               # Uploaded avatars + documents
│   ├── .env                   # Local environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios API clients
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route-level page components
│   │   │   ├── admin/         # Admin dashboard + application review
│   │   │   ├── trainer/       # Trainer profile + client management
│   │   │   └── trainee/       # Trainee dashboard + coach search
│   │   ├── store/             # Zustand global state
│   │   └── hooks/             # Custom React hooks
│   ├── .env                   # Frontend environment variables
│   └── package.json
├── .gitignore
├── railway.toml               # Railway deployment config
└── README.md
```

---

## Security

- All passwords hashed with **bcryptjs** (cost factor 12)
- **JWT** tokens with configurable expiry
- **Helmet.js** sets secure HTTP headers
- **Rate limiting** on all API routes (200/15min) and auth routes (20/15min)
- **CORS** restricted to configured origin
- **Input validation** on all endpoints
- **SQL injection prevention** via parameterized queries (pg driver)
- `is_banned` check on every authenticated request
- File uploads restricted by MIME type and size
- PostgreSQL SSL enabled in production

---

## Accessibility Features

- Full **voice navigation** powered by OpenRouter AI (ChatGPT-style orb UI)
- **ARIA labels** throughout all components
- **Keyboard navigation** with focus trap in modals
- **High contrast** color system
- **Screen reader** compatible markup
- Coach profiles tagged with **accessibility specialties** (wheelchair, visual impairment, etc.)
- Trainee profiles store **accessibility needs** for smart coach matching
