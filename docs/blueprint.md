# VaultDocker MVP Blueprint

## 1. Application Identity

VaultDocker is a Docker volume backup manager that runs as a single Next.js application container.

- The container mounts `/var/run/docker.sock` read-only for Docker API introspection.
- Target volumes are declared as `external` in the same `docker-compose.yml` and mounted read-only at `/mnt/volumes/<name>` inside VaultDocker.
- Backups are stored as `.tar.gz` archives and paired with a `.sha256` sidecar file.
- Archive creation is performed via Node.js `child_process.spawn` by running `tar czf` in a temporary container.

## 2. Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 App Router (TypeScript strict) |
| UI Library | HeroUI v3 (Tailwind CSS v4 + Framer Motion) |
| Auth | NextAuth.js v5 (Credentials Provider) |
| ORM + DB | Prisma ORM + SQLite (`/app/data/db.sqlite`) |
| Scheduling | `node-cron` (native, no daemon) |
| Provider SDKs | `googleapis` (Google Drive), `smb2` (SMB/CIFS) |
| Compression | `tar czf` via `child_process.spawn` |
| Checksum | Node.js `crypto` (SHA-256) |
| Container API | Docker Engine REST API via Unix socket |

## 3. Data Model (Prisma Entities)

| Entity | Fields |
| --- | --- |
| `User` | `id`, `email`, `name`, `passwordHash`, `role (ADMIN\|OPERATOR)`, `isProtected`, `createdAt` |
| `Volume` | `id`, `dockerName`, `mountPath`, `driver`, `sizeBytes`, `lastSeenAt` |
| `StorageProvider` | `id`, `name`, `type (GOOGLE_DRIVE\|SMB\|FTP\|SFTP\|S3\|LOCAL)`, `configEncrypted`, `testedAt`, `userId` |
| `BackupJob` | `id`, `name`, `volumeId`, `storageProviderId`, `selectedPaths (JSON)`, `cronExpression`, `nameFormat`, `compressionLevel`, `retentionCount`, `enabled` |
| `BackupRun` | `id`, `jobId`, `status (PENDING\|RUNNING\|SUCCESS\|FAILED)`, `startedAt`, `finishedAt`, `archivePath`, `fileSizeBytes`, `checksum`, `logs` |

## 4. Navigation Architecture

### Top Navbar (`HeroUI Navbar`)

- Left: logo, `VaultDocker` name, environment badge (`PRODUCTION` chip).
- Center: breadcrumb trail for active route.
- Right: dark/light toggle, notification bell (failed runs badge), user avatar dropdown with `Profile`, `Change Password`, `Logout`.

### Left Sidebar (`HeroUI Listbox` + Sections)

| Section | Items |
| --- | --- |
| Overview | Dashboard |
| Backup | Volumes, Jobs, History |
| Storage | Providers |
| Recovery | Restore |
| Admin | Users (admin only), Settings |
| Footer | Version label, Docs link |

## 5. Pages

### `/login`

- Centered HeroUI `Card` credential form.
- First-access notice when default password is still active.

### `/` (Dashboard)

- Four summary cards: `Total Backups`, `Last Backup`, `Failed Jobs (last 7 days)`, `Storage Used`.
- Table for last 10 backup runs with status chips (`success`, `failed`, `running`).
- Card showing next 5 scheduled jobs with countdown.

### `/volumes`

- Table columns: volume name, driver, size, linked containers, mount status.
- Row actions: `Browse Files` (modal with tree-view checkbox browser), `Quick Backup`.
- Banner with `docker-compose.yml` snippet for undeclared/unmounted volumes.

### `/jobs`

- Table columns: job name, volume, schedule, last run, status, enabled switch.
- `New Job` opens multi-step drawer:
1. Name and volume selection
2. File/folder tree selection and glob exclusion rules
3. Storage provider, compression slider, name format with live preview
4. Schedule (visual picker or raw cron expression) and retention count

