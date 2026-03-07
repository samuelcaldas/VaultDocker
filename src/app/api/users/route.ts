import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { UserRepository } from '@/server/repositories/user-repository';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAdminUser } from '@/server/api-auth';
import { hashPassword } from '@/server/auth/password';
import { badRequest, forbidden, ok, unauthorized, serverError } from '@/server/http';

const repository = new UserRepository();

export async function GET() {
  try {
    await ensureRuntimeReady();
    await requireAdminUser();

    const users = await repository.list();

    return ok({
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isProtected: user.isProtected,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    if ((error as Error).message === 'Forbidden') {
      return forbidden();
    }
    return serverError((error as Error).message);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    await requireAdminUser();

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      role?: Role;
    };

    if (!body.name || !body.email || !body.password) {
      return badRequest('name, email, and password are required.');
    }

    const role = body.role ?? Role.OPERATOR;

    const user = await repository.create({
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role,
      isProtected: false,
      mustChangePassword: true,
    });

    return ok(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isProtected: user.isProtected,
          mustChangePassword: user.mustChangePassword,
          createdAt: user.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    if ((error as Error).message === 'Forbidden') {
      return forbidden();
    }
    return serverError((error as Error).message);
  }
}
