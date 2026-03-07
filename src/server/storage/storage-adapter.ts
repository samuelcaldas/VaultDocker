import { ProviderType } from '@prisma/client';
import type {
  StorageConnectionResult,
  StorageDeleteInput,
  StorageDownloadInput,
  StorageExistsInput,
  StorageListEntry,
  StorageListInput,
  StorageProviderConfig,
  StorageUploadInput,
  StorageUploadResult,
} from '@/server/storage/types';

export interface StorageAdapter {
  readonly type: ProviderType;

  testConnection(config: StorageProviderConfig): Promise<StorageConnectionResult>;
  upload(config: StorageProviderConfig, input: StorageUploadInput): Promise<StorageUploadResult>;
  download(config: StorageProviderConfig, input: StorageDownloadInput): Promise<void>;
  delete(config: StorageProviderConfig, input: StorageDeleteInput): Promise<void>;
  exists(config: StorageProviderConfig, input: StorageExistsInput): Promise<boolean>;
  list(config: StorageProviderConfig, input: StorageListInput): Promise<StorageListEntry[]>;
}
