import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from '@/server/repositories/user-repository';
import { Role } from '@prisma/client';

vi.mock('@/server/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { db } from '@/server/db';

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new UserRepository();
  });

  it('should find by email', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    vi.mocked(db.user.findUnique).mockResolvedValue(mockUser as any);

    const user = await repository.findByEmail('test@example.com');
    expect(user).toEqual(mockUser);
    expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
  });

  it('should create a user', async () => {
    const input = {
      email: 'new@example.com',
      name: 'New User',
      passwordHash: 'hashed',
      role: Role.OPERATOR,
    };
    const mockUser = { id: '2', ...input };
    vi.mocked(db.user.create).mockResolvedValue(mockUser as any);

    const user = await repository.create(input);
    expect(user).toEqual(mockUser);
    expect(db.user.create).toHaveBeenCalled();
  });
});
