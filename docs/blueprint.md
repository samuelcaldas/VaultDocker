# **App Name**: VaultDock

## Core Features:

- Secure User & Access Management: Provide secure user authentication with NextAuth.js, support 'ADMIN' and 'OPERATOR' roles, and protect sensitive data like password hashes and storage credentials.
- Docker Volume Discovery & Details: Automatically discover and list all Docker volumes by introspecting the Docker Engine API via a read-only Unix socket, showing associated containers and mount points.
- Flexible Backup Job Configuration: Enable users to define backup jobs for specific volumes, select files/folders with exclusion patterns, configure cron-based schedules, compression levels, and retention policies.
- Multi-Provider Storage Integration: Allow seamless configuration and management of various external storage providers, including Google Drive, SMB, FTP/SFTP, S3-compatible, and local file system paths, with connection testing.
- Automated & On-Demand Backup Execution: Execute backups manually or as per schedule, creating 'tar.gz' archives, generating SHA-256 checksums, streaming uploads to storage providers, and maintaining detailed run logs and status.
- Secure Data Restoration with Verification: Provide a mechanism to browse past backup archives, verify data integrity via SHA-256 checksums, and safely restore volumes, including an optional pre-restore safety backup to prevent accidental data loss.
- AI-Powered Backup Naming Assistant: A tool that suggests and constructs custom backup archive name formats using provided tokens (e.g., {job}, {volume}, {date}), helping users create consistent and descriptive filenames for their archives.

## Style Guidelines:

- A sophisticated dark theme inspired by technical dashboards, signifying security and reliability. The primary color, a calming blue (#4DA4E5), provides emphasis against the very dark, subtle blue-grey background (#17191C), while a soft turquoise accent (#A0DFDF) is used for interactive elements and highlights.
- Headline and body text use 'Inter', a modern sans-serif for clarity and legibility in a technical interface. Code snippets or path displays will use 'Source Code Pro', a monospaced font.
- Utilize a clean, consistent set of modern, vector-based icons from HeroUI to represent Docker concepts, storage providers, job statuses, and user actions, enhancing navigation and understanding.
- The layout follows a classic dashboard pattern with a prominent top navigation bar and a persistent left-hand sidebar for primary navigation, integrating HeroUI's 'Navbar' and 'Listbox' components. Content areas feature data tables, interactive forms (often within modals or drawers), and summary cards.
- Implement subtle and purposeful animations using Framer Motion to provide visual feedback for user interactions, state changes (e.g., backup status updates), and seamless transitions between UI elements like modals, drawers, and page changes, without being distracting.