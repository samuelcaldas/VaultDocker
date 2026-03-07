-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Volume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dockerName" TEXT NOT NULL,
    "mountPath" TEXT NOT NULL,
    "driver" TEXT NOT NULL,
    "sizeBytes" BIGINT,
    "containers" JSONB NOT NULL,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StorageProvider" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "configEncrypted" TEXT NOT NULL,
    "testedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "StorageProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "volumeId" TEXT NOT NULL,
    "storageProviderId" TEXT NOT NULL,
    "selectedPaths" JSONB NOT NULL,
    "exclusionGlobs" JSONB NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "nameFormat" TEXT NOT NULL,
    "compressionLevel" INTEGER NOT NULL,
    "retentionCount" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BackupJob_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "Volume" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BackupJob_storageProviderId_fkey" FOREIGN KEY ("storageProviderId") REFERENCES "StorageProvider" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BackupRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "archivePath" TEXT,
    "fileSizeBytes" BIGINT,
    "checksum" TEXT,
    "logs" TEXT,
    "errorMessage" TEXT,
    "backupName" TEXT,
    "storagePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BackupRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "BackupJob" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "appName" TEXT NOT NULL DEFAULT 'VaultDocker',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "defaultCompression" INTEGER NOT NULL DEFAULT 6,
    "webhookUrl" TEXT,
    "notifyOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnSuccess" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Volume_dockerName_key" ON "Volume"("dockerName");
