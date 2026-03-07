import { auth } from '@/auth';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'OPERATOR';
  mustChangePassword: boolean;
};

export async function requireAuthUser(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    mustChangePassword: session.user.mustChangePassword,
  };
}

export async function requireAdminUser(): Promise<AuthUser> {
  const user = await requireAuthUser();
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden');
  }
  return user;
}
