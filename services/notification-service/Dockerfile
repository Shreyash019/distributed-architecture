# Build context must be the monorepo root:
#   docker build -f services/notification-service/Dockerfile .

FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifest files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only the packages needed for notification-service
COPY services/notification-service ./services/notification-service

# Install all workspace dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build notification-service
RUN pnpm --filter notification-service build

# Create a self-contained deployment folder (resolves workspace symlinks)
RUN pnpm --filter notification-service deploy --prod --legacy /deploy

FROM node:20-alpine AS runner
WORKDIR /app

# /deploy contains dist/, node_modules/, package.json — no symlinks, no workspace refs
COPY --from=builder /deploy ./

EXPOSE ${NOTIFICATION_SERVICE_PORT}
CMD ["node", "dist/main.js"]
