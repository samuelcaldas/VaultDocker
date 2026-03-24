import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encryptJson, decryptJson } from '@/server/crypto';

describe('Crypto', () => {
  beforeEach(() => {
    process.env.APP_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  it('should encrypt and decrypt JSON correctly', () => {
    const payload = { foo: 'bar', secret: 123 };
    const encrypted = encryptJson(payload);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(JSON.stringify(payload));

    const decrypted = decryptJson<typeof payload>(encrypted);
    expect(decrypted).toEqual(payload);
  });

  it('should throw error when decrypting with wrong key', () => {
    const payload = { hello: 'world' };
    const encrypted = encryptJson(payload);

    // Change key
    process.env.APP_ENCRYPTION_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    
    expect(() => decryptJson(encrypted)).toThrow();
  });
});
