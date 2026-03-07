import { mkdir } from 'fs/promises';
import { ProviderType, type StorageProvider } from '@prisma/client';
import { StorageProviderRepository } from '@/server/repositories/storage-provider-repository';
import { StorageAdapterFactory } from '@/server/storage/storage-adapter-factory';
import { StorageConfigRedactor } from '@/server/storage/storage-config-redactor';
import { StorageConfigValidator } from '@/server/storage/storage-config-validator';
import { StorageSecretCodec } from '@/server/storage/storage-secret-codec';
import type {
  CreateStorageProviderInput,
  StorageProviderConfig,
  StorageProviderView,
  UpdateStorageProviderInput,
} from '@/server/storage/types';

export class StorageProviderService {
  private readonly repository = new StorageProviderRepository();
  private readonly validator = new StorageConfigValidator();
  private readonly codec = new StorageSecretCodec();
  private readonly redactor = new StorageConfigRedactor();
  private readonly adapterFactory = new StorageAdapterFactory();

  async list(): Promise<StorageProviderView[]> {
    const providers = await this.repository.list();
    return providers.map((provider) => this.toView(provider));
  }

  async getById(id: string): Promise<StorageProviderView | null> {
    const provider = await this.repository.findById(id);

    if (!provider) {
      return null;
    }

    return this.toView(provider);
  }

  async create(input: CreateStorageProviderInput): Promise<StorageProviderView> {
    const config = this.validator.parseTypedConfig(input.type, input.config);

    if (input.type === ProviderType.LOCAL) {
      const localConfig = this.validator.parseLocal(config);
      await mkdir(localConfig.basePath, { recursive: true });
    }

    const provider = await this.repository.create({
      name: input.name,
      type: input.type,
      configEncrypted: this.codec.encode(config),
      userId: input.userId,
    });

    return this.toView(provider);
  }

  async update(id: string, input: UpdateStorageProviderInput): Promise<StorageProviderView | null> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      return null;
    }

    const currentConfig = this.decodeConfig(existing);
    const configPatch = input.config ? this.asConfigPatch(input.config) : {};
    const nextConfig = this.validator.parseTypedConfig(existing.type, {
      ...currentConfig,
      ...configPatch,
    });

    if (existing.type === ProviderType.LOCAL) {
      const localConfig = this.validator.parseLocal(nextConfig);
      await mkdir(localConfig.basePath, { recursive: true });
    }

    const updated = await this.repository.update(id, {
      name: input.name,
      configEncrypted: this.codec.encode(nextConfig),
    });

    return this.toView(updated);
  }

  async testConnection(id: string): Promise<{ ok: boolean; message: string }> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      return {
        ok: false,
        message: 'Storage provider not found.',
      };
    }

    const config = this.decodeConfig(existing);
    const adapter = this.adapterFactory.get(existing.type);
    const result = await adapter.testConnection(config);

    if (result.ok) {
      await this.repository.update(id, {
        testedAt: new Date(),
      });
    }

    return result;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  decodeConfig(provider: Pick<StorageProvider, 'type' | 'configEncrypted'>): StorageProviderConfig {
    const decoded = this.codec.decode(provider.configEncrypted);
    return this.validator.parseForType(provider.type, decoded);
  }

  getAdapter(type: ProviderType) {
    return this.adapterFactory.get(type);
  }

  private asConfigPatch(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Config update must be an object.');
    }

    return value as Record<string, unknown>;
  }

  private toView(provider: StorageProvider): StorageProviderView {
    try {
      const config = this.decodeConfig(provider);
      const redacted = this.redactor.redact(provider.type, config);

      return {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        testedAt: provider.testedAt,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        userId: provider.userId,
        config: redacted,
      };
    } catch {
      return {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        testedAt: provider.testedAt,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        userId: provider.userId,
        config: null,
      };
    }
  }
}
