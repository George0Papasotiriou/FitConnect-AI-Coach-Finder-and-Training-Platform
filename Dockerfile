# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# Copy full source
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Build backend (tsc → backend/dist/)
RUN cd backend && npm run build

# Build frontend (tsc + vite → frontend/dist/)
RUN cd frontend && npm run build

# Copy frontend build output into backend's static-file directory
RUN mkdir -p backend/dist/public && cp -rv frontend/dist/. backend/dist/public/

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy backend production dependencies only
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copy compiled backend + bundled frontend assets from builder
COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "backend/dist/index.js"]
