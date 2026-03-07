import { compare, hash } from 'bcryptjs';

export async function hashPassword(plainText: string): Promise<string> {
  return hash(plainText, 12);
}

export async function verifyPassword(plainText: string, passwordHash: string): Promise<boolean> {
  return compare(plainText, passwordHash);
}
