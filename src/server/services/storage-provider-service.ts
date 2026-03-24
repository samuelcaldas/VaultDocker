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
    await this.ensureLocalDirectory(input.type, config);

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

    const nextConfig = this.buildNextConfig(existing, input.config);
    await this.ensureLocalDirectory(existing.type, nextConfig);

    const updated = await this.repository.update(id, {
      name: input.name,
      configEncrypted: this.codec.encode(nextConfig),
    });

    return this.toView(updated);
  }

  private buildNextConfig(existing: StorageProvider, patchConfig: unknown): StorageProviderConfig {
    const currentConfig = this.decodeConfig(existing);
    const configPatch = patchConfig ? this.asConfigPatch(patchConfig) : {};
    return this.validator.parseTypedConfig(existing.type, {
      ...currentConfig,
      ...configPatch,
    });
  }

  private async ensureLocalDirectory(type: ProviderType, config: StorageProviderConfig): Promise<void> {
    if (type !== ProviderType.LOCAL) {
      return;
    }
    const localConfig = this.validator.parseLocal(config);
    await mkdir(localConfig.basePath, { recursive: true });
  }

  async testConnection(id: string): Promise<{ ok: boolean; message: string }> {
    const existing = await this.repository.findById(id);

    if (!existing) {
      return {
        ok: false,
        message: 'Storage provider not found.',
      };
    }

    return this.performTestConnection(existing);
  }

  private async performTestConnection(existing: StorageProvider) {
    const config = this.decodeConfig(existing);
    const adapter = this.adapterFactory.get(existing.type);
    const result = await adapter.testConnection(config);
    await this.markTestedIfOk(existing.id, result.ok);
    return result;
  }

  private async markTestedIfOk(id: string, isOk: boolean) {
    if (!isOk) {
      return;
    }
    await this.repository.update(id, {
      testedAt: new Date(),
    });
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
      return this.buildView(provider, redacted);
    } catch {
      return this.buildView(provider, null);
    }
  }

  private buildView(provider: StorageProvider, config: unknown | null): StorageProviderView {
    return {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      testedAt: provider.testedAt,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      userId: provider.userId,
      config: config as any,
    };
  }
}
