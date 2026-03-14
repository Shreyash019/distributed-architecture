# Build context must be the monorepo root:
#   docker build -f services/auth-service/Dockerfile .
# syntax=docker/dockerfile:1


FROM node:20-alpine AS builder
WORKDIR /app

# ── Install pnpm once. This layer is only invalidated when the base image changes.
RUN npm install -g pnpm

# ── DEPENDENCY LAYER ─────────────────────────────────────────────────────────
# Copy ONLY manifest / lock files — no source code yet.
# This layer (and the pnpm install below) is cached and reused on every push
# unless package.json or pnpm-lock.yaml actually changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/logger-ts/package.json           ./packages/logger-ts/
COPY packages/postgres-connector-ts/package.json ./packages/postgres-connector-ts/
COPY services/auth-service/package.json        ./services/auth-service/

# Install deps — skipped on cache hit; only re-runs when manifests/lock change.
# --mount=type=cache keeps the pnpm content-addressable store across builds so
# even on a cache miss individual packages are not re-downloaded from the registry.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── SOURCE LAYER ─────────────────────────────────────────────────────────────
# Source changes invalidate only the layers below, never the install layer.
COPY packages/logger-ts           ./packages/logger-ts
COPY packages/postgres-connector-ts ./packages/postgres-connector-ts
COPY services/auth-service        ./services/auth-service

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
