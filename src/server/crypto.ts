import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { requireEnv } from '@/server/env';

function getKey(): Buffer {
  const configured = process.env.APP_ENCRYPTION_KEY;
  if (configured) {
    const normalized = configured.trim();
    if (/^[0-9a-fA-F]{64}$/.test(normalized)) {
      return Buffer.from(normalized, 'hex');
    }
    return createHash('sha256').update(normalized).digest();
  }

  const fallback = requireEnv('NEXTAUTH_SECRET');
  return createHash('sha256').update(fallback).digest();
}

export function encryptJson(payload: unknown): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  const plaintext = JSON.stringify(payload);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptJson<T>(ciphertext: string): T {
  const key = getKey();
  const raw = Buffer.from(ciphertext, 'base64');

  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const payload = raw.subarray(28);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as T;
}
