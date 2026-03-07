import { createReadStream, createWriteStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ProviderType } from '@prisma/client';
import { applyRemotePrefix, normalizeRemotePath } from '@/server/storage/path-utils';
import type { StorageAdapter } from '@/server/storage/storage-adapter';
import type {
  S3ProviderConfig,
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

function createClient(config: S3ProviderConfig): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle ?? Boolean(config.endpoint),
  });
}

function resolveObjectKey(config: S3ProviderConfig, remotePath: string): string {
  return applyRemotePrefix(config.prefix, remotePath);
}

function toStoragePath(config: S3ProviderConfig, objectKey: string): string {
  const key = normalizeRemotePath(objectKey);
  const prefix = normalizeRemotePath(config.prefix ?? '').replace(/\/$/, '');

  if (!prefix) {
    return key;
  }

  if (key === prefix) {
    return '';
  }

  if (key.startsWith(`${prefix}/`)) {
    return key.slice(prefix.length + 1);
  }

  return key;
}

async function writeBodyToFile(body: unknown, localPath: string): Promise<void> {
  await mkdir(path.dirname(localPath), { recursive: true });

  if (body instanceof Readable) {
    await pipeline(body, createWriteStream(localPath));
    return;
  }

  if (typeof body === 'object' && body !== null && 'transformToByteArray' in body) {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    await writeFile(localPath, Buffer.from(bytes));
    return;
  }

  throw new Error('Unsupported S3 response body type.');
}

export class S3StorageAdapter implements StorageAdapter {
  readonly type = ProviderType.S3;

  async testConnection(config: StorageProviderConfig): Promise<StorageConnectionResult> {
    const s3Config = config as S3ProviderConfig;
    const client = createClient(s3Config);

    await client.send(new HeadBucketCommand({ Bucket: s3Config.bucket }));

    return {
      ok: true,
      message: 'S3 connection verified.',
    };
  }

  async upload(config: StorageProviderConfig, input: StorageUploadInput): Promise<StorageUploadResult> {
    const s3Config = config as S3ProviderConfig;
    const client = createClient(s3Config);
    const key = resolveObjectKey(s3Config, input.remotePath);

    const upload = new Upload({
      client,
      params: {
        Bucket: s3Config.bucket,
        Key: key,
        Body: createReadStream(input.localPath),
      },
    });

    await upload.done();

    return {
      storagePath: normalizeRemotePath(input.remotePath),
    };
  }

  async download(config: StorageProviderConfig, input: StorageDownloadInput): Promise<void> {
    const s3Config = config as S3ProviderConfig;
    const client = createClient(s3Config);

    const response = await client.send(
      new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: resolveObjectKey(s3Config, input.remotePath),
      }),
    );

    if (!response.Body) {
      throw new Error('S3 object body is empty.');
    }

    await writeBodyToFile(response.Body, input.localPath);
  }

  async delete(config: StorageProviderConfig, input: StorageDeleteInput): Promise<void> {
    const s3Config = config as S3ProviderConfig;
    const client = createClient(s3Config);

    await client.send(
      new DeleteObjectCommand({
        Bucket: s3Config.bucket,
        Key: resolveObjectKey(s3Config, input.remotePath),
      }),
    );
  }

  async exists(config: StorageProviderConfig, input: StorageExistsInput): Promise<boolean> {
    const s3Config = config as S3ProviderConfig;
    const client = createClient(s3Config);

    try {
      await client.send(
        new HeadObjectCommand({
          Bucket: s3Config.bucket,
          Key: resolveObjectKey(s3Config, input.remotePath),
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async list(config: StorageProviderConfig, input: StorageListInput): Promise<StorageListEntry[]> {
    const s3Config = config as S3ProviderConfig;
    const client = createClient(s3Config);

    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: s3Config.bucket,
        Prefix: resolveObjectKey(s3Config, input.prefix ?? ''),
        MaxKeys: input.limit,
      }),
    );

    const contents = response.Contents ?? [];

    return contents
      .filter((entry): entry is { Key: string; Size?: number; LastModified?: Date } => Boolean(entry.Key))
      .map((entry) => ({
        remotePath: toStoragePath(s3Config, entry.Key),
        sizeBytes: entry.Size,
        modifiedAt: entry.LastModified,
      }));
  }
}
