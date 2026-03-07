import { PrismaClient, ProviderType, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL ?? 'admin@vaultdocker.local';
  const adminName = process.env.DEFAULT_ADMIN_NAME ?? 'Admin User';
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? 'admin';

  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });

  if (!existingAdmin) {
    const passwordHash = await hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: Role.ADMIN,
        isProtected: true,
        mustChangePassword: true,
      },
    });
  }

  await prisma.settings.upsert({
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

  const providerCount = await prisma.storageProvider.count();
  if (providerCount === 0) {
    await prisma.storageProvider.create({
      data: {
        name: 'Local Backups',
        type: ProviderType.LOCAL,
        configEncrypted: '',
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
