# VaultDocker

## Project Overview

VaultDocker is a Next.js 15 and TypeScript-based dashboard application for managing Docker volume backups. It operates as a single container that mounts the Docker socket (`/var/run/docker.sock`) to discover volumes and orchestrate backup jobs. Backups are compressed into `.tar.gz` archives with `.sha256` sidecars and can be uploaded to various storage providers (Google Drive, SMB, FTP, S3, Local). 

The application integrates AI capabilities using **Genkit** (and Google GenAI) to provide intelligent assistance for backup naming conventions, exclusion pattern suggestions, and backup log summarization.

**Key Technologies:**
- **Framework:** Next.js 15 (App Router)
- **Language:** React 19 + TypeScript (Strict Mode)
- **Styling & UI:** Tailwind CSS, Radix UI primitives (shadcn/ui)
- **Database & ORM:** Prisma ORM + SQLite
- **Authentication:** NextAuth.js v5 (Credentials Provider)
- **AI Integration:** Genkit + Google GenAI Plugin
- **Task Scheduling:** `node-cron`

## Building and Running

The project uses `npm` for dependency management.

**Install Dependencies:**
```bash
npm install
```

**Development Server:**
```bash
# Starts the Next.js dev server with Turbopack on port 9002
npm run dev
```

**Genkit (AI Flows) Development:**
```bash
# Start Genkit flows locally
npm run genkit:dev

# Start Genkit flows with watch mode
npm run genkit:watch
```

**Production Build & Run:**
```bash
npm run build
npm run start
```

**Quality Checks (Required before PR):**
```bash
npm run lint       # Run ESLint
npm run typecheck  # Run strict TypeScript checks (tsc --noEmit)
```
*Note: `next.config.ts` currently silences linting and typechecking during the build process, so these commands must be run manually.*

## Development Conventions

**Architecture & Design Patterns:**
- **Service Layer:** Core business logic resides in specific services (`BackupService`, `RestoreService`, `VolumeService`, `StorageProviderService`, `SchedulerService`).
- **Repository Pattern:** All database access must go through Prisma Repository classes. **Do not use direct Prisma calls outside of repositories.**
- **Object Calisthenics & SOLID:** Enforce strict coding standards—maximum of one level of indentation per method, avoid `else` statements, and keep classes small with a single responsibility.

**Coding Style:**
- **TypeScript:** Strict mode is enabled. Use zero `any` types.
- **Naming Conventions:**
  - Files: `kebab-case.tsx` or `kebab-case.ts`
  - React Component Exports: `PascalCase`
  - Hooks: Prefix with `use` (e.g., `use-mobile.tsx`)
- **Imports:** Use the `@/*` path alias which maps to `src/*`.
- **UI & Styling:** Use `shadcn/ui` components located in `src/components/ui/`. Utility classes are merged using the `cn()` utility from `@/lib/utils`.

**AI Flows:**
- Genkit AI flows are located in `src/ai/flows/`.
- Each flow file uses the `'use server'` directive, leverages Zod schemas for validation, and exports a wrapper function as the public API using `ai.definePrompt()` and `ai.defineFlow()`. 
- New flows must be registered in `src/ai/dev.ts`.

**Version Control:**
- Follow **Conventional Commits** format (`feat:`, `fix:`, `refactor:`, etc.).
- Never commit secrets or API keys. Configuration should be managed via `.env` files (which are gitignored).
