import "server-only";

import type { Prisma } from "@prisma/client";
import type { AppRole } from "@/domain/permissions";
import { canDeleteInfo } from "@/domain/permissions";
import { isRestorable, type TrashKind } from "@/domain/trash";
import { logActivity } from "@/server/activity";
import { prisma } from "@/server/db";

type ExpiredIds = Record<TrashKind, string[]>;

export async function dropExpiredTrash(ids: ExpiredIds) {
  const total = ids.task.length + ids.okr.length + ids.kpi.length + ids.info.length + ids.course.length;
  if (total === 0) return;
  await prisma.$transaction(async (tx) => {
    await deleteTrashIds(tx, ids);
  });
}

export async function restoreDeletedItem(actorId: string, entity: TrashKind, id: string): Promise<"ok" | "missing" | "expired"> {
  return prisma.$transaction(async (tx) => {
    const row = await readDeleted(tx, entity, id);
    if (!row?.deletedAt) return "missing";
    if (!isRestorable(row.deletedAt, new Date())) {
      await deleteTrashIds(tx, emptyIds({ [entity]: [id] }));
      return "expired";
    }
    await clearDeleted(tx, entity, id);
    await logActivity(tx, { actorId, entity, entityId: id, field: "deletedAt", before: row.deletedAt.toISOString(), after: null });
    return "ok";
  });
}

export async function destroyDeletedItem(
  actor: { id: string; role: AppRole },
  entity: TrashKind,
  id: string,
): Promise<"ok" | "missing" | "forbidden"> {
  return prisma.$transaction(async (tx) => {
    const row = await readDeleted(tx, entity, id);
    if (!row?.deletedAt) return "missing";
    if (entity === "info" && !canDeleteInfo(actor.role, row.byId, actor.id)) return "forbidden";
    await logActivity(tx, { actorId: actor.id, entity, entityId: id, field: "purged", before: row.deletedAt.toISOString(), after: null });
    await deleteTrashIds(tx, emptyIds({ [entity]: [id] }));
    return "ok";
  });
}

function emptyIds(partial: Partial<ExpiredIds>): ExpiredIds {
  return { task: [], okr: [], kpi: [], info: [], course: [], ...partial };
}

async function readDeleted(tx: Prisma.TransactionClient, entity: TrashKind, id: string): Promise<{ deletedAt: Date | null; byId: string | null } | null> {
  if (entity === "info") return tx.info.findUnique({ where: { id }, select: { deletedAt: true, byId: true } });
  const row = entity === "task"
    ? await tx.task.findUnique({ where: { id }, select: { deletedAt: true } })
    : entity === "okr"
      ? await tx.okr.findUnique({ where: { id }, select: { deletedAt: true } })
      : entity === "kpi"
        ? await tx.kpi.findUnique({ where: { id }, select: { deletedAt: true } })
        : await tx.course.findUnique({ where: { id }, select: { deletedAt: true } });
  return row ? { deletedAt: row.deletedAt, byId: null } : null;
}

async function clearDeleted(tx: Prisma.TransactionClient, entity: TrashKind, id: string) {
  const data = { deletedAt: null };
  if (entity === "task") await tx.task.update({ where: { id }, data });
  else if (entity === "okr") await tx.okr.update({ where: { id }, data });
  else if (entity === "kpi") await tx.kpi.update({ where: { id }, data });
  else if (entity === "info") await tx.info.update({ where: { id }, data });
  else await tx.course.update({ where: { id }, data });
}

async function deleteTrashIds(tx: Prisma.TransactionClient, ids: ExpiredIds) {
  if (ids.okr.length) await tx.task.updateMany({ where: { okrId: { in: ids.okr } }, data: { okrId: null } });
  if (ids.task.length) await tx.task.deleteMany({ where: { id: { in: ids.task } } });
  if (ids.okr.length) await tx.okr.deleteMany({ where: { id: { in: ids.okr } } });
  if (ids.kpi.length) await tx.kpi.deleteMany({ where: { id: { in: ids.kpi } } });
  if (ids.info.length) await tx.info.deleteMany({ where: { id: { in: ids.info } } });
  if (ids.course.length) await tx.course.deleteMany({ where: { id: { in: ids.course } } });
}
