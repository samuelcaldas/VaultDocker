# AI Rules — VaultDocker

> Canonical AI guidance lives in:
> - **`AGENTS.md`** — project structure, commands, style, testing, commit/PR guidelines, security
> - **`.github/copilot-instructions.md`** — architecture deep-dive, Genkit flow patterns, routing, data model
>
> This file consolidates the essentials for IDX / Gemini AI sessions.

---

## Project

VaultDocker is a Docker volume backup manager — a single Next.js 15 App Router container that mounts the Docker socket and manages backup jobs, scheduling, storage providers, and restores. See `docs/blueprint.md` for the full functional spec.

## Commands

```bash
npm install           # install deps (npm lockfile committed)
npm run dev           # dev server on :9002 (Turbopack)
npm run build         # production build
npm run lint          # ESLint (Next.js)
npm run typecheck     # tsc --noEmit (strict)
npm run genkit:dev    # run Genkit AI flows locally
npm run genkit:watch  # run Genkit AI flows with watch
```

`npm run lint` and `npm run typecheck` are required before every PR. `next.config.ts` silences both during `build`, so run them manually.

## Architecture

- **Routing**: `src/app/(dashboard)/` route group hosts all main pages (`jobs`, `history`, `restore`, `storage`, `users`, `volumes`). Dashboard layout wraps pages with `<AppSidebar />` + `<Navbar />` via shadcn `SidebarProvider`.
- **UI**: shadcn/ui (Radix primitives) in `src/components/ui/`. Use `cn()` from `@/lib/utils` for class merging. HSL CSS variables in `src/app/globals.css`. Monospace text: `.font-code` utility class.
- **AI flows** (`src/ai/flows/`): each file uses `'use server'`, Zod schemas imported from `genkit`, an exported wrapper function as the public API, then `ai.definePrompt()` + `ai.defineFlow()`. Shared Genkit instance in `src/ai/genkit.ts` (`googleai/gemini-2.5-flash`). Register new flows in `src/ai/dev.ts`.
- **Data model** (target): Prisma ORM + SQLite. Entities: `User`, `Volume`, `StorageProvider`, `BackupJob`, `BackupRun`. Auth: NextAuth.js v5 Credentials Provider + JWT. All Prisma access goes through repository classes — no direct Prisma calls outside repositories.
- **Service layer**: `BackupService`, `RestoreService`, `VolumeService`, `StorageProviderService`, `SchedulerService`.

## Conventions

- TypeScript strict mode, zero `any`.
- File names: `kebab-case.tsx`/`.ts`. Component exports: `PascalCase`. Hooks: `use` prefix.
- Imports: `@/*` alias (maps to `src/*`).
- Object Calisthenics + SOLID: one level of indentation per method, no `else`, small single-responsibility classes.
- Commits: Conventional Commits — `feat:`, `fix:`, `refactor:`.
- No secrets in source. `.env*` and `.genkit/` are gitignored; use environment variables.
- No test framework yet; colocate future tests as `*.test.ts(x)` near the feature code.
