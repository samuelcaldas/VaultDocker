import { ProviderType } from '@prisma/client';
import { z } from 'zod';
import type {
  CreateStorageProviderInput,
  FtpProviderConfig,
  LocalProviderConfig,
  S3ProviderConfig,
  SftpProviderConfig,
  SmbProviderConfig,
  StorageProviderConfig,
  StorageProviderConfigByType,
  UpdateStorageProviderInput,
  GoogleDriveProviderConfig,
} from '@/server/storage/types';

const localSchema = z.object({
  basePath: z.string().min(1),
});

const googleDriveSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  refreshToken: z.string().min(1),
  folderId: z.string().optional(),
});

const s3Schema = z.object({
  bucket: z.string().min(1),
  region: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  endpoint: z.string().url().optional(),
  forcePathStyle: z.boolean().optional(),
  prefix: z.string().optional(),
});

const smbSchema = z.object({
  share: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  domain: z.string().optional(),
  autoCloseTimeout: z.number().int().min(0).optional(),
  prefix: z.string().optional(),
});

const ftpSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(21),
  username: z.string().min(1),
  password: z.string().min(1),
  secure: z.boolean().default(false),
  prefix: z.string().optional(),
  timeoutMs: z.number().int().min(1000).optional(),
});

const sftpSchema = z
  .object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535).default(22),
    username: z.string().min(1),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    passphrase: z.string().optional(),
    prefix: z.string().optional(),
    readyTimeoutMs: z.number().int().min(1000).optional(),
  })
  .refine((value) => Boolean(value.password) || Boolean(value.privateKey), {
    message: 'Either password or privateKey is required for SFTP.',
  });

const createInputSchema = z.object({
  name: z.string().min(1),
  type: z.nativeEnum(ProviderType),
  config: z.unknown(),
  userId: z.string().optional(),
});

const updateInputSchema = z.object({
  name: z.string().min(1).optional(),
  config: z.unknown().optional(),
});

export class StorageConfigValidator {
  parseLocal(raw: unknown): LocalProviderConfig {
    return localSchema.parse(raw);
  }

  parseS3(raw: unknown): S3ProviderConfig {
    return s3Schema.parse(raw);
  }

  parseSmb(raw: unknown): SmbProviderConfig {
    return smbSchema.parse(raw);
  }

  parseFtp(raw: unknown): FtpProviderConfig {
    return ftpSchema.parse(raw);
  }

  parseSftp(raw: unknown): SftpProviderConfig {
    return sftpSchema.parse(raw);
  }

  parseGoogleDrive(raw: unknown): GoogleDriveProviderConfig {
    return googleDriveSchema.parse(raw);
  }

  parseForType(type: ProviderType, raw: unknown): StorageProviderConfig {
    switch (type) {
      case ProviderType.LOCAL:
        return this.parseLocal(raw);
      case ProviderType.S3:
        return this.parseS3(raw);
      case ProviderType.SMB:
        return this.parseSmb(raw);
      case ProviderType.FTP:
        return this.parseFtp(raw);
      case ProviderType.SFTP:
        return this.parseSftp(raw);
      case ProviderType.GOOGLE_DRIVE:
        return this.parseGoogleDrive(raw);
      default:
        throw new Error(`Unsupported storage provider type: ${type}`);
    }
  }

  parseTypedConfig<T extends ProviderType>(type: T, raw: unknown): StorageProviderConfigByType[T] {
    return this.parseForType(type, raw) as StorageProviderConfigByType[T];
  }

  parseCreateInput(raw: unknown): CreateStorageProviderInput {
    const parsed = createInputSchema.parse(raw);

    return {
      name: parsed.name,
      type: parsed.type,
      config: this.parseForType(parsed.type, parsed.config),
      userId: parsed.userId,
    };
  }

  parseUpdateInput(type: ProviderType, raw: unknown): UpdateStorageProviderInput {
    const parsed = updateInputSchema.parse(raw);

    if (!parsed.config) {
      return {
        name: parsed.name,
      };
    }

    return {
      name: parsed.name,
      config: this.parseForType(type, parsed.config),
    };
  }
}