### `/history`

- Filterable table by job, status, and date range.
- Columns: date, job, volume, size, duration, checksum (truncated + copy), status.
- Row actions: `Download`, `View Logs` (drawer), `Restore`.

### `/storage`

- Grid of provider cards: Google Drive, SMB, FTP, SFTP, S3-compatible, Local.
- Configured provider card includes name, type icon, status chip, last tested date.
- `Add Provider` opens drawer with dynamic fields by provider type.
- Per-provider `Test Connection` action with inline feedback.

### `/restore`

- Left panel: backup browser (job/provider/date filters) and backups table (date, size, checksum).
- Right panel: restore target path and options.
- `Restore` opens pre-restore modal:
  - Irreversible overwrite warning
  - Checkbox default ON: `Create safety backup of current data before restoring`
  - Actions: `Backup & Restore`, `Restore Without Backup`, `Cancel`
  - Checksum verification shown before final confirmation

### `/settings`

- Tabs:
  - `General` (timezone, default compression, app name)
  - `Notifications` (webhook URL, notify on failure/success)
  - `Security` (session timeout)

### `/users` (admin only)

- Table columns: name, email, role chip, created date.
- Protected admin row: delete action disabled with `Protected` badge.
- `Add User` modal form.

### `/profile`

- Form for display name, email, and password change (current, new, confirm).

## 6. Backup Name Format Tokens

| Token | Example Output |
| --- | --- |
| `{job}` | `myapp-db` |
| `{volume}` | `postgres_data` |
| `{date}` | `2026-02-25` |
| `{time}` | `170000` |
| `{timestamp}` | `1740510600` |
| `{seq}` | `042` |

Example:
`{job}_{volume}_{date}_{time}` -> `myapp-db_postgres_data_2026-02-25_170000.tar.gz`

## 7. Functional Requirements (MVP)

### FR-01 Authentication and Users

- **FR-01.1** Default `admin` user is seeded on first startup and cannot be deleted (`isProtected = true`).
- **FR-01.2** Admin password change is mandatory on first login (forced redirect).
- **FR-01.3** Sessions are managed with NextAuth.js Credentials Provider using JWTs.
- **FR-01.4** All non-auth routes are protected by Next.js middleware.
- **FR-01.5** Roles are enforced: `ADMIN` has full access; `OPERATOR` cannot manage users or settings.

### FR-02 Volume Discovery and Mounting

- **FR-02.1** Enumerate Docker named volumes via Docker Engine API (Unix socket).
- **FR-02.2** Display associated containers and mount paths per volume.
- **FR-02.3** Auto-detect volumes declared as `external` and mounted read-only at `/mnt/volumes/<name>`.
- **FR-02.4** Display a `docker-compose.yml` snippet for volumes not yet mounted.

### FR-03 File Selection

- **FR-03.1** Provide tree-view file browser with checkbox selection at file and folder levels.
- **FR-03.2** Support per-job glob exclusions (for example `*.log`, `tmp/**`).
- **FR-03.3** Persist selection in `BackupJob.selectedPaths` as JSON array.

### FR-04 Storage Providers

- **FR-04.1** Google Drive (OAuth2 device flow).
- **FR-04.2** SMB/CIFS (host, share, user, password, domain).
- **FR-04.3** FTP and SFTP (host, port, user, password/key).
- **FR-04.4** Local bind-mount path.
- **FR-04.5** S3-compatible provider (endpoint, bucket, key, secret) as stretch goal MVP.
- **FR-04.6** `Test Connection` validates credentials before save.

### FR-05 Backup Execution

- **FR-05.1** Create `tar.gz` using `child_process.spawn` with configurable compression level (`1-9`).
- **FR-05.2** Generate SHA-256 checksum in `BackupRun.checksum` and upload `.sha256` sidecar.
- **FR-05.3** Stream archive to provider without full in-memory buffering.
- **FR-05.4** Support manual triggers from `/jobs` and `/history`.
- **FR-05.5** Resolve backup name format tokens at execution time.

