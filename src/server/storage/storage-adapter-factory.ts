import { ProviderType } from '@prisma/client';
import { FtpStorageAdapter } from '@/server/storage/adapters/ftp-storage-adapter';
import { GoogleDriveStorageAdapter } from '@/server/storage/adapters/google-drive-storage-adapter';
import { LocalStorageAdapter } from '@/server/storage/adapters/local-storage-adapter';
import { S3StorageAdapter } from '@/server/storage/adapters/s3-storage-adapter';
import { SftpStorageAdapter } from '@/server/storage/adapters/sftp-storage-adapter';
import { SmbStorageAdapter } from '@/server/storage/adapters/smb-storage-adapter';
import type { StorageAdapter } from '@/server/storage/storage-adapter';

export class StorageAdapterFactory {
  private readonly adapters: Map<ProviderType, StorageAdapter>;

  constructor() {
    this.adapters = new Map<ProviderType, StorageAdapter>([
      [ProviderType.LOCAL, new LocalStorageAdapter()],
      [ProviderType.S3, new S3StorageAdapter()],
      [ProviderType.SMB, new SmbStorageAdapter()],
      [ProviderType.FTP, new FtpStorageAdapter()],
      [ProviderType.SFTP, new SftpStorageAdapter()],
      [ProviderType.GOOGLE_DRIVE, new GoogleDriveStorageAdapter()],
    ]);
  }

  get(type: ProviderType): StorageAdapter {
    const adapter = this.adapters.get(type);

    if (adapter) {
      return adapter;
    }

    throw new Error(`No storage adapter registered for provider type ${type}.`);
  }
}
