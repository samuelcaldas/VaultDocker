import { describe, it, expect, beforeEach } from 'vitest';
import { StorageConfigValidator } from '@/server/storage/storage-config-validator';
import { ProviderType } from '@prisma/client';

describe('StorageConfigValidator', () => {
  let validator: StorageConfigValidator;

  beforeEach(() => {
    validator = new StorageConfigValidator();
  });

  describe('parseLocal', () => {
    it('should validate valid local config', () => {
      const config = { basePath: '/tmp/backups' };
      expect(validator.parseLocal(config)).toEqual(config);
    });

    it('should throw for invalid local config', () => {
      expect(() => validator.parseLocal({})).toThrow();
    });
  });

  describe('parseGoogleDrive', () => {
    it('should validate valid gdrive config', () => {
      const config = {
        clientId: 'id',
        clientSecret: 'secret',
        refreshToken: 'token',
        folderId: 'folder'
      };
      expect(validator.parseGoogleDrive(config)).toEqual(config);
    });
  });

  describe('parseSftp', () => {
    it('should validate SFTP with password', () => {
      const config = {
        host: 'localhost',
        port: 22,
        username: 'user',
        password: 'pass'
      };
      expect(validator.parseSftp(config)).toEqual(config);
    });

    it('should validate SFTP with privateKey', () => {
      const config = {
        host: 'localhost',
        port: 22,
        username: 'user',
        privateKey: '---PRIVATE KEY---'
      };
      expect(validator.parseSftp(config)).toEqual(config);
    });

    it('should throw if neither password nor privateKey is provided', () => {
      const config = {
        host: 'localhost',
        port: 22,
        username: 'user'
      };
      expect(() => validator.parseSftp(config)).toThrow();
    });
  });

  describe('parseCreateInput', () => {
    it('should parse valid create input', () => {
      const input = {
        name: 'My S3',
        type: ProviderType.S3,
        config: {
          bucket: 'my-bucket',
          region: 'us-east-1',
          accessKeyId: 'AKIA',
          secretAccessKey: 'SECRET'
        }
      };
      const result = validator.parseCreateInput(input);
      expect(result.name).toBe('My S3');
      expect(result.type).toBe(ProviderType.S3);
      expect(result.config).toEqual(input.config);
    });
  });
});
