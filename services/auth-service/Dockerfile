# Build context must be the monorepo root:
#   docker build -f services/auth-service/Dockerfile .


FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifest files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only the packages needed for auth-service
COPY packages/logger-ts ./packages/logger-ts
COPY services/auth-service ./services/auth-service

# Install all workspace dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build logger-ts first (auth-service depends on it)
RUN pnpm --filter logger-ts build

# Build auth-service
RUN pnpm --filter auth-service build

# Create a self-contained deployment folder (resolves workspace symlinks)
RUN pnpm --filter auth-service deploy --prod /deploy

FROM node:20-alpine AS runner
WORKDIR /app

# /deploy contains dist/, node_modules/, package.json — no symlinks, no workspace refs
COPY --from=builder /deploy ./

EXPOSE 3000
CMD ["node", "dist/main.js"]
