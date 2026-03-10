<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Monorepo Type Resolution Fix (March 2026)

### Issue

ESLint reported:

`@typescript-eslint/no-unsafe-call`

on the `createTypeOrmConfig(...)` call in `src/databases/TypeOrmModule.ts` even though the function is typed in the shared workspace package.

### Root cause

Type-aware linting in the monorepo could not consistently resolve callable types imported from `postgres-connector-ts` when using parser `projectService` and package metadata without explicit `exports`.

### Fixes applied

1. Updated auth-service ESLint parser settings to use explicit TypeScript project:
  - File: `services/auth-service/eslint.config.mjs`
  - Change: `parserOptions.projectService: true` -> `parserOptions.project: ['./tsconfig.json']`
2. Added explicit package export map in shared package metadata:
  - File: `packages/postgres-connector-ts/package.json`
  - Added `exports` with `types`, `require`, and `default` for `.`
  - Added `files: ["dist"]`
3. Kept package compiler settings aligned for NodeNext resolution:
  - File: `packages/postgres-connector-ts/tsconfig.json`
  - Uses `module: "nodenext"` and `moduleResolution: "nodenext"`

### Verification

Run:

```bash
pnpm nx lint auth-service
```

Expected result:

- No `no-unsafe-call` error in `src/databases/TypeOrmModule.ts`.
- Lint may still show unrelated warnings (for example `no-floating-promises` in `src/main.ts`).

### Why this is the preferred fix

- Avoids bypassing package boundaries with deep relative imports.
- Keeps workspace packages consumable via stable public entrypoints.
- Uses explicit parser project config, which is a common and reliable setup for type-aware linting in monorepos.

## PgBouncer Pooling Fix (March 2026)

### Issue

`TypeOrmModule` failed to connect with:

`server login failed: wrong password type`

while connecting through PgBouncer.

### Root cause

PostgreSQL 16 default auth is SCRAM, but PgBouncer was configured with `auth_type=md5`.
That mismatch caused upstream server authentication to fail.

### Fixes applied

1. Updated PgBouncer auth type to SCRAM:
  - File: `docker-compose.yml`
  - Service: `pgbouncer`
  - Added env: `AUTH_TYPE: scram-sha-256`
2. Kept pooled routing enabled in local/dev envs:
  - File: `.env`
  - `DB_POSTGRES_HOST=pgbouncer`
  - `DB_POSTGRES_PORT=6432`
3. Kept auth-service local env aligned with PgBouncer:
  - File: `services/auth-service/.env`
  - `DB_POSTGRES_PORT=6432`

### Verification

```bash
docker compose up -d postgres pgbouncer auth-service
docker compose logs --no-color --tail=120 pgbouncer
docker compose logs --no-color --tail=120 auth-service
```

Expected result:

- PgBouncer startup output includes `auth_type = scram-sha-256`.
- auth-service starts without `TypeOrmModule` retry failures.
- No `wrong password type` / `cannot do SCRAM authentication` in PgBouncer logs.

### Notes

- Keep PgBouncer in `transaction` pool mode for stateless API workloads.
- If credentials rotate, recreate `pgbouncer` so generated auth files are refreshed.
