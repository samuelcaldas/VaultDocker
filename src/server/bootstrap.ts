import { ProviderType, Role } from '@prisma/client';
import { db } from '@/server/db';
import { encryptJson } from '@/server/crypto';
import { hashPassword } from '@/server/auth/password';

let bootstrapped = false;

function getDefaultLocalPath(): string {
  return process.env.LOCAL_BACKUP_PATH ?? '/app/data/backups';
}

export async function bootstrapSystem(): Promise<void> {
  if (bootstrapped) {
    return;
  }

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@vaultdocker.local';
  const adminName = process.env.DEFAULT_ADMIN_NAME ?? 'Admin User';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin';

  const admin = await db.user.findFirst({ where: { role: Role.ADMIN } });

  if (!admin) {
    await db.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash: await hashPassword(adminPassword),
        role: Role.ADMIN,
        isProtected: true,
        mustChangePassword: true,
      },
    });
  }

  await db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      appName: 'VaultDocker',
      timezone: 'UTC',
      defaultCompression: 6,
      sessionTimeoutMinutes: 60,
      notifyOnFailure: true,
      notifyOnSuccess: false,
    },
  });

  const provider = await db.storageProvider.findFirst({ where: { type: ProviderType.LOCAL } });
  if (!provider) {
    await db.storageProvider.create({
      data: {
        name: 'Local Backups',
        type: ProviderType.LOCAL,
        configEncrypted: encryptJson({ basePath: getDefaultLocalPath() }),
      },
    });
  } else if (!provider.configEncrypted) {
    await db.storageProvider.update({
      where: { id: provider.id },
      data: {
        configEncrypted: encryptJson({ basePath: getDefaultLocalPath() }),
      },
    });
  }

  bootstrapped = true;
}
