import type { Prisma, Volume } from '@prisma/client';
import { db } from '@/server/db';

export class VolumeRepository {
  async list(): Promise<Volume[]> {
    return db.volume.findMany({ orderBy: { dockerName: 'asc' } });
  }

  async findById(id: string): Promise<Volume | null> {
    return db.volume.findUnique({ where: { id } });
  }

  async findByDockerName(dockerName: string): Promise<Volume | null> {
    return db.volume.findUnique({ where: { dockerName } });
  }

  async upsertVolume(input: {
    dockerName: string;
    mountPath: string;
    driver: string;
    sizeBytes?: bigint;
    containers: Prisma.InputJsonValue;
    lastSeenAt: Date;
  }): Promise<Volume> {
    return db.volume.upsert({
      where: { dockerName: input.dockerName },
      create: input,
      update: {
        mountPath: input.mountPath,
        driver: input.driver,
        sizeBytes: input.sizeBytes,
        containers: input.containers,
        lastSeenAt: input.lastSeenAt,
      },
    });
  }
}
