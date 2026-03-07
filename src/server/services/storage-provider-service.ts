import { mkdir, access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { ProviderType } from '@prisma/client';
import { decryptJson, encryptJson } from '@/server/crypto';
import { StorageProviderRepository } from '@/server/repositories/storage-provider-repository';

type LocalProviderConfig = {
  basePath: string;
};

export class StorageProviderService {
  private readonly repository = new StorageProviderRepository();

  async list() {
    const providers = await this.repository.list();
    return providers.map((provider) => {
      let config: LocalProviderConfig | null = null;
      try {
        config = decryptJson<LocalProviderConfig>(provider.configEncrypted);
      } catch {
        config = null;
      }

      return {
        ...provider,
        config,
      };
    });
  }

  async getById(id: string) {
    const provider = await this.repository.findById(id);
    if (!provider) {
      return null;
    }

    let config: LocalProviderConfig | null = null;
    try {
      config = decryptJson<LocalProviderConfig>(provider.configEncrypted);
    } catch {
      config = null;
    }

    return {
      ...provider,
      config,
    };
  }

  async createLocalProvider(input: { name: string; basePath: string; userId?: string }) {
    await mkdir(input.basePath, { recursive: true });

    const encrypted = encryptJson({ basePath: input.basePath });

    return this.repository.create({
      name: input.name,
      type: ProviderType.LOCAL,
      configEncrypted: encrypted,
      userId: input.userId,
    });
  }

  async updateLocalProvider(id: string, input: { name?: string; basePath?: string }) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return null;
    }

    let config = decryptJson<LocalProviderConfig>(existing.configEncrypted);
    if (input.basePath) {
      await mkdir(input.basePath, { recursive: true });
      config = { basePath: input.basePath };
    }

    const updated = await this.repository.update(id, {
      name: input.name,
      configEncrypted: encryptJson(config),
    });

    return updated;
  }

  async testConnection(id: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      return { ok: false, message: 'Storage provider not found.' };
    }

    if (existing.type !== ProviderType.LOCAL) {
      return { ok: false, message: 'Only LOCAL provider is supported in this release.' };
    }

    const config = decryptJson<LocalProviderConfig>(existing.configEncrypted);

    try {
      await mkdir(config.basePath, { recursive: true });
      await access(config.basePath, fsConstants.R_OK | fsConstants.W_OK);
      await this.repository.update(id, { testedAt: new Date() });
      return { ok: true, message: 'Connection verified.' };
    } catch (error) {
      return { ok: false, message: `Cannot access local path: ${(error as Error).message}` };
    }
  }

  async delete(id: string) {
    await this.repository.delete(id);
  }
}
