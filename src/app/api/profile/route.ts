import { NextRequest } from 'next/server';
import { UserRepository } from '@/server/repositories/user-repository';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAuthUser } from '@/server/api-auth';
import { hashPassword, verifyPassword } from '@/server/auth/password';
import { badRequest, ok, unauthorized, serverError } from '@/server/http';

const repository = new UserRepository();

export async function GET() {
  try {
    await ensureRuntimeReady();
    const authUser = await requireAuthUser();

    const user = await repository.findById(authUser.id);
    if (!user) {
      return unauthorized();
    }

    return ok({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await ensureRuntimeReady();
    const authUser = await requireAuthUser();

    const body = (await request.json()) as {
      name?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const existing = await repository.findById(authUser.id);
    if (!existing) {
      return unauthorized();
    }

    let passwordHash: string | undefined;
    let mustChangePassword: boolean | undefined;

    if (body.newPassword) {
      if (!body.currentPassword) {
        return badRequest('currentPassword is required to change password.');
      }

      const valid = await verifyPassword(body.currentPassword.trim(), existing.passwordHash);
      if (!valid) {
        return badRequest('Current password is invalid.');
      }

      passwordHash = await hashPassword(body.newPassword.trim());
      mustChangePassword = false;
    }

    const updated = await repository.updateProfile(authUser.id, {
      name: body.name,
      email: body.email,
      passwordHash,
      mustChangePassword,
    });

    return ok({
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        mustChangePassword: updated.mustChangePassword,
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return unauthorized();
    }
    return serverError((error as Error).message);
  }
}