### FR-06 Scheduling

- **FR-06.1** Configure schedule by cron expression or visual picker (hourly, daily, weekly, monthly).
- **FR-06.2** Run schedules via `node-cron` inside Next.js server process.
- **FR-06.3** Allow per-job enable/disable without deletion.

### FR-07 Retention

- **FR-07.1** After successful backup, delete oldest runs over `retentionCount` and remove remote files.
- **FR-07.2** Apply retention independently per job.

### FR-08 Backup History and Logs

- **FR-08.1** Persist each run in `BackupRun` with status, size, duration, checksum, and full logs.
- **FR-08.2** Expose logs per run in drawer UI.

### FR-09 Restore

- **FR-09.1** List available backups per job with provider/date filters.
- **FR-09.2** Verify checksum before extraction; mismatch blocks restore.
- **FR-09.3** Show pre-restore safety modal with default-ON backup option before overwrite.
- **FR-09.4** Extract archive via `tar xzf` to target volume mount path.

## 8. Non-Functional Requirements (MVP)

### NFR-01 Security

- **NFR-01.1** Docker socket is read-only; app never launches privileged containers.
- **NFR-01.2** Passwords are hashed with `bcrypt` (cost factor >= 12).
- **NFR-01.3** Provider credentials are encrypted at rest with AES-256-GCM before SQLite persistence.
- **NFR-01.4** `NEXTAUTH_SECRET` is mandatory; app fails fast if missing.
- **NFR-01.5** HTTPS is terminated at reverse proxy (Traefik/Nginx); app enforces `Strict-Transport-Security`.

### NFR-02 Performance

- **NFR-02.1** Backup jobs are executed in background (no HTTP request timeout risk); status is polled via API route.
- **NFR-02.2** Archive uploads are streamed using Node.js `Readable` streams; memory ceiling stays under 64 MB per job.
- **NFR-02.3** File tree supports virtual scrolling for directories with more than 200 entries.

### NFR-03 Reliability

- **NFR-03.1** Failed jobs retry up to 3 times with exponential backoff.
- **NFR-03.2** Backup/restore operations are wrapped in `try/catch` with cleanup of partial artifacts.
- **NFR-03.3** SQLite WAL mode is enabled for safer concurrent read/write behavior.

### NFR-04 Architecture and Code Quality

- **NFR-04.1** Strict Object Calisthenics and SOLID are enforced: one level of indentation per method, no `else`, and small classes with single responsibility.
- **NFR-04.2** Service layer includes `BackupService`, `RestoreService`, `VolumeService`, `StorageProviderService`, `SchedulerService`.
- **NFR-04.3** Repository pattern wraps Prisma; no direct Prisma usage outside repository classes.
- **NFR-04.4** TypeScript strict mode with zero `any`; ESLint and Prettier enforced in CI.

### NFR-05 Portability and Deployment

- **NFR-05.1** Deploy using a single `docker-compose.yml`.
- **NFR-05.2** Persist SQLite and optional local backups under `/app/data`.
- **NFR-05.3** All runtime config is environment-variable driven.
- **NFR-05.4** Health check endpoint `GET /api/health` reports DB connectivity.

### NFR-06 Observability

- **NFR-06.1** Emit structured JSON logs to `stdout` for log aggregation compatibility.
- **NFR-06.2** Capture full `stdout` and `stderr` from `tar` process for every backup run.

## 9. References

- Docker volume backup pattern: https://eastondev.com/blog/en/posts/dev/20251217-docker-volume-backup/
- HeroUI Next.js docs: https://www.heroui.com/docs/frameworks/nextjs
- Prisma + SQLite + auth setup reference: https://www.youtube.com/watch?v=EL8eXM1sGaU
