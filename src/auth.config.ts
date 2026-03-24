import type { NextAuthConfig } from 'next-auth';
import { Role } from '@prisma/client';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.mustChangePassword = Boolean(user.mustChangePassword);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
