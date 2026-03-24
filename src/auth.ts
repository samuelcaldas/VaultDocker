import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { bootstrapSystem } from '@/server/bootstrap';
import { requireEnv } from '@/server/env';
import { UserRepository } from '@/server/repositories/user-repository';
import { verifyPassword } from '@/server/auth/password';
import { authConfig } from './auth.config';

const credentialSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

requireEnv('NEXTAUTH_SECRET');

const userRepository = new UserRepository();

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        await bootstrapSystem();

        const parsed = credentialSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const user = await userRepository.findByEmail(parsed.data.email);
        if (!user) {
          return null;
        }

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
});
