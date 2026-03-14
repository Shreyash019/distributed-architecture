# Build context must be the monorepo root:
#   docker build -f services/notification-service/Dockerfile .
# syntax=docker/dockerfile:1


FROM node:20-alpine AS builder
WORKDIR /app

# ── Install pnpm once. This layer is only invalidated when the base image changes.
RUN npm install -g pnpm

# ── DEPENDENCY LAYER ─────────────────────────────────────────────────────────
# Copy ONLY manifest / lock files — no source code yet.
# pnpm install below is cached and reused on every push unless a
# package.json or pnpm-lock.yaml actually changes.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY services/notification-service/package.json ./services/notification-service/

# Install deps — skipped on cache hit; only re-runs when manifests/lock change.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ── SOURCE LAYER ─────────────────────────────────────────────────────────────
# Source changes invalidate only the layers below, never the install layer.
COPY services/notification-service ./services/notification-service

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
