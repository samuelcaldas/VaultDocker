# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server on port 9002 (Turbopack)
npm run lint         # ESLint — zero warnings gate
npm run typecheck    # tsc --noEmit strict check
npm run build        # Production build (skips TS/ESLint — always run lint+typecheck manually)

# Tests
npx vitest run                          # All unit tests
npx vitest run tests/unit/foo.spec.ts   # Single unit test file
npx playwright test                     # E2E tests (requires dev server)

# DB
npm run prisma:migrate   # Apply migrations (dev)
npm run prisma:seed      # Seed admin user + default settings
npm run prisma:generate  # Regenerate Prisma client after schema changes

# AI flows
npm run genkit:dev       # Genkit dev tooling
```

## Architecture

**VaultDocker** is a Next.js 15 App Router + TypeScript strict application for managing Docker volume backups.

### Layer Map

```
src/
  app/
    (dashboard)/         # All authenticated pages (layout wraps with AppSidebar + Navbar)
    api/                 # Route handlers: auth, health, jobs, profile, restore, runs,
                         #   settings, storage, users, volumes
    login/               # Unauthenticated login page
  server/
    services/            # BackupService, RestoreService, VolumeService,
                         #   StorageProviderService, SchedulerService
    repositories/        # Prisma wrappers — no direct Prisma usage outside here
    storage/             # Provider adapters (adapters/), factory, validator, codec
    auth/                # Password hashing
    bootstrap.ts         # Admin seed + default settings on first boot (idempotent)
    crypto.ts            # AES-256-GCM for provider config at rest
    env.ts               # requireEnv() — fail-fast for missing vars
  ai/
    flows/               # Genkit flows: backup-naming-assistant, exclusion-pattern-suggester,
                         #   backup-log-summarizer-flow
    genkit.ts            # Shared Genkit instance (googleai/gemini-2.5-flash)
  auth.config.ts         # NextAuth JWT + session callbacks (no providers here)
  auth.ts                # NextAuth with Credentials provider
  middleware.ts          # Protects all non-auth routes
  components/ui/         # shadcn/ui Radix primitives
  components/layout/     # Navbar, Sidebar shell components
```

### Key Conventions

- **Repository pattern**: all Prisma access goes through `src/server/repositories/`. Service layer calls repositories, never `db` directly.
- **Storage adapters**: each provider implements `StorageAdapter` interface (`src/server/storage/storage-adapter.ts`). Factory in `storage-adapter-factory.ts` selects adapter by `ProviderType`.
- **Provider credentials**: encrypted with AES-256-GCM via `encryptJson`/`decryptJson` before SQLite storage. Key from `APP_ENCRYPTION_KEY` env var.
- **Auth**: NextAuth v5 Credentials provider, JWT sessions. `mustChangePassword` flag forces redirect on first login. Roles: `ADMIN` (full) | `OPERATOR` (no users/settings).
- **Genkit flows**: each flow file uses `'use server'`, Zod schemas via `genkit` (not `zod` directly), an exported wrapper function, `ai.definePrompt()` + `ai.defineFlow()`.
- **Imports**: always use `@/*` alias (maps to `./src/*`).
- **File naming**: `kebab-case.ts(x)`. Components export `PascalCase`. Hooks prefixed `use`.
- **Styling**: Tailwind + HSL CSS variables from `globals.css`. Use `cn()` from `@/lib/utils`. Monospace via `.font-code`.

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `NEXTAUTH_SECRET` | Mandatory — app throws on startup if missing |
| `APP_ENCRYPTION_KEY` | 64-char hex — AES-256-GCM for provider config |
| `DEFAULT_ADMIN_PASSWORD` | Seeded on first boot |
| `DATABASE_URL` | SQLite path (default: `file:./prisma/dev.db`) |
| `LOCAL_BACKUP_PATH` | Default local provider path (default: `/app/data/backups`) |

### Docker

Multi-stage Dockerfile: `deps` → `migrator` → `builder` → `runner` (distroless nonroot).
- Port `9002`, SQLite at `/data/dev.db`, backups at `/data/backups`.
- Persistent data requires host mount writable by UID `65532`.
- `GET /api/health` — liveness probe.

### Testing

- Unit tests: Vitest in `tests/unit/`, node environment, `@` alias configured.
- E2E tests: Playwright in `tests/e2e/`, Chromium only, base URL `http://localhost:9002`.
- E2E webServer command sets `DATABASE_URL="file:./dev.db" NEXTAUTH_SECRET="secret"`.
