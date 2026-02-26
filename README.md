# VaultDocker

VaultDocker is a Next.js 15 + TypeScript dashboard for managing Docker volume backups.

## Table of Contents

- [Features](#features)
- [Project Status](#project-status)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [App Routes](#app-routes)
- [AI Flows](#ai-flows)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [License](#license)

## Features

- Dashboard shell with pages for jobs, history, restore, storage providers, users, and volumes.
- Multi-step backup job creation flow with schedule and naming-format helpers.
- AI-assisted backup name format suggestions (Genkit).
- AI-assisted exclusion pattern suggestions (Genkit).
- AI-assisted backup log summarization (Genkit).
- Reusable UI primitives built with Radix/shadcn patterns and Tailwind CSS.
- Strict TypeScript setup for safer refactoring and code quality.

## Project Status

- Current state: frontend-first MVP scaffold with mock data and interaction flows.
- Planned scope: Docker API integration, real backup execution, provider connectivity, retention, restore safeguards, and authentication hardening (see blueprint).

## Tech Stack

- Next.js 15 (App Router)
- React 19 + TypeScript (strict mode)
- Tailwind CSS + Radix UI primitives
- Genkit + Google GenAI plugin

## Getting Started

### Prerequisites

- Node.js 20+
- npm (lockfile included)

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The app runs on `http://localhost:9002`.

### Build for production

```bash
npm run build
npm run start
```

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js dev server with Turbopack on port `9002`. |
| `npm run build` | Create production build. |
| `npm run start` | Start built application. |
| `npm run lint` | Run Next.js ESLint checks. |
| `npm run typecheck` | Run strict TypeScript checks. |
| `npm run genkit:dev` | Start Genkit flows in development mode. |
| `npm run genkit:watch` | Start Genkit flows with watch mode. |

## Environment Variables

Create `.env.local` for local runtime configuration.

- AI flows require provider credentials for `@genkit-ai/google-genai` (for example, a Google GenAI API key).
- Keep secrets out of version control (`.env*` is already gitignored).

## Project Structure

```text
src/
  app/
    (dashboard)/
      history/
      jobs/
      restore/
      storage/
      users/
      volumes/
    globals.css
    layout.tsx
  ai/
    flows/
    dev.ts
    genkit.ts
  components/
    layout/
    ui/
  hooks/
  lib/
docs/
  blueprint.md
```

## App Routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard overview with summary cards and recent runs. |
| `/jobs` | Backup jobs list and multi-step job creation drawer. |
| `/history` | Backup run history view. |
| `/restore` | Restore workflow UI. |
| `/storage` | Storage provider management UI. |
| `/volumes` | Docker volume listing UI. |
| `/users` | User management UI (MVP scaffold). |

## AI Flows

- `src/ai/flows/backup-naming-assistant.ts`
- `src/ai/flows/exclusion-pattern-suggester.ts`
- `src/ai/flows/backup-log-summarizer-flow.ts`

These flows are loaded through `src/ai/dev.ts` for local Genkit execution.

## Development Workflow

Recommended checks before opening a PR:

```bash
npm run lint
npm run typecheck
```

Also smoke-test affected pages in local dev mode.

## Contributing

- Use focused commits with Conventional Commit prefixes (`feat:`, `fix:`, `refactor:`).
- Include purpose, scope, and validation steps in pull requests.
- Attach screenshots for UI changes.

## License

MIT License
