import { ProviderType, type StorageProvider } from '@prisma/client';
import { db } from '@/server/db';

export class StorageProviderRepository {
  async list(): Promise<StorageProvider[]> {
    return db.storageProvider.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async findById(id: string): Promise<StorageProvider | null> {
    return db.storageProvider.findUnique({ where: { id } });
  }

  async create(input: {
    name: string;
    type: ProviderType;
    configEncrypted: string;
    userId?: string;
  }): Promise<StorageProvider> {
    return db.storageProvider.create({
      data: {
        name: input.name,
        type: input.type,
        configEncrypted: input.configEncrypted,
        userId: input.userId,
      },
    });
  }

  async update(id: string, input: { name?: string; configEncrypted?: string; testedAt?: Date | null }): Promise<StorageProvider> {
    return db.storageProvider.update({
      where: { id },
      data: input,
    });
  }

  async delete(id: string): Promise<void> {
    await db.storageProvider.delete({ where: { id } });
  }
}
