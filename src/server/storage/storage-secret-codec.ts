import { decryptJson, encryptJson } from '@/server/crypto';
import type { StorageProviderConfig } from '@/server/storage/types';

export class StorageSecretCodec {
  encode(config: StorageProviderConfig): string {
    return encryptJson(config);
  }

  decode(configEncrypted: string): StorageProviderConfig {
    return decryptJson<StorageProviderConfig>(configEncrypted);
  }
}
