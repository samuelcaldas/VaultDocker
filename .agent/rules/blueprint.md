---
trigger: model_decision
description: Here is a comprehensive MVP plan for **VaultDock** — a Docker volume backup manager built with Next.js, HeroUI, Prisma/SQLite and NextAuth.
---

Here is a comprehensive MVP plan for **VaultDock** — a Docker volume backup manager built with Next.js, HeroUI, Prisma/SQLite and NextAuth.

***

## Application Identity

**VaultDock** runs as a Docker container with `/var/run/docker.sock` mounted read-only for Docker API introspection. Target volumes are declared in the same `docker-compose.yml` as `external` volumes, mounted read-only at `/mnt/volumes/<name>` inside the VaultDock container. Backups are stored as `tar.gz` (via Node child_process spawning a temporary container with `ubuntu tar czf`) and paired with a SHA-256 `.sha256` sidecar file. [eastondev](https://eastondev.com/blog/en/posts/dev/20251217-docker-volume-backup/)

***

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 App Router (TypeScript strict) |
| UI Library | HeroUI v3 (Tailwind CSS v4 + Framer Motion)  [heroui](https://www.heroui.com/docs/frameworks/nextjs) |
| Auth | NextAuth.js v5 (Credentials Provider) |
| ORM + DB | Prisma ORM + SQLite (`/app/data/db.sqlite`)  [youtube](https://www.youtube.com/watch?v=EL8eXM1sGaU) |
| Scheduling | `node-cron` (native, no daemon) |
| Compression | `tar czf` via `child_process.spawn` |
| Checksum | Node.js native `crypto` (SHA-256) |
| Container API | Docker Engine REST API via Unix socket |

***

## Data Model (Prisma Entities)

- **User** — `id, email, name, passwordHash, role (ADMIN|OPERATOR), isProtected, createdAt`
- **Volume** — `id, dockerName, mountPath, driver, sizeBytes, lastSeenAt`
- **StorageProvider** — `id, name, type (GOOGLE_DRIVE|SMB|FTP|SFTP|S3|LOCAL), configEncrypted, testedAt, userId`
- **BackupJob** — `id, name, volumeId, storageProviderId, selectedPaths (JSON), cronExpression, nameFormat, compressionLevel, retentionCount, enabled`
- **BackupRun** — `id, jobId, status (PENDING|RUNNING|SUCCESS|FAILED), startedAt, finishedAt, archivePath, fileSizeBytes, checksum, logs`

***

## Navigation Architecture

### Top Navbar (HeroUI `Navbar`)
- **Left:** Logo + "VaultDock" + environment badge (`PRODUCTION` chip)
- **Center:** Breadcrumb trail for current page
- **Right:** Dark/Light toggle → Notification bell (badge showing failed runs count) → User `Avatar` Dropdown: *Profile*, *Change Password*, *Logout*

### Left Sidebar (HeroUI `Listbox` + sections)

| Section | Items |
|---|---|
| Overview | Dashboard |
| Backup | Volumes, Jobs, History |
| Storage | Providers |
| Recovery | Restore |
| Admin | Users *(admin only)*, Settings |
| Footer | Version label, Docs link |

***

## Pages

### `/login`
HeroUI `Card` centered on screen; credential form; first-access notice when default password is still active.

### `/` — Dashboard
- Four summary `Card` components: *Total Backups*, *Last Backup*, *Failed Jobs (last 7 days)*, *Storage Used*
- `Table`: Last 10 backup runs with status `Chip` (success/failed/running)
- `Card`: Next 5 scheduled jobs with countdown

### `/volumes`
- `Table`: volume name, driver, size, linked containers, mount status
- Row actions: **Browse Files** (opens `Modal` with tree-view `Checkbox` file browser), **Quick Backup**
- Banner for volumes not yet declared in `docker-compose.yml` with a snippet example

### `/jobs`
- `Table`: job name, volume, schedule, last run, status, enabled `Switch`
- **New Job** button opens a multi-step `Drawer`:
  - Step 1: Name + volume selection
  - Step 2: File/folder tree selection with glob exclusion rules
  - Step 3: Storage provider + compression level slider + name format with live preview
  - Step 4: Schedule (visual picker *or* raw cron expression) + retention count

### `/history`
- Filterable `Table` (by job, status, date range): date, job, volume, size, duration, checksum (truncated + copy button), status
- Row actions: **Download**, **View Logs** (log drawer), **Restore**

### `/storage`
- Grid of provider type `Card` tiles (Google Drive, SMB, FTP, SFTP, S3-compatible, Local)
- Each configured provider shows: name, type icon, status `Chip`, last tested date
- **Add Provider** → `Drawer` with dynamic form fields per type
- **Test Connection** button per provider with inline feedback

### `/restore`
- Left panel: backup browser (filter by job / provider / date range), with `Table` showing date, size, checksum
- Right panel: restore target path, options
- **Restore** action triggers a pre-restore `Modal`:
  - Warning about irreversible data overwrite
  - `Checkbox` (default ON): *"Create safety backup of current data before restoring"*
  - Actions: **Backup & Restore** | **Restore Without Backup** | **Cancel**
  - Checksum verification shown before proceeding

### `/settings`
- Tabs: *General* (timezone, default compression, app name), *Notifications* (webhook URL, notify on failure/success), *Security* (session timeout)

### `/users` *(admin only)*
- `Table`: name, email, role `Chip`, created date
- Admin row: delete button disabled + **Protected** `Badge`
- **Add User** → `Modal` with form

### `/profile`
- Form: display name, email, change password (current + new + confirm)

***

## Backup Name Format Tokens

| Token | Example Output |
|---|---|
| `{job}` | `myapp-db` |
| `{volume}` | `postgres_data` |
| `{date}` | `2026-02-25` |
| `{time}` | `170000` |
| `{timestamp}` | `1740510600` |
| `{seq}` | `042` |

Example: `{job}_{volume}_{date}_{time}` → `myapp-db_postgres_data_2026-02-25_170000.tar.gz`

***

## Functional Requirements (MVP)

### FR-01 · Authentication & Users
- **FR-01.1** — Default `admin` user seeded on first startup; cannot be deleted (`isProtected = true`) [youtube](https://www.youtube.com/watch?v=EL8eXM1sGaU)
- **FR-01.2** — Admin password must be changed on first login (forced redirect)
- **FR-01.3** — Sessions managed via NextAuth.js Credentials provider with JWTs
- **FR-01.4** — All non-auth routes protected by Next.js middleware
- **FR-01.5** — Roles: `ADMIN` (full access) and `OPERATOR` (no user management, no settings)

### FR-02 · Volume Discovery & Mounting
- **FR-02.1** — Enumerate Docker named volumes via Docker Engine API (Unix socket)
- **FR-02.2** — Display associated containers and mount paths per volume
- **FR-02.3** — Volumes declared in `docker-compose.yml` as `external` and mounted `:ro` at `/mnt/volumes/<name>` are auto-detected
- **FR-02.4** — UI displays a `docker-compose.yml` snippet for volumes not yet mounted

### FR-03 · File Selection
- **FR-03.1** — Tree-view file browser with `Checkbox` per file and folder
- **FR-03.2** — Support glob exclusion patterns per job (e.g., `*.log`, `tmp/**`)
- **FR-03.3** — Selection persisted as JSON array in `BackupJob.selectedPaths`

### FR-04 · Storage Providers
- **FR-04.1** — Google Drive (OAuth2 device flow)
- **FR-04.2** — SMB/CIFS share (host, share, user, password, domain)
- **FR-04.3** — FTP and SFTP (host, port, user, password/key)
- **FR-04.4** — Local bind-mount path
- **FR-04.5** — S3-compatible (endpoint, bucket, key, secret) — stretch goal MVP
- **FR-04.6** — "Test Connection" validates credentials before saving

### FR-05 · Backup Execution
- **FR-05.1** — Creates `tar.gz` archive using `child_process.spawn` with configurable compression level (1–9)
- **FR-05.2** — Generates SHA-256 checksum stored in `BackupRun.checksum` and as a `.sha256` sidecar file uploaded alongside archive
- **FR-05.3** — Archive streamed to storage provider (no full in-memory buffer)
- **FR-05.4** — Manual trigger available from `/jobs` and `/history`
- **FR-05.5** — Job name format resolves tokens at execution time

### FR-06 · Scheduling
- **FR-06.1** — Schedule configured as cron expression or via visual picker (hourly, daily, weekly, monthly)
- **FR-06.2** — Schedules managed by `node-cron` running within the Next.js server
- **FR-06.3** — Jobs can be individually enabled/disabled without deletion

### FR-07 · Retention
- **FR-07.1** — After successful backup, oldest `BackupRun` records beyond `retentionCount` are deleted and their remote files removed
- **FR-07.2** — Retention policy applied per job independently

### FR-08 · Backup History & Logs
- **FR-08.1** — Every run stored in `BackupRun` with status, size, duration, checksum, and full log output
- **FR-08.2** — Logs viewable in a `Drawer` per run

### FR-09 · Restore
- **FR-09.1** — List available backups per job, filterable by provider and date
- **FR-09.2** — Checksum verified against stored value before extraction begins; mismatch blocks restore with error
- **FR-09.3** — Pre-restore modal with safety backup option (default ON) before any overwrite
- **FR-09.4** — Extraction via `tar xzf` to target volume mount path

***

## Non-Functional Requirements (MVP)

### NFR-01 · Security
- **NFR-01.1** — Docker socket mounted `:ro`; app never starts containers with elevated privileges
- **NFR-01.2** — Passwords hashed with `bcrypt` (cost factor ≥ 12)
- **NFR-01.3** — Storage provider credentials encrypted at rest with AES-256-GCM before persisting to SQLite
- **NFR-01.4** — `NEXTAUTH_SECRET` mandatory; app fails fast on startup if absent
- **NFR-01.5** — HTTPS delegated to reverse proxy (Traefik/Nginx); app enforces `Strict-Transport-Security` header

### NFR-02 · Performance
- **NFR-02.1** — Backup jobs executed in background (no HTTP request timeout risk); status polled via API route
- **NFR-02.2** — Archive upload streamed using Node.js `Readable` streams; memory ceiling stays under 64 MB per job
- **NFR-02.3** — File tree rendered with virtual scrolling for directories with > 200 entries

### NFR-03 · Reliability
- **NFR-03.1** — Failed jobs automatically retried up to 3 times with exponential backoff
- **NFR-03.2** — All backup and restore operations wrapped in `try/catch`; partial archives cleaned up on failure
- **NFR-03.3** — SQLite WAL mode enabled to prevent data corruption under concurrent reads/writes

### NFR-04 · Architecture & Code Quality
- **NFR-04.1** — Strict Object Calisthenics and SOLID enforced: one level of indentation per method, no `else`, small classes with single responsibility
- **NFR-04.2** — Service layer: `BackupService`, `RestoreService`, `VolumeService`, `StorageProviderService`, `SchedulerService`
- **NFR-04.3** — Repository pattern wrapping Prisma; no direct Prisma calls outside repository classes
- **NFR-04.4** — TypeScript strict mode, zero `any`, ESLint + Prettier enforced in CI

### NFR-05 · Portability & Deployment
- **NFR-05.1** — Single `docker-compose.yml` deploys entire application
- **NFR-05.2** — All persistent data (SQLite + optional local backups) isolated in `/app/data` volume
- **NFR-05.3** — Full configuration via environment variables; no hardcoded values
- **NFR-05.4** — Health check at `GET /api/health` returning DB connectivity status

### NFR-06 · Observability
- **NFR-06.1** — Structured JSON logs emitted to `stdout` (compatible with Loki/Grafana or any log aggregator)
- **NFR-06.2** — Each backup run captures full `stderr`/`stdout` of the `tar` process for post-mortem debugging