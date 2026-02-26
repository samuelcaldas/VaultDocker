# Copilot Instructions — VaultDocker

## Build & Dev Commands

```bash
npm install              # Install dependencies (npm lockfile is committed)
npm run dev              # Dev server on port 9002 (Turbopack)
npm run build            # Production build (ignores TS/ESLint errors via next.config.ts)
npm run lint             # ESLint via Next.js
npm run typecheck        # Strict TypeScript check (tsc --noEmit)
npm run genkit:dev       # Run Genkit AI flows locally
npm run genkit:watch     # Run Genkit AI flows with file watching
```

`npm run lint` and `npm run typecheck` are the pre-PR gates. The production build skips both (`ignoreBuildErrors` / `ignoreDuringBuilds` in `next.config.ts`), so always run them manually.

There is no automated test framework yet. If adding tests, colocate them as `*.test.ts(x)` next to the feature code.

## Architecture

**VaultDocker** is a Docker volume backup manager built as a Next.js 15 App Router application (TypeScript strict mode).

### Routing

- `src/app/layout.tsx` — Root layout (dark mode default, Inter + Source Code Pro fonts, `<Toaster />`).
- `src/app/(dashboard)/layout.tsx` — Dashboard shell wrapping all main pages with `<AppSidebar />` + `<Navbar />` via shadcn's `SidebarProvider`.
- `src/app/(dashboard)/` — Route group containing: `jobs`, `history`, `restore`, `storage`, `users`, `volumes`, and the dashboard index.

### UI Layer

- **shadcn/ui** (Radix primitives) in `src/components/ui/`. Managed via `components.json` (default style, RSC enabled, Lucide icons).
- Layout shell components (`navbar.tsx`, `sidebar.tsx`) live in `src/components/layout/`.
- Styling uses Tailwind utilities + HSL CSS variables defined in `src/app/globals.css`. Use the `cn()` helper from `@/lib/utils` to merge class names.
- Monospace text uses the `.font-code` utility class (Source Code Pro).

### AI Flows (Genkit)

- `src/ai/genkit.ts` — Shared Genkit instance configured with `googleai/gemini-2.5-flash`.
- `src/ai/flows/` — Each flow file follows this pattern:
  1. `'use server'` directive at the top.
  2. Zod schemas for input/output (imported from `genkit`, not `zod` directly in these files).
  3. Exported TypeScript types inferred from schemas.
  4. An exported async wrapper function (the public API).
  5. A `ai.definePrompt()` with Handlebars template and a `ai.defineFlow()` that calls it.
- `src/ai/dev.ts` — Registers all flows for local Genkit dev tooling.

### Target Data Model

The blueprint (`docs/blueprint.md`) specifies Prisma ORM + SQLite with entities: `User`, `Volume`, `StorageProvider`, `BackupJob`, `BackupRun`. Auth is planned via NextAuth.js v5 with Credentials Provider and JWT sessions. The repository pattern should wrap all Prisma access — no direct Prisma calls outside repositories.

## Conventions

- **Package manager**: npm (lockfile committed).
- **Imports**: Use the `@/*` path alias (maps to `./src/*`).
- **File naming**: `kebab-case.tsx` / `kebab-case.ts`. Components export `PascalCase` names. Hooks are prefixed with `use`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`).
- **Architecture rules** (from blueprint): Object Calisthenics and SOLID — one level of indentation per method, no `else`, small single-responsibility classes. Service layer (`BackupService`, `RestoreService`, etc.) with repository pattern over Prisma.
- **Secrets**: Never commit secrets. `.env*` and `.genkit/` are gitignored. Use environment variables for runtime config.
