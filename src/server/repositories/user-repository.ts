import { Role, type User } from '@prisma/client';
import { db } from '@/server/db';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({ where: { id } });
  }

  async list(): Promise<User[]> {
    return db.user.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async create(input: {
    email: string;
    name: string;
    passwordHash: string;
    role: Role;
    isProtected?: boolean;
    mustChangePassword?: boolean;
  }): Promise<User> {
    return db.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
        role: input.role,
        isProtected: input.isProtected ?? false,
        mustChangePassword: input.mustChangePassword ?? false,
      },
    });
  }

  async updateProfile(id: string, data: { name?: string; email?: string; passwordHash?: string; mustChangePassword?: boolean }): Promise<User> {
    return db.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await db.user.delete({ where: { id } });
  }
}
