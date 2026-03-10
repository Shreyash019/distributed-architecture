# Distributed Architecture Monorepo

## Quick Start (3 Commands)

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

If needed, edit `.env` before running `docker compose up -d`.

## Useful Commands

```bash
pnpm run docker:up
pnpm run docker:down
pnpm nx lint auth-service
pnpm nx build api-gateway
```

## Documentation

- Environment variables and onboarding: `environment.md`
- Monorepo architecture guide: `NxMonorepo.md`
