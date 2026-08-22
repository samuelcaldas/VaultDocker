# Repository Guidelines

## Project Structure & Module Organization
The app is a Next.js 15 + TypeScript project rooted at `src/`.
- `src/app/`: App Router routes, layouts, and global styles (`globals.css`).
- `src/app/(dashboard)/`: dashboard route group (`jobs`, `history`, `restore`, `storage`, `users`, `volumes`).
- `src/components/ui/`: reusable UI primitives (shadcn/Radix-based).
- `src/components/layout/`: shell components such as navbar and sidebar.
- `src/hooks/`: shared React hooks.
- `src/lib/`: utilities and shared data helpers.
- `src/ai/`: Genkit setup and flow definitions.
- `docs/blueprint.md`: product blueprint and functional scope.

## Build, Test, and Development Commands
Use npm (lockfile is committed).
- `npm install`: install dependencies.
- `npm run dev`: start local dev server on port `9002` with Turbopack.
- `npm run build`: create production build.
- `npm run start`: run the built app.
- `npm run lint`: run Next.js ESLint checks.
- `npm run typecheck`: run strict TypeScript checks.
- `npm run genkit:dev` / `npm run genkit:watch`: run AI flows locally.

## Coding Style & Naming Conventions
- Language: strict TypeScript (`tsconfig.json` has `"strict": true`).
- Components: `PascalCase` exports; file names are typically `kebab-case.tsx` (for example, `backup-log-summarizer-flow.ts`).
- Hooks: prefix with `use` (for example, `use-mobile.tsx`, `use-toast.ts`).
- Imports: use path alias `@/*` for project modules.
- Styling: Tailwind utilities + CSS variables; keep shared UI in `src/components/ui`.

## Testing Guidelines
There is no dedicated automated test framework configured yet.
- Treat `npm run lint` and `npm run typecheck` as required pre-PR gates.
- Manually smoke-test affected routes in `npm run dev` before opening a PR.
- If adding tests, colocate as `*.test.ts(x)` near the feature code.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style: `feat:`, `fix:`, `refactor:`.
- Keep commits focused and use imperative summaries.
- PRs should include: purpose, scope, validation steps, and screenshots for UI changes.
- Link related issues/tasks and note any config or environment changes.

## Security & Configuration Tips
- Never commit secrets; `.env*` and `.genkit/` are ignored.
- Use environment variables for runtime config.
- Before merge, verify behavior with both `npm run lint` and `npm run typecheck` (build currently ignores these checks in `next.config.ts`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
