# VaultDocker Comprehensive Project Upgrade Plan

## Context

The project dependencies have accumulated across major and minor releases (Next.js 16, React 19, Prisma 7, Genkit 1.41, Tailwind CSS 4). The current installation has a broken Tailwind CSS 4 build configuration (`tailwindcss@4.3.3` with Tailwind v3 PostCSS plugin and CSS directives), unaligned Prisma 7 scripts (`prisma/seed.ts` lacking the libSQL driver adapter), deprecated Next.js 16 `middleware.ts` naming, and minor container/database inconsistencies (`docker-compose.yml` pointing to a mismatched database path).

The objective is to upgrade all dependencies to their latest compatible stable releases, repair the build and styling pipelines, finalize Next.js 16 and Prisma 7 conventions, and verify that the full application, tests, and Docker runtime function properly.

---

## Targeted Upgrades and Version Pinning

### 1. Upgrade Targets
- **Next.js Ecosystem**: `next@16.3.2`, `eslint-config-next@16.3.2`, `react@19.2.8`, `react-dom@19.2.8`, `@types/react@19.2.18`, `@types/react-dom@19.2.4`
- **Tailwind CSS 4**: `tailwindcss@4.3.3`, add `@tailwindcss/postcss@4.3.3`, `postcss@8.5.26`, retain `tailwindcss-animate@1.0.7`
- **Prisma 7**: `prisma@7.9.1`, `@prisma/client@7.9.1`, `@prisma/adapter-libsql@7.9.1`, keep `@libsql/client@0.17.4`
- **Genkit AI**: `genkit@1.41.0`, `@genkit-ai/google-genai@1.41.0`, `genkit-cli@1.41.0`
- **AWS SDK**: `@aws-sdk/client-s3@3.1116.0`, `@aws-sdk/lib-storage@3.1116.0`
- **Radix UI Primitives**: `@radix-ui/react-*` components updated to latest stable (accordion 1.2.20, alert-dialog 1.1.23, dialog 1.1.23, dropdown-menu 2.1.24, select 2.3.7, etc.)
- **Utilities & Tooling**: `lucide-react@1.33.0`, `react-hook-form@7.86.0`, `recharts@3.10.1`, `basic-ftp@6.2.0`, `tsx@4.23.12`, `vitest@4.1.11`, `@playwright/test@1.62.1`

### 2. Intentionally Pinned (Do Not Upgrade Major)
- `typescript@5.9.3` (avoids TS 7 peer incompatibility with `eslint-config-next` / `typescript-eslint`)
- `eslint@9.39.5` (avoids ESLint 10 peer range mismatches across Next.js ESLint plugin ecosystem)
- `next-auth@5.0.0-beta.32` (Auth.js v5 beta is the active v5 release; npm `latest` is v4)

---

## Implementation Steps

### Phase 1: Dependency Updates & Manifest Configuration
1. Update `package.json` with target versions and add `engines.node` (`^20.19.0 || ^22.12.0 || >=24.0.0`).
2. Add `@tailwindcss/postcss@4.3.3` to dependencies.
3. Update `package.json` scripts:
   - `prisma:seed`: `prisma db seed`
   - Remove obsolete top-level `"prisma": { "seed": "..." }`
4. Run `npm install` and verify `npm ls` returns no peer errors.

### Phase 2: Tailwind CSS 4 & PostCSS Bridge
1. Update `postcss.config.mjs`:
   - Replace `tailwindcss: {}` with `'@tailwindcss/postcss': {}`.
2. Update `src/app/globals.css`:
   - Replace `@tailwind base; @tailwind components; @tailwind utilities;` with:
     ```css
     @import "tailwindcss";
     @config "../../tailwind.config.ts";
     ```
   - Preserve all CSS variables (`:root`, `.dark`), `@layer base`, and `.font-code`.
3. Update `tailwind.config.ts`:
   - Replace CommonJS `require('tailwindcss-animate')` with ESM import `import animate from 'tailwindcss-animate'` and `plugins: [animate]`.

### Phase 3: Next.js 16 Proxy Migration
1. Move `src/middleware.ts` to `src/proxy.ts` (Next 16 convention) and export `export const proxy = auth(...)`.
2. Keep identical authorization, public route allowlists, role checking (`ADMIN` vs `OPERATOR`), and forced password redirection logic.

### Phase 4: Prisma 7 Configuration & Driver Adapter Standardization
1. In `src/server/db.ts`: export `createPrismaClient()` factory alongside the singleton `db`.
2. In `prisma/seed.ts` and `test-hash.ts`: use `createPrismaClient()` instead of bare `new PrismaClient()`.
3. In `prisma.config.ts`:
   - Add `import 'dotenv/config';`
   - Add `migrations: { path: './prisma/migrations', seed: 'tsx prisma/seed.ts' }`.

### Phase 5: Docker & E2E Test Alignment
1. In `Dockerfile`:
   - Ensure `prisma.config.ts` is copied in the `migrator` stage.
2. In `docker-compose.yml`:
   - Update `DATABASE_URL` from `file:/data/db.sqlite` to `file:/data/dev.db` to match Dockerfile runner defaults.
3. In `playwright.config.ts`:
   - Ensure clean database startup for tests (`prisma/e2e.db`).

---

## Critical Files to Modify

| File | Changes |
|---|---|
| `package.json` | Update dependency versions, add `@tailwindcss/postcss`, set engines, update seed script |
| `postcss.config.mjs` | Use `@tailwindcss/postcss` plugin |
| `src/app/globals.css` | Use `@import "tailwindcss"; @config "../../tailwind.config.ts";` |
| `tailwind.config.ts` | ESM import for `tailwindcss-animate` |
| `src/middleware.ts` -> `src/proxy.ts` | Rename to Next 16 `proxy.ts` and export `proxy` |
| `src/server/db.ts` | Export `createPrismaClient` helper |
| `prisma/seed.ts` | Use `createPrismaClient` with libSQL adapter |
| `test-hash.ts` | Use `createPrismaClient` with libSQL adapter |
| `prisma.config.ts` | Add `dotenv/config` and seed config |
| `Dockerfile` | Copy `prisma.config.ts` in migrator stage |
| `docker-compose.yml` | Align `DATABASE_URL=file:/data/dev.db` |
| `tests/e2e/basic.spec.ts` | Refine assertions for precise `/login` redirect |

---

## Verification Plan

Execute the following verification gates sequentially:

1. **Prisma Generation & Validation**:
   ```bash
   npm run prisma:generate
   npx prisma validate
   ```
2. **Static Code Quality Checks**:
   ```bash
   npm run lint
   npm run typecheck
   ```
3. **Unit Tests**:
   ```bash
   npx vitest run
   ```
4. **Production Next.js Build**:
   ```bash
   npm run build
   ```
5. **Database Seeding Idempotency**:
   ```bash
   npx prisma migrate deploy
   npm run prisma:seed
   npm run prisma:seed
   npx tsx test-hash.ts
   ```
6. **E2E Tests**:
   ```bash
   npx playwright test
   ```
