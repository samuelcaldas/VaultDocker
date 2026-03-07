import { NextRequest } from 'next/server';
import { UserRepository } from '@/server/repositories/user-repository';
import { ensureRuntimeReady } from '@/server/runtime';
import { requireAdminUser } from '@/server/api-auth';
import { forbidden, notFound, ok, unauthorized, serverError } from '@/server/http';

const repository = new UserRepository();

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureRuntimeReady();
    await requireAdminUser();

    const { id } = await params;
    const targetUser = await repository.findById(id);

    if (!targetUser) {
      return notFound('User not found.');
    }

    if (targetUser.isProtected) {
      return forbidden('Protected users cannot be deleted.');
    }

    await repository.delete(id);
    return ok({ ok: true });
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
