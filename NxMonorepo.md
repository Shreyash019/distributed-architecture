# Nx Monorepo — Full Engineer Control Guide

> Philosophy: Use Nx as a **task runner and dependency graph engine**, not as a black box generator.
> You own the structure, you own the config, Nx just orchestrates.

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Repository Structure](#2-repository-structure)
3. [Bootstrapping the Workspace](#3-bootstrapping-the-workspace)
4. [Nx Configuration — nx.json](#4-nx-configuration--nxjson)
5. [Project Configuration — project.json](#5-project-configuration--projectjson)
6. [Microservices Setup](#6-microservices-setup)
   - [Go Service — api-gateway](#61-go-service--api-gateway)
   - [NestJS Service — auth](#62-nestjs-service--auth)
   - [Python Service](#63-python-service)
   - [Java (Spring Boot) Service](#64-java-spring-boot-service)
7. [Microfrontend Setup](#7-microfrontend-setup)
   - [React.js App](#71-reactjs-app)
   - [Next.js App](#72-nextjs-app)
   - [Angular App](#73-angular-app)
   - [Vanilla JS App](#74-vanilla-js-app)
   - [React Native App](#75-react-native-app)
8. [Shared Packages](#8-shared-packages)
9. [Dependency Graph and Affected Commands](#9-dependency-graph-and-affected-commands)
10. [Caching Strategy](#10-caching-strategy)
11. [Custom Generators](#11-custom-generators)
12. [DevOps](#12-devops)
    - [Docker per Service](#121-docker-per-service)
    - [Docker Compose](#122-docker-compose)
    - [Kubernetes](#123-kubernetes)
    - [CI/CD (GitHub Actions)](#124-cicd-github-actions)
    - [Nginx — Reverse Proxy & L7 Load Balancing](#125-nginx--reverse-proxy--l7-load-balancing)
13. [Workspace Scripts](#13-workspace-scripts)
14. [Rules and Conventions](#14-rules-and-conventions)

---

## 1. Core Philosophy

### What Nx Does for You (and Nothing More)

| Nx Feature           | You Control                                |
|----------------------|--------------------------------------------|
| Task Runner          | You define every target in `project.json`  |
| Dependency Graph     | You declare `implicitDependencies`         |
| Affected Commands    | You configure `targetDefaults` in nx.json  |
| Remote Cache         | You choose: Nx Cloud, S3, local            |
| Generators           | You write your own in `tools/generators/`  |
| Plugins              | You install only what you explicitly need  |

### What You Avoid

- Never use `nx generate @nx/...` blindly without knowing what it writes.
- Never let Nx auto-detect projects via `glob` unless you explicitly set it.
- Never use `@nx/react`, `@nx/node` executors as black boxes — define your own `project.json` targets using raw CLI commands (vite, tsc, go build, mvn, etc.).
- Avoid `workspace.json` — use `project.json` per project for isolation.

---

## 2. Repository Structure

```
monorepo/
├── apps/                          # Microfrontends
│   ├── web/                       # React.js (Vite)
│   ├── dashboard/                 # Next.js
│   ├── admin/                     # Angular
│   ├── landing/                   # Vanilla JS
│   └── mobile/                    # React Native (Expo)
│
├── services/                      # Microservices
│   ├── api-gateway/               # Go (net/http) — high-concurrency gateway
│   ├── auth/                      # NestJS — authentication & authorization
│   ├── notification/              # Python (FastAPI)
│   └── payment/                   # Java (Spring Boot)
│
├── packages/                      # Shared internal libraries
│   ├── ui/                        # Shared React components
│   ├── types/                     # Shared TypeScript types/interfaces
│   ├── utils/                     # Shared JS/TS utilities
│   ├── config/                    # Shared ESLint, TSConfig, Prettier configs
│   └── proto/                     # Shared Protobuf / gRPC definitions
│
├── infra/                         # Infrastructure as Code
│   ├── docker/                    # Dockerfiles per service
│   ├── k8s/                       # Kubernetes manifests
│   │   ├── base/
│   │   └── overlays/
│   │       ├── dev/
│   │       ├── staging/
│   │       └── prod/
│   ├── terraform/                 # Cloud provisioning
│   └── docker-compose.yml         # Local dev orchestration
│
├── tools/                         # Workspace tooling — YOU own this
│   ├── generators/                # Custom Nx generators
│   │   ├── service/               # Generator: scaffold a new service
│   │   └── app/                   # Generator: scaffold a new frontend app
│   └── scripts/                   # Utility shell/node scripts
│
├── nx.json                        # Nx workspace config (minimal, explicit)
├── package.json                   # Root package (workspace manager only)
├── pnpm-workspace.yaml            # pnpm workspaces (or use npm/yarn)
├── tsconfig.base.json             # Base TS path aliases for packages/
└── .github/
    └── workflows/
        ├── ci.yml
        └── deploy.yml
```

---

## 3. Bootstrapping the Workspace

### 3.1 Initialize Bare Nx Workspace

```bash
# Create the monorepo directory
mkdir monorepo && cd monorepo

# Initialize with pnpm (recommended for monorepos)
pnpm init

# Install Nx core — nothing else
pnpm add -D nx
```

**Do NOT run `npx create-nx-workspace`** — that adds opinions. Start bare.

### 3.2 Root package.json

```json
{
  "name": "monorepo",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "nx": "nx",
    "build": "nx run-many -t build",
    "test": "nx run-many -t test",
    "lint": "nx run-many -t lint",
    "affected:build": "nx affected -t build",
    "affected:test": "nx affected -t test",
    "graph": "nx graph"
  },
  "devDependencies": {
    "nx": "^19.0.0"
  }
}
```

### 3.3 pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "services/*"
  - "packages/*"
  - "tools/*"
```

### 3.4 Create directory skeleton

```bash
mkdir -p apps services packages infra/docker infra/k8s/base infra/k8s/overlays/{dev,staging,prod} infra/terraform tools/generators tools/scripts
```

---

## 4. Nx Configuration — nx.json

This is the **only** global Nx config. Keep it explicit and minimal.

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "npmScope": "monorepo",

  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "sharedGlobals": ["{workspaceRoot}/nx.json"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/.eslintrc.json"
    ]
  },

  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production"],
      "cache": true
    },
    "lint": {
      "inputs": ["default"],
      "cache": true
    },
    "docker:build": {
      "dependsOn": ["build"],
      "cache": false
    }
  },

  "plugins": [],

  "defaultBase": "main"
}
```

> Key decisions:
> - `plugins: []` — no auto-detection, no surprises.
> - `targetDefaults` — global cache and dependency rules per target type.
> - `defaultBase` — affected commands diff against `main`.

---

## 5. Project Configuration — project.json

Every project (app, service, package) has its own `project.json`. You write it. Nx reads it.

### Anatomy of project.json

```json
{
  "name": "project-name",
  "projectType": "application",
  "root": "apps/web",
  "sourceRoot": "apps/web/src",
  "tags": ["scope:frontend", "type:app", "lang:ts"],
  "implicitDependencies": ["packages-ui", "packages-types"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vite build",
        "cwd": "{projectRoot}"
      }
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vite dev",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vitest run",
        "cwd": "{projectRoot}"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint src",
        "cwd": "{projectRoot}"
      }
    },
    "docker:build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "docker build -t monorepo/web:latest -f ../../infra/docker/web.Dockerfile .",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

> Rule: **Always use `nx:run-commands`** — it shells out to any CLI. You stay in control. Never use executor plugins as black boxes.

### Tags Convention

Use tags for enforcing module boundaries:

| Tag Pattern        | Purpose                                     |
|--------------------|---------------------------------------------|
| `scope:frontend`   | Frontend apps                               |
| `scope:backend`    | Backend services                            |
| `scope:shared`     | Shared packages                             |
| `type:app`         | Deployable application                      |
| `type:service`     | Microservice                                |
| `type:lib`         | Internal library                            |
| `lang:ts`          | TypeScript project                          |
| `lang:go`          | Go project                                  |
| `lang:python`      | Python project                              |
| `lang:java`        | Java project                                |
| `env:web`          | Runs in browser                             |
| `env:native`       | React Native                                |

---

## 6. Microservices Setup

### 6.1 Go Service — api-gateway

> Go is chosen for the API gateway because goroutines give you massive concurrency with low memory overhead — ideal for a gateway that proxies, rate-limits, and fans out to many downstream services simultaneously. Using the standard `net/http` package keeps the binary lean with zero external dependencies.

**Structure:** `services/api-gateway/`

```
services/api-gateway/
├── cmd/
│   └── main.go
├── internal/
│   ├── handlers/
│   ├── middleware/
│   └── proxy/
├── go.mod
├── go.sum
├── project.json
└── Dockerfile
```

**go.mod**
```
module github.com/yourorg/monorepo/services/api-gateway

go 1.22
```

**project.json**
```json
{
  "name": "api-gateway",
  "projectType": "application",
  "root": "services/api-gateway",
  "tags": ["scope:backend", "type:service", "lang:go"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "go build -o dist/api-gateway ./cmd/main.go",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/dist"]
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "go run ./cmd/main.go",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "go test ./...",
        "cwd": "{projectRoot}"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "golangci-lint run ./...",
        "cwd": "{projectRoot}"
      }
    },
    "docker:build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "docker build -t monorepo/api-gateway:latest .",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

> Note: Go has its own module system. The monorepo `pnpm-workspace.yaml` does NOT include Go services.
> Nx only orchestrates the CLI commands — Go dependency management stays with `go mod`.

---

### 6.2 NestJS Service — auth

> NestJS is chosen for the auth service because of its first-class support for Guards, decorators, Passport.js strategies (JWT, OAuth2), and a structured module system that keeps auth logic clean and testable.

**Structure:** `services/auth/`

```
services/auth/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── strategies/
│   │       ├── jwt.strategy.ts
│   │       └── local.strategy.ts
│   └── users/
├── package.json
├── tsconfig.json
├── project.json
└── Dockerfile
```

**package.json**
```json
{
  "name": "@monorepo/auth",
  "version": "0.0.1",
  "scripts": {},
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "passport-local": "^1.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  }
}
```

**project.json**
```json
{
  "name": "auth",
  "projectType": "application",
  "root": "services/auth",
  "sourceRoot": "services/auth/src",
  "tags": ["scope:backend", "type:service", "lang:ts"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "nest build",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/dist"]
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "nest start --watch",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "jest",
        "cwd": "{projectRoot}"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint src --ext .ts",
        "cwd": "{projectRoot}"
      }
    },
    "docker:build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "docker build -t monorepo/auth:latest .",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

---

### 6.3 Python Service

**Structure:** `services/notification/`

```
services/notification/
├── src/
│   └── main.py
├── tests/
├── pyproject.toml          # or requirements.txt
├── project.json
└── Dockerfile
```

**pyproject.toml** (using uv or poetry)
```toml
[project]
name = "notification"
version = "0.0.1"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.110.0",
  "uvicorn>=0.29.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
```

**project.json**
```json
{
  "name": "notification",
  "projectType": "application",
  "root": "services/notification",
  "tags": ["scope:backend", "type:service", "lang:python"],
  "targets": {
    "install": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv sync",
        "cwd": "{projectRoot}"
      }
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv run uvicorn src.main:app --reload --port 8002",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv run pytest",
        "cwd": "{projectRoot}"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "uv run ruff check src",
        "cwd": "{projectRoot}"
      }
    },
    "docker:build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "docker build -t monorepo/notification:latest .",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

---

### 6.4 Java (Spring Boot) Service

**Structure:** `services/payment/`

```
services/payment/
├── src/
│   └── main/
│       └── java/
│           └── com/monorepo/payment/
│               └── PaymentApplication.java
├── pom.xml                  # or build.gradle
├── project.json
└── Dockerfile
```

**project.json**
```json
{
  "name": "payment",
  "projectType": "application",
  "root": "services/payment",
  "tags": ["scope:backend", "type:service", "lang:java"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "./mvnw clean package -DskipTests",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/target"]
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "./mvnw spring-boot:run",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "./mvnw test",
        "cwd": "{projectRoot}"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "./mvnw checkstyle:check",
        "cwd": "{projectRoot}"
      }
    },
    "docker:build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "docker build -t monorepo/payment:latest .",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

---

## 7. Microfrontend Setup

### Module Federation Strategy

For true microfrontends, use **Module Federation** (Webpack 5 / Vite plugin).
Each app exposes components, a shell app consumes them at runtime.

```
apps/
├── shell/          # Host — loads remote apps at runtime
├── web/            # Remote — React.js microfrontend
├── dashboard/      # Remote — Next.js (SSR, standalone)
├── admin/          # Remote — Angular microfrontend
└── landing/        # Static — Vanilla JS, no federation needed
```

---

### 7.1 React.js App

**Structure:** `apps/web/`

```
apps/web/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   └── bootstrap.tsx      # Required for Module Federation async loading
├── vite.config.ts
├── package.json
├── tsconfig.json
└── project.json
```

**vite.config.ts** (with Module Federation)
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'web',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  build: {
    target: 'esnext',
  },
});
```

**project.json**
```json
{
  "name": "web",
  "projectType": "application",
  "root": "apps/web",
  "sourceRoot": "apps/web/src",
  "tags": ["scope:frontend", "type:app", "lang:ts", "env:web"],
  "implicitDependencies": ["packages-ui", "packages-types", "packages-utils"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vite build",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/dist"]
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vite --port 3001",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vitest run",
        "cwd": "{projectRoot}"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint src --ext .ts,.tsx",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

---

### 7.2 Next.js App

**Structure:** `apps/dashboard/`

```
apps/dashboard/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── next.config.ts
├── package.json
├── tsconfig.json
└── project.json
```

**project.json**
```json
{
  "name": "dashboard",
  "projectType": "application",
  "root": "apps/dashboard",
  "sourceRoot": "apps/dashboard",
  "tags": ["scope:frontend", "type:app", "lang:ts", "env:web"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "next build",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/.next"]
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "next dev -p 3002",
        "cwd": "{projectRoot}"
      }
    },
    "start": {
      "executor": "nx:run-commands",
      "options": {
        "command": "next start -p 3002",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "jest",
        "cwd": "{projectRoot}"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "next lint",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

---

### 7.3 Angular App

**Structure:** `apps/admin/`

```
apps/admin/
├── src/
│   ├── main.ts
│   ├── app/
│   └── environments/
├── angular.json           # Angular's own config
├── package.json
├── tsconfig.json
└── project.json
```

**project.json** — Nx delegates to Angular CLI
```json
{
  "name": "admin",
  "projectType": "application",
  "root": "apps/admin",
  "sourceRoot": "apps/admin/src",
  "tags": ["scope:frontend", "type:app", "lang:ts", "env:web"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "ng build --configuration=production",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/dist"]
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "ng serve --port 3003",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "ng test --watch=false",
        "cwd": "{projectRoot}"
      }
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "ng lint",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

> Angular has its own `angular.json`. You still control it. Nx just runs `ng` CLI commands.

---

### 7.4 Vanilla JS App

**Structure:** `apps/landing/`

```
apps/landing/
├── src/
│   ├── index.html
│   ├── main.js
│   └── styles.css
├── vite.config.js
├── package.json
└── project.json
```

**project.json**
```json
{
  "name": "landing",
  "projectType": "application",
  "root": "apps/landing",
  "tags": ["scope:frontend", "type:app", "lang:js", "env:web"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vite build",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/dist"]
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vite --port 3004",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

---

### 7.5 React Native App

**Structure:** `apps/mobile/`

```
apps/mobile/
├── src/
│   ├── App.tsx
│   └── screens/
├── app.json
├── metro.config.js
├── package.json
├── tsconfig.json
└── project.json
```

**project.json**
```json
{
  "name": "mobile",
  "projectType": "application",
  "root": "apps/mobile",
  "sourceRoot": "apps/mobile/src",
  "tags": ["scope:frontend", "type:app", "lang:ts", "env:native"],
  "targets": {
    "start": {
      "executor": "nx:run-commands",
      "options": {
        "command": "expo start",
        "cwd": "{projectRoot}"
      }
    },
    "android": {
      "executor": "nx:run-commands",
      "options": {
        "command": "expo run:android",
        "cwd": "{projectRoot}"
      }
    },
    "ios": {
      "executor": "nx:run-commands",
      "options": {
        "command": "expo run:ios",
        "cwd": "{projectRoot}"
      }
    },
    "build:android": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eas build --platform android",
        "cwd": "{projectRoot}"
      }
    },
    "build:ios": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eas build --platform ios",
        "cwd": "{projectRoot}"
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "jest",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

> React Native does NOT use Module Federation. It is a standalone app deployed via EAS (Expo Application Services) or native CI.

---

## 8. Shared Packages

Packages are libraries consumed by both frontend apps and backend services where applicable.

### 8.1 packages/types — Shared TypeScript Types

```
packages/types/
├── src/
│   ├── index.ts
│   ├── user.ts
│   └── api.ts
├── package.json
├── tsconfig.json
└── project.json
```

**package.json**
```json
{
  "name": "@monorepo/types",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

**project.json**
```json
{
  "name": "packages-types",
  "projectType": "library",
  "root": "packages/types",
  "sourceRoot": "packages/types/src",
  "tags": ["scope:shared", "type:lib", "lang:ts"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc -p tsconfig.json",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/dist"]
    },
    "lint": {
      "executor": "nx:run-commands",
      "options": {
        "command": "eslint src --ext .ts",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

### 8.2 tsconfig.base.json — Path Aliases

At the **root**, configure TypeScript path aliases so imports work across all TypeScript projects:

```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "dom"],
    "skipLibCheck": true,
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@monorepo/types": ["packages/types/src/index.ts"],
      "@monorepo/utils": ["packages/utils/src/index.ts"],
      "@monorepo/ui": ["packages/ui/src/index.ts"],
      "@monorepo/config/*": ["packages/config/*"]
    }
  },
  "exclude": ["node_modules", "**/dist"]
}
```

Each app/service `tsconfig.json` extends this:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

---

## 9. Dependency Graph and Affected Commands

### How Nx Detects Dependencies

Nx builds a project graph from:
1. **`implicitDependencies`** — explicitly declared in `project.json`
2. **Import analysis** — Nx scans TypeScript imports and detects usage of `@monorepo/*` packages

For non-JS projects (Go, Python, Java), Nx cannot auto-detect deps. Use `implicitDependencies`:

```json
// services/api-gateway/project.json
{
  "implicitDependencies": ["packages-proto"]
}
```

### Useful Commands

```bash
# Visualize the full project graph
nx graph

# Run build only for projects affected by changes since main
nx affected -t build

# Run tests for affected projects
nx affected -t test

# Run affected against a specific base commit
nx affected -t build --base=HEAD~3

# See what's affected without running
nx affected:graph

# Run target across ALL projects
nx run-many -t build

# Run target for specific projects
nx run-many -t build -p web dashboard api-gateway

# Run target for all projects with a specific tag
nx run-many -t test --projects=tag:lang:go
```

---

## 10. Caching Strategy

### Local Cache (default)

Nx caches task outputs in `.nx/cache/` by default. No config needed.

### Remote Cache Options

#### Option A: Nx Cloud (simplest)

```bash
pnpm add -D @nx/nx-cloud
```

In `nx.json`:
```json
{
  "nxCloudAccessToken": "YOUR_TOKEN"
}
```

#### Option B: Custom S3 Remote Cache (full control)

```bash
pnpm add -D @nx/powerpack-s3-cache
```

In `nx.json`:
```json
{
  "cache": {
    "remote": {
      "provider": "s3",
      "options": {
        "bucket": "your-nx-cache-bucket",
        "region": "us-east-1"
      }
    }
  }
}
```

#### Option C: Self-hosted (open source)

Use `nx-remotecache-s3` or `nx-remotecache-gcs` community packages.

### Cache Invalidation

Control what invalidates cache with `inputs` in `nx.json` `targetDefaults` or per-target in `project.json`:

```json
"build": {
  "inputs": [
    "{projectRoot}/src/**/*",
    "{projectRoot}/package.json",
    "!{projectRoot}/**/*.spec.ts"
  ],
  "outputs": ["{projectRoot}/dist"],
  "cache": true
}
```

---

## 11. Custom Generators

Instead of using Nx plugin generators, write your own. This gives you full template control.

### 11.1 Generator Structure

```
tools/generators/
├── service/
│   ├── index.ts           # Generator logic
│   ├── schema.json        # Input schema
│   └── files/             # Template files
│       ├── src/
│       │   └── index.ts__template__
│       ├── project.json__template__
│       └── Dockerfile__template__
└── app/
    ├── index.ts
    ├── schema.json
    └── files/
```

### 11.2 schema.json

```json
{
  "$schema": "http://json-schema.org/schema",
  "title": "Service Generator",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Service name",
      "$default": { "$source": "argv", "index": 0 }
    },
    "language": {
      "type": "string",
      "enum": ["node", "go", "python", "java"],
      "description": "Service language"
    },
    "port": {
      "type": "number",
      "description": "Port the service runs on",
      "default": 8080
    }
  },
  "required": ["name", "language"]
}
```

### 11.3 index.ts — Generator Logic

```typescript
import {
  Tree,
  generateFiles,
  joinPathFragments,
  formatFiles,
} from '@nx/devkit';
import * as path from 'path';

interface ServiceSchema {
  name: string;
  language: 'node' | 'go' | 'python' | 'java';
  port: number;
}

export default async function serviceGenerator(tree: Tree, schema: ServiceSchema) {
  const serviceRoot = `services/${schema.name}`;

  // Generate files from templates
  generateFiles(
    tree,
    path.join(__dirname, 'files', schema.language),
    serviceRoot,
    {
      ...schema,
      tmpl: '',
    }
  );

  await formatFiles(tree);

  return () => {
    console.log(`Service "${schema.name}" scaffolded at ${serviceRoot}`);
    console.log(`Add it to your pnpm workspace and run: nx build ${schema.name}`);
  };
}
```

### 11.4 Register in package.json

```json
// tools/generators/package.json
{
  "name": "@monorepo/generators",
  "version": "0.0.1",
  "generators": "./generators.json"
}
```

```json
// tools/generators/generators.json
{
  "generators": {
    "service": {
      "factory": "./service/index",
      "schema": "./service/schema.json",
      "description": "Scaffold a new microservice"
    },
    "app": {
      "factory": "./app/index",
      "schema": "./app/schema.json",
      "description": "Scaffold a new frontend app"
    }
  }
}
```

### 11.5 Run Your Generator

```bash
nx generate @monorepo/generators:service --name=inventory --language=go --port=8003
nx generate @monorepo/generators:app --name=portal --framework=react --port=3005
```

---

## 12. DevOps

### 12.1 Docker per Service

Each service/app contains its own `Dockerfile`. Stored in the project root.

**Go Dockerfile** (`services/api-gateway/Dockerfile`):
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o dist/api-gateway ./cmd/main.go

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/dist/api-gateway .
EXPOSE 8000
CMD ["./api-gateway"]
```

**NestJS Dockerfile** (`services/auth/Dockerfile`):
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8001
CMD ["node", "dist/main.js"]
```

**Python Dockerfile** (`services/notification/Dockerfile`):
```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /app/.venv ./.venv
COPY src ./src
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8002
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8002"]
```

**Java Dockerfile** (`services/payment/Dockerfile`):
```dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:resolve
COPY src ./src
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE 8003
CMD ["java", "-jar", "app.jar"]
```

---

### 12.2 Docker Compose

`infra/docker-compose.yml` — local development orchestration:

```yaml
version: "3.9"

services:
  api-gateway:
    build:
      context: ../services/api-gateway
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - AUTH_SERVICE_URL=http://auth:8001
      - NOTIFICATION_SERVICE_URL=http://notification:8002
      - PAYMENT_SERVICE_URL=http://payment:8003
    depends_on:
      - auth
      - notification
      - payment

  auth:
    build:
      context: ../services/auth
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/auth

  notification:
    build:
      context: ../services/notification
      dockerfile: Dockerfile
    ports:
      - "8002:8002"
    environment:
      - RABBITMQ_URL=amqp://rabbitmq:5672

  payment:
    build:
      context: ../services/payment
      dockerfile: Dockerfile
    ports:
      - "8003:8003"
    environment:
      - DATABASE_URL=postgres://user:pass@postgres:5432/payment

  # Infrastructure
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  rabbitmq:
    image: rabbitmq:3-management-alpine
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  postgres_data:
```

```bash
# Add target to root package.json scripts or use Nx
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml down
```

---

### 12.3 Kubernetes

**Structure:**
```
infra/k8s/
├── base/
│   ├── api-gateway/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── kustomization.yaml
│   ├── auth/
│   └── ...
└── overlays/
    ├── dev/
    │   └── kustomization.yaml
    ├── staging/
    │   └── kustomization.yaml
    └── prod/
        └── kustomization.yaml
```

**base/api-gateway/deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api-gateway
          image: monorepo/api-gateway:latest
          ports:
            - containerPort: 8000
          env:
            - name: AUTH_SERVICE_URL
              value: http://auth:8001
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
```

**overlays/prod/kustomization.yaml**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../../base

images:
  - name: monorepo/api-gateway
    newTag: "1.2.3"
  - name: monorepo/auth
    newTag: "1.2.3"

patches:
  - path: replicas-patch.yaml
```

```bash
# Deploy to prod
kubectl apply -k infra/k8s/overlays/prod

# Nx target for deploy
# project.json in root or per-service can define:
# "deploy": { "command": "kubectl apply -k infra/k8s/overlays/prod" }
```

---

### 12.4 CI/CD (GitHub Actions)

**`.github/workflows/ci.yml`** — Affected-based CI:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required for nx affected

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.22"

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: "temurin"
          java-version: "21"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Derive SHAs for Nx affected
        uses: nrwl/nx-set-shas@v4

      - name: Lint affected
        run: pnpm nx affected -t lint

      - name: Test affected
        run: pnpm nx affected -t test

      - name: Build affected
        run: pnpm nx affected -t build
```

**`.github/workflows/deploy.yml`** — Deploy on merge to main:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  docker-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Derive SHAs
        uses: nrwl/nx-set-shas@v4

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}

      - name: Build and push Docker images (affected only)
        run: pnpm nx affected -t docker:build --configuration=production
```

---

### 12.5 Nginx — Reverse Proxy & L7 Load Balancing

#### Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────────┐
│  Nginx  (port 80 / 443)                 │
│  • SSL termination                      │
│  • Rate limiting                        │
│  • Gzip compression                     │
│  • L7 path-based routing                │
│  • Load balancing across api-gateway    │
└──────────┬──────────────────────────────┘
           │   upstream: api_gateway_cluster
     ┌─────┴──────┬──────────────┐
     ▼            ▼              ▼
api-gateway:8000  api-gateway:8000  api-gateway:8000
  (replica 1)      (replica 2)      (replica 3)
           │
           │  internal routing (Go net/http ReverseProxy)
     ┌─────┴───────────────────────────────┐
     ▼         ▼           ▼               ▼
  auth:8001  notification:8002  payment:8003  ...
```

**Why two layers?**
- **Nginx** is the public edge: SSL, rate limiting, gzip, L7 load balancing across `api-gateway` replicas
- **api-gateway (Go)** is the internal router: path → microservice mapping, no external exposure

---

#### Folder Structure

```
infrastructure/
└── nginx/
    ├── nginx.conf              # main config (worker tuning, events)
    ├── conf.d/
    │   ├── upstream.conf       # upstream blocks (service clusters)
    │   └── default.conf        # server block (locations, routing rules)
    └── ssl/                    # certs (gitignored, managed via secrets)
        ├── cert.pem
        └── key.pem
```

> Add `infrastructure/nginx/ssl/` to `.gitignore`. Use Let's Encrypt / cert-manager in production.

---

#### `infrastructure/nginx/nginx.conf`

```nginx
# Main process config — you control every knob
worker_processes auto;                  # one worker per CPU core
worker_rlimit_nofile 65535;             # max open file descriptors

error_log /var/log/nginx/error.log warn;
pid       /var/run/nginx.pid;

events {
    worker_connections 4096;            # per worker
    use epoll;                          # Linux I/O model (best for high concurrency)
    multi_accept on;                    # accept all new connections at once
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time uct=$upstream_connect_time '
                    'uht=$upstream_header_time urt=$upstream_response_time';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    server_tokens off;                  # hide Nginx version

    # Rate limiting zones (defined globally, applied per location)
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;
    limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/s;

    # Include server blocks
    include /etc/nginx/conf.d/*.conf;
}
```

---

#### `infrastructure/nginx/conf.d/upstream.conf`

```nginx
# L7 Load Balancing — upstream blocks
# Each upstream = a cluster of instances of the same service
# Nginx distributes requests across them at layer 7 (HTTP)

upstream api_gateway_cluster {
    # Algorithm options (uncomment one):
    # round-robin     → default, no keyword needed. Equal distribution.
    # least_conn;     → send to instance with fewest active connections
    # ip_hash;        → sticky sessions — same client IP always hits same server
    least_conn;

    # In Docker Compose: scale with `docker compose up --scale api-gateway=3`
    # Nginx resolves the hostname to all container IPs automatically
    server api-gateway:8000 weight=1 max_fails=3 fail_timeout=30s;

    # For local multi-instance testing (manual):
    # server api-gateway-1:8000 weight=1 max_fails=3 fail_timeout=30s;
    # server api-gateway-2:8000 weight=1 max_fails=3 fail_timeout=30s;
    # server api-gateway-3:8000 weight=1 max_fails=3 fail_timeout=30s;

    # Keepalive connections to upstream (avoid TCP handshake per request)
    keepalive 32;
}

# Direct upstream per service (used if Nginx routes directly, bypassing api-gateway)
# Only needed if you want Nginx to do path-based routing without api-gateway
upstream auth_cluster {
    least_conn;
    server auth:8001 max_fails=3 fail_timeout=30s;
    keepalive 16;
}

upstream notification_cluster {
    least_conn;
    server notification:8002 max_fails=3 fail_timeout=30s;
    keepalive 16;
}

upstream payment_cluster {
    least_conn;
    server payment:8003 max_fails=3 fail_timeout=30s;
    keepalive 16;
}
```

---

#### `infrastructure/nginx/conf.d/default.conf`

```nginx
# HTTP → redirect to HTTPS (production)
server {
    listen 80;
    server_name _;

    # In local dev: serve HTTP directly (comment out the redirect below)
    # In production: force HTTPS
    return 301 https://$host$request_uri;
}

# Main server block
server {
    listen 443 ssl http2;               # HTTP/2 for performance
    server_name api.yourdomain.com;     # replace with your domain

    # SSL (production: Let's Encrypt via cert-manager)
    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy timeouts
    proxy_connect_timeout 10s;
    proxy_send_timeout    60s;
    proxy_read_timeout    60s;

    # Pass real client IP to upstream
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Keepalive to upstream
    proxy_http_version 1.1;
    proxy_set_header Connection "";

    # ── L7 Routing ──────────────────────────────────────────────────
    # All traffic → api-gateway cluster (recommended: api-gateway handles routing)
    location / {
        limit_req zone=api_limit burst=200 nodelay;
        proxy_pass http://api_gateway_cluster;
    }

    # Auth endpoints: tighter rate limit (brute force protection)
    location /auth/ {
        limit_req zone=auth_limit burst=20 nodelay;
        proxy_pass http://api_gateway_cluster;
    }

    # Health check endpoint (no rate limiting, no auth)
    location /health {
        access_log off;
        proxy_pass http://api_gateway_cluster;
    }

    # Nginx own status page (internal only)
    location /nginx-status {
        stub_status on;
        allow 127.0.0.1;
        deny all;
    }
}

# ── Local Dev Server (HTTP only, no SSL) ────────────────────────────
# Use this block instead of the two above when running locally
# Uncomment and comment out the two blocks above

# server {
#     listen 80;
#     server_name localhost;
#
#     location / {
#         limit_req zone=api_limit burst=200 nodelay;
#         proxy_pass http://api_gateway_cluster;
#         proxy_set_header Host            $host;
#         proxy_set_header X-Real-IP       $remote_addr;
#         proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#         proxy_http_version 1.1;
#         proxy_set_header Connection "";
#     }
#
#     location /auth/ {
#         limit_req zone=auth_limit burst=20 nodelay;
#         proxy_pass http://api_gateway_cluster;
#     }
# }
```

---

#### Add Nginx to Docker Compose

Update `docker-compose.yml` — add the `nginx` service and remove exposed ports from `api-gateway` (Nginx is now the only public entry point):

```yaml
services:
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"               # remove for local dev if not using SSL
    volumes:
      - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./infrastructure/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./infrastructure/nginx/ssl:/etc/nginx/ssl:ro   # remove for local dev
    depends_on:
      - api-gateway
    restart: unless-stopped

  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    # No "ports:" here — Nginx is the only public entry point
    # api-gateway is internal only (Docker network)
    expose:
      - "8000"
    environment:
      - AUTH_SERVICE_URL=http://auth:8001
      - NOTIFICATION_SERVICE_URL=http://notification:8002
      - PAYMENT_SERVICE_URL=http://payment:8003
    depends_on:
      - auth
      - notification
      - payment

  # Scale api-gateway: docker compose up --scale api-gateway=3
  # Nginx upstream will automatically load balance across all replicas
```

---

#### Kubernetes — Nginx Ingress Controller

In production, replace the Nginx container with the **Nginx Ingress Controller**:

```bash
# Install via Helm
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx
```

`infrastructure/k8s/base/ingress.yaml`:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: monorepo-ingress
  annotations:
    nginx.ingress.kubernetes.io/use-regex: "true"
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  rules:
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 8000
```

> In K8s, load balancing across `api-gateway` pods is handled by the **Service** (`ClusterIP` with `kube-proxy`). The Ingress controller handles edge routing and SSL.

---

#### L7 Load Balancing Algorithm — When to Use Which

| Algorithm | Config | Use When |
|---|---|---|
| Round Robin | *(default)* | Stateless services, equal request weight |
| `least_conn` | `least_conn;` | Requests vary in duration (recommended for APIs) |
| `ip_hash` | `ip_hash;` | Need sticky sessions (avoid if using JWT — you don't) |
| `random two least_conn` | `random two least_conn;` | Large upstream pools (10+ instances) |

Since this project uses **JWT** (stateless auth), `least_conn` is the right choice — no sticky sessions needed.

---

## 13. Workspace Scripts

Add useful scripts in `tools/scripts/` for tasks Nx doesn't cover.

**`tools/scripts/new-service.sh`** — Quick scaffold helper:
```bash
#!/bin/bash
# Usage: ./tools/scripts/new-service.sh inventory go 8003
NAME=$1
LANG=$2
PORT=$3

nx generate @monorepo/generators:service \
  --name="$NAME" \
  --language="$LANG" \
  --port="$PORT"

echo "Done! Next steps:"
echo "  1. cd services/$NAME"
echo "  2. Initialize your $LANG project"
echo "  3. Update infra/docker-compose.yml"
echo "  4. Add infra/k8s/base/$NAME/ manifests"
```

**`tools/scripts/docker-build-all.sh`**:
```bash
#!/bin/bash
nx run-many -t docker:build --all
```

**`tools/scripts/version-bump.sh`**:
```bash
#!/bin/bash
# Bump version in all affected project.json files
VERSION=$1
nx affected --target=version --args="--newVersion=$VERSION"
```

---

## 14. Rules and Conventions

### Module Boundary Rules (ESLint)

Install `@nx/eslint-plugin` for boundary enforcement:

```bash
pnpm add -D @nx/eslint-plugin
```

**Root `.eslintrc.json`:**
```json
{
  "root": true,
  "plugins": ["@nx"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependency": true,
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "scope:frontend",
                "onlyDependOnLibsWithTags": ["scope:frontend", "scope:shared"]
              },
              {
                "sourceTag": "scope:backend",
                "onlyDependOnLibsWithTags": ["scope:backend", "scope:shared"]
              },
              {
                "sourceTag": "scope:shared",
                "onlyDependOnLibsWithTags": ["scope:shared"]
              },
              {
                "sourceTag": "env:native",
                "bannedExternalImports": ["@monorepo/ui"]
              }
            ]
          }
        ]
      }
    }
  ]
}
```

### Naming Conventions

| Item              | Convention                        | Example                  |
|-------------------|-----------------------------------|--------------------------|
| Service folder    | kebab-case                        | `api-gateway`            |
| App folder        | kebab-case                        | `web`, `dashboard`       |
| Package folder    | kebab-case                        | `types`, `ui`            |
| Nx project name   | kebab-case (prefixed for packages)| `packages-types`         |
| Docker image      | `monorepo/<name>:<tag>`           | `monorepo/auth:1.2.3`    |
| Package name      | `@monorepo/<name>`                | `@monorepo/types`        |
| Env var files     | `.env.<environment>`              | `.env.local`, `.env.prod`|

### Git Conventions

```
feat(auth): add OAuth2 provider
fix(api-gateway): correct rate limit header
chore(web): upgrade vite to v6
ci: add Go lint step to workflow
docs: update NxMonorepo.md with K8s section
```

### Port Allocation

| Service/App     | Port  |
|-----------------|-------|
| api-gateway     | 8000  |
| auth            | 8001  |
| notification    | 8002  |
| payment         | 8003  |
| web (React)     | 3001  |
| dashboard (Next)| 3002  |
| admin (Angular) | 3003  |
| landing         | 3004  |
| shell (host)    | 3000  |

---

## Quick Reference

```bash
# --- Development ---
nx serve web                        # Start React app
nx serve dashboard                  # Start Next.js app
nx serve api-gateway                # Start Go gateway
nx serve auth                       # Start NestJS auth service

# --- Build ---
nx build web                        # Build one project
nx run-many -t build                # Build all projects
nx affected -t build                # Build only affected

# --- Test ---
nx test packages-types              # Test one package
nx affected -t test                 # Test only affected

# --- Graph ---
nx graph                            # Full dependency graph
nx affected:graph                   # Affected dependency graph

# --- Docker ---
nx docker:build api-gateway         # Build one Docker image
nx run-many -t docker:build         # Build all Docker images
nx affected -t docker:build         # Build affected Docker images

# --- Generators ---
nx generate @monorepo/generators:service --name=inventory --language=go
nx generate @monorepo/generators:app --name=portal --framework=react

# --- Local Infra ---
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml down
```
