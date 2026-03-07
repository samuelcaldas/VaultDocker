import { ProviderType } from '@prisma/client';

export type LocalProviderConfig = {
  basePath: string;
};

export type S3ProviderConfig = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  prefix?: string;
};

export type SmbProviderConfig = {
  share: string;
  username: string;
  password: string;
  domain?: string;
  autoCloseTimeout?: number;
  prefix?: string;
};

export type FtpProviderConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  prefix?: string;
  timeoutMs?: number;
};

export type SftpProviderConfig = {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  prefix?: string;
  readyTimeoutMs?: number;
};

export type StorageProviderConfigByType = {
  [ProviderType.LOCAL]: LocalProviderConfig;
  [ProviderType.S3]: S3ProviderConfig;
  [ProviderType.SMB]: SmbProviderConfig;
  [ProviderType.FTP]: FtpProviderConfig;
  [ProviderType.SFTP]: SftpProviderConfig;
};

export type StorageProviderConfig = StorageProviderConfigByType[ProviderType];

export type CreateStorageProviderInput = {
  name: string;
  type: ProviderType;
  config: StorageProviderConfig;
  userId?: string;
};

export type UpdateStorageProviderInput = {
  name?: string;
  config?: Record<string, unknown>;
};

export type StorageConnectionResult = {
  ok: boolean;
  message: string;
};

export type StorageUploadInput = {
  localPath: string;
  remotePath: string;
};

export type StorageUploadResult = {
  storagePath: string;
};

export type StorageDownloadInput = {
  remotePath: string;
  localPath: string;
};

export type StorageDeleteInput = {
  remotePath: string;
};

export type StorageExistsInput = {
  remotePath: string;
};

export type StorageListInput = {
  prefix?: string;
  limit?: number;
};

export type StorageListEntry = {
  remotePath: string;
  sizeBytes?: number;
  modifiedAt?: Date;
};

export type StorageProviderView = {
  id: string;
  name: string;
  type: ProviderType;
  testedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  config: Record<string, unknown> | null;
};
