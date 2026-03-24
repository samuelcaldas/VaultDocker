import { createReadStream, createWriteStream } from 'fs';
import { google } from 'googleapis';
import type { StorageAdapter } from '../storage-adapter';
import type {
  GoogleDriveProviderConfig,
  StorageConnectionResult,
  StorageDeleteInput,
  StorageDownloadInput,
  StorageExistsInput,
  StorageListEntry,
  StorageListInput,
  StorageUploadInput,
  StorageUploadResult,
} from '../types';

export class GoogleDriveStorageAdapter implements StorageAdapter {
  async testConnection(config: GoogleDriveProviderConfig): Promise<StorageConnectionResult> {
    try {
      const drive = this.getDriveClient(config);
      await drive.files.list({
        pageSize: 1,
        fields: 'files(id, name)',
        q: config.folderId ? `\'${config.folderId}\' in parents` : undefined,
      });

      return {
        ok: true,
        message: 'Successfully connected to Google Drive.',
      };
    } catch (error) {
      return {
        ok: false,
        message: `Failed to connect to Google Drive: ${(error as Error).message}`,
      };
    }
  }

  async upload(config: GoogleDriveProviderConfig, input: StorageUploadInput): Promise<StorageUploadResult> {
    const drive = this.getDriveClient(config);
    const media = {
      mimeType: 'application/octet-stream',
      body: createReadStream(input.localPath),
    };

    const fileMetadata = {
      name: input.remotePath,
      parents: config.folderId ? [config.folderId] : undefined,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id',
    });

    if (!response.data.id) {
      throw new Error('Upload failed: No file ID returned.');
    }

    return {
      storagePath: response.data.id,
    };
  }

  async download(config: GoogleDriveProviderConfig, input: StorageDownloadInput): Promise<void> {
    const drive = this.getDriveClient(config);
    const dest = createWriteStream(input.localPath);

    const response = await drive.files.get(
      { fileId: input.remotePath, alt: 'media' },
      { responseType: 'stream' }
    );

    return new Promise((resolve, reject) => {
      response.data
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .pipe(dest);
    });
  }

  async delete(config: GoogleDriveProviderConfig, input: StorageDeleteInput): Promise<void> {
    const drive = this.getDriveClient(config);
    await drive.files.delete({
      fileId: input.remotePath,
    });
  }

  async exists(config: GoogleDriveProviderConfig, input: StorageExistsInput): Promise<boolean> {
    try {
      const drive = this.getDriveClient(config);
      await drive.files.get({
        fileId: input.remotePath,
        fields: 'id',
      });
      return true;
    } catch (error: any) {
      if (error.code === 404) {
        return false;
      }
      throw error;
    }
  }

  async list(config: GoogleDriveProviderConfig, input: StorageListInput): Promise<StorageListEntry[]> {
    const drive = this.getDriveClient(config);
    const q = [];

    if (config.folderId) {
      q.push(`\'${config.folderId}\' in parents`);
    }

    if (input.prefix) {
      q.push(`name contains \'${input.prefix}\'`);
    }

    const response = await drive.files.list({
      q: q.length > 0 ? q.join(' and ') : undefined,
      pageSize: input.limit ?? 100,
      fields: 'files(id, name, size, modifiedTime)',
    });

    const files = response.data.files ?? [];

    return files.map((file) => ({
      remotePath: file.id!,
      sizeBytes: file.size ? parseInt(file.size, 10) : undefined,
      modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
    }));
  }

  private getDriveClient(config: GoogleDriveProviderConfig) {
    const auth = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret
    );

    auth.setCredentials({ refresh_token: config.refreshToken });

    return google.drive({ version: 'v3', auth });
  }
}
