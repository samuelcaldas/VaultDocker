import { ProviderType } from '@prisma/client';
import type {
  FtpProviderConfig,
  LocalProviderConfig,
  S3ProviderConfig,
  SftpProviderConfig,
  SmbProviderConfig,
  GoogleDriveProviderConfig,
  StorageProviderConfig,
} from '@/server/storage/types';

function mask(value: string): string {
  if (value.length <= 4) {
    return '****';
  }

  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

export class StorageConfigRedactor {
  redact(type: ProviderType, config: StorageProviderConfig): Record<string, unknown> {
    switch (type) {
      case ProviderType.LOCAL:
        return this.redactLocal(config as LocalProviderConfig);
      case ProviderType.S3:
        return this.redactS3(config as S3ProviderConfig);
      case ProviderType.SMB:
        return this.redactSmb(config as SmbProviderConfig);
      case ProviderType.FTP:
        return this.redactFtp(config as FtpProviderConfig);
      case ProviderType.SFTP:
        return this.redactSftp(config as SftpProviderConfig);
      case ProviderType.GOOGLE_DRIVE:
        return this.redactGoogleDrive(config as GoogleDriveProviderConfig);
      default:
        throw new Error(`Unsupported storage provider type: ${type}`);
    }
  }

  private redactLocal(config: LocalProviderConfig): Record<string, unknown> {
    return {
      basePath: config.basePath,
    };
  }

  private redactS3(config: S3ProviderConfig): Record<string, unknown> {
    return {
      bucket: config.bucket,
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle ?? false,
      prefix: config.prefix,
      accessKeyIdMasked: mask(config.accessKeyId),
      hasSecretAccessKey: Boolean(config.secretAccessKey),
    };
  }

  private redactSmb(config: SmbProviderConfig): Record<string, unknown> {
    return {
      share: config.share,
      username: config.username,
      domain: config.domain,
      prefix: config.prefix,
      autoCloseTimeout: config.autoCloseTimeout,
      hasPassword: Boolean(config.password),
    };
  }

  private redactFtp(config: FtpProviderConfig): Record<string, unknown> {
    return {
      host: config.host,
      port: config.port,
      secure: config.secure,
      username: config.username,
      prefix: config.prefix,
      timeoutMs: config.timeoutMs,
      hasPassword: Boolean(config.password),
    };
  }

  private redactSftp(config: SftpProviderConfig): Record<string, unknown> {
    return {
      host: config.host,
      port: config.port,
      username: config.username,
      prefix: config.prefix,
      readyTimeoutMs: config.readyTimeoutMs,
      hasPassword: Boolean(config.password),
      hasPrivateKey: Boolean(config.privateKey),
      hasPassphrase: Boolean(config.passphrase),
    };
  }

  private redactGoogleDrive(config: GoogleDriveProviderConfig): Record<string, unknown> {
    return {
      clientIdMasked: mask(config.clientId),
      hasClientSecret: Boolean(config.clientSecret),
      hasRefreshToken: Boolean(config.refreshToken),
      folderId: config.folderId,
    };
  }
}
