import type { Prisma } from "@prisma/client";

export async function logActivity(
  tx: Prisma.TransactionClient,
  entry: {
    actorId: string | null;
    entity: string;
    entityId: string;
    field?: string;
    before?: string | null;
    after?: string | null;
  },
) {
  await tx.activityLog.create({
    data: {
      actorId: entry.actorId,
      entity: entry.entity,
      entityId: entry.entityId,
      field: entry.field,
      before: entry.before ?? null,
      after: entry.after ?? null,
    },
  });
}
