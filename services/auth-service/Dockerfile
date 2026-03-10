# Build context must be the monorepo root:
#   docker build -f services/auth-service/Dockerfile .


FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifest files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only the packages needed for auth-service
COPY packages/logger-ts ./packages/logger-ts
COPY packages/postgres-connector-ts ./packages/postgres-connector-ts
COPY services/auth-service ./services/auth-service

# Install all workspace dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build packages first (auth-service depends on them)
RUN pnpm --filter logger-ts build
RUN pnpm --filter postgres-connector-ts build

# Build auth-service
RUN pnpm --filter auth-service build

# Create a self-contained deployment folder (resolves workspace symlinks)
RUN pnpm --filter auth-service deploy --prod --legacy /deploy

FROM node:20-alpine AS runner
WORKDIR /app

# /deploy contains dist/, node_modules/, package.json — no symlinks, no workspace refs
COPY --from=builder /deploy ./

EXPOSE ${AUTH_SERVICE_PORT}
CMD ["node", "dist/main.js"]
