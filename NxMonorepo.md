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
   - [Node.js Service](#61-nodejs-service)
   - [Go Service](#62-go-service)
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
│   ├── api-gateway/               # Node.js (Fastify)
│   ├── auth/                      # Go (Gin)
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

### 6.1 Node.js Service

**Structure:** `services/api-gateway/`

```
services/api-gateway/
├── src/
│   ├── index.ts
│   ├── routes/
│   └── middleware/
├── package.json
├── tsconfig.json
├── project.json
└── Dockerfile
```

**package.json**
```json
{
  "name": "@monorepo/api-gateway",
  "version": "0.0.1",
  "scripts": {},
  "dependencies": {
    "fastify": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0"
  }
}
```

**project.json**
```json
{
  "name": "api-gateway",
  "projectType": "application",
  "root": "services/api-gateway",
  "sourceRoot": "services/api-gateway/src",
  "tags": ["scope:backend", "type:service", "lang:ts"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsc -p tsconfig.json",
        "cwd": "{projectRoot}"
      },
      "outputs": ["{projectRoot}/dist"]
    },
    "serve": {
      "executor": "nx:run-commands",
      "options": {
        "command": "tsx watch src/index.ts",
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
        "command": "eslint src --ext .ts",
        "cwd": "{projectRoot}"
      }
    },
    "docker:build": {
      "executor": "nx:run-commands",
      "dependsOn": ["build"],
      "options": {
        "command": "docker build -t monorepo/api-gateway:latest .",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

---

### 6.2 Go Service

**Structure:** `services/auth/`

```
services/auth/
├── cmd/
│   └── main.go
├── internal/
│   ├── handlers/
│   └── middleware/
├── go.mod
├── go.sum
├── project.json
└── Dockerfile
```

**go.mod**
```
module github.com/yourorg/monorepo/services/auth

go 1.22

require (
  github.com/gin-gonic/gin v1.10.0
)
```

**project.json**
```json
{
  "name": "auth",
  "projectType": "application",
  "root": "services/auth",
  "tags": ["scope:backend", "type:service", "lang:go"],
  "targets": {
    "build": {
      "executor": "nx:run-commands",
      "options": {
        "command": "go build -o dist/auth ./cmd/main.go",
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
        "command": "docker build -t monorepo/auth:latest .",
        "cwd": "{projectRoot}"
      }
    }
  }
}
```

> Note: Go has its own module system. The monorepo `pnpm-workspace.yaml` does NOT include Go services.
> Nx only orchestrates the CLI commands — Go dependency management stays with `go mod`.

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
// services/auth/project.json
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

**Node.js Dockerfile** (`services/api-gateway/Dockerfile`):
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
EXPOSE 8000
CMD ["node", "dist/index.js"]
```

**Go Dockerfile** (`services/auth/Dockerfile`):
```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o dist/auth ./cmd/main.go

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/dist/auth .
EXPOSE 8001
CMD ["./auth"]
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
nx serve api-gateway                # Start Node service
nx serve auth                       # Start Go service

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
