# Use Node 20 as the base image
FROM node:20-slim AS builder

WORKDIR /app

# Copy all files
COPY . .

# Install dependencies and build backend
RUN cd backend && npm install && npm run build

# Install dependencies and build frontend
RUN cd frontend && npm install && npm run build

# Create the public directory in backend/dist and copy frontend assets
RUN mkdir -p backend/dist/public && cp -r frontend/dist/* backend/dist/public/

# Use a smaller image for production
FROM node:20-slim

WORKDIR /app

# Copy the built backend and its dependencies
COPY --from=builder /app/backend /app/backend

# Ensure the uploads directory exists
RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend

# Install production dependencies only if possible, but for simplicity we'll just use the already built ones
# or we can do a fresh install:
# RUN npm install --omit=dev

EXPOSE 3001

CMD ["npm", "start"]
