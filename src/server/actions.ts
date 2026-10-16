"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { anomalyFileError } from "@/domain/anomaly-files";
import { anomalyFieldChanges } from "@/domain/anomalies";
import { memberRoleChangeError } from "@/domain/team";
import { buildSummary, type SummaryFacts } from "@/domain/summary";
import {
  anomalyCommentSchema,
  anomalyStatusSchema,
  anomalyUpdateSchema,
  anomalyWriteSchema,
  memberUpdateSchema,
  memberWriteSchema,
  courseWriteSchema,
  infoWriteSchema,
  kpiValueSchema,
  kpiWriteSchema,
  meetingWriteSchema,
  mgmtWriteSchema,
  moveTaskSchema,
  notesWriteSchema,
  okrWriteSchema,
  projectPhaseChangeSchema,
  taskWriteSchema,
} from "@/domain/schemas";
import { canDeleteInfo, canWriteCollection } from "@/domain/permissions";
import { trashItemSchema } from "@/domain/schemas";
import { stamp } from "@/domain/tasks";
import { todayISO } from "@/lib/dates";
import { setDevActor } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import { requireAdmin, requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { anomalyStorage } from "@/server/storage";
import { destroyDeletedItem, restoreDeletedItem } from "@/server/trash";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: unknown): ActionResult {
  if (typeof error === "object" && error && "digest" in error && String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) {
    throw error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2028") {
    return { ok: false, error: "La base est momentanément saturée. Réessayez dans un instant." };
  }
  return { ok: false, error: "Enregistrement impossible pour le moment. Réessayez dans un instant." };
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function switchActor(userId: string) {
  await setDevActor(userId);
  refresh();
}

export async function saveTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = taskWriteSchema.parse(input);
    if (data.status === "blocked" && !data.blocker) {
      return { ok: false, error: "Indiquez la raison du blocage." };
    }
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      if (data.id) {
        const prev = await tx.task.findUnique({ where: { id: data.id }, include: { history: true } });
        if (!prev || prev.deletedAt) throw new Error("Tâche introuvable.");
        const next = stamp(
          {
            status: prev.status,
            blocker: data.blocker,
            history: prev.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status, by: entry.byId })),
          },
          data.status,
          user.id,
          now,
        );
        await tx.task.update({
          where: { id: data.id },
          data: {
            title: data.title,
            projectId: data.projectId,
            phase: data.phase,
            okrId: data.okrId,
            assigneeId: data.assigneeId,
            due: data.due,
            date: data.date,
            priority: data.priority,
            status: data.status,
            blocker: data.status === "blocked" ? data.blocker : null,
            updatedById: user.id,
            doneAt: next.doneAt ? new Date(next.doneAt) : prev.doneAt,
            blockedAt: next.blockedAt ? new Date(next.blockedAt) : prev.blockedAt,
          },
        });
        if (next.history) {
          await tx.taskHistory.deleteMany({ where: { taskId: data.id } });
          await tx.taskHistory.createMany({
            data: next.history.map((entry) => ({
              taskId: data.id!,
              at: new Date(entry.at),
              status: entry.status as "todo" | "doing" | "blocked" | "done",
              byId: entry.by ?? null,
            })),
          });
        }
        await logActivity(tx, { actorId: user.id, entity: "task", entityId: data.id, field: "title", before: prev.title, after: data.title });
      } else {
        const id = randomUUID();
        const next = stamp({ status: "", history: [], blocker: data.blocker }, data.status, user.id, now);
        await tx.task.create({
          data: {
            id,
            title: data.title,
            projectId: data.projectId,
            phase: data.phase,
            okrId: data.okrId,
            assigneeId: data.assigneeId ?? user.id,
            due: data.due,
            date: data.date,
            priority: data.priority,
            status: data.status,
            blocker: data.status === "blocked" ? data.blocker : null,
            createdAt: now,
            createdById: user.id,
            updatedById: user.id,
            doneAt: next.doneAt ? new Date(next.doneAt) : null,
            blockedAt: next.blockedAt ? new Date(next.blockedAt) : null,
            history: {
              create: (next.history ?? []).map((entry) => ({
                at: new Date(entry.at),
                status: entry.status as "todo" | "doing" | "blocked" | "done",
                byId: entry.by,
              })),
            },
          },
        });
        await logActivity(tx, { actorId: user.id, entity: "task", entityId: id, field: "create", after: data.title });
      }
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function moveTask(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = moveTaskSchema.parse(input);
    if (data.status === "blocked" && !data.blocker) return { ok: false, error: "Indiquez la raison du blocage." };
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const prev = await tx.task.findUnique({ where: { id: data.id }, include: { history: true } });
      if (!prev || prev.deletedAt) throw new Error("Tâche introuvable.");
      const next = stamp(
        {
          status: prev.status,
          blocker: data.blocker,
          history: prev.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status, by: entry.byId })),
        },
        data.status,
        user.id,
        now,
      );
      await tx.task.update({
        where: { id: data.id },
        data: {
          status: data.status,
          blocker: data.status === "blocked" ? data.blocker : null,
          updatedById: user.id,
          doneAt: next.doneAt ? new Date(next.doneAt) : data.status === "done" ? prev.doneAt : null,
          blockedAt: next.blockedAt ? new Date(next.blockedAt) : prev.blockedAt,
        },
      });
      if (next.history) {
        const last = next.history[next.history.length - 1];
        if (last) {
          await tx.taskHistory.create({
            data: { taskId: data.id, at: new Date(last.at), status: data.status, byId: user.id },
          });
        }
      }
      await logActivity(tx, { actorId: user.id, entity: "task", entityId: data.id, field: "status", before: prev.status, after: data.status });
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function softDelete(entity: "task" | "okr" | "kpi" | "info" | "course", id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      if (entity === "info") {
        const info = await tx.info.findUnique({ where: { id } });
        if (!info || info.deletedAt) throw new Error("Info introuvable.");
        if (!canDeleteInfo(user.role, info.byId, user.id)) throw new Error("Vous ne pouvez pas retirer cette info.");
        await tx.info.update({ where: { id }, data: { deletedAt: now } });
      } else if (entity === "task") {
        await tx.task.update({ where: { id }, data: { deletedAt: now } });
      } else if (entity === "okr") {
        await tx.okr.update({ where: { id }, data: { deletedAt: now } });
      } else if (entity === "kpi") {
        await tx.kpi.update({ where: { id }, data: { deletedAt: now } });
      } else {
        await tx.course.update({ where: { id }, data: { deletedAt: now } });
      }
      await logActivity(tx, { actorId: user.id, entity, entityId: id, field: "deletedAt", after: now.toISOString() });
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function restoreItem(entity: "task" | "okr" | "kpi" | "info" | "course", id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = trashItemSchema.parse({ entity, id });
    const result = await restoreDeletedItem(user.id, parsed.entity, parsed.id);
    if (result === "missing") return { ok: false, error: "Élément introuvable." };
    if (result === "expired") return { ok: false, error: "Le délai de 30 jours est dépassé. L'élément ne peut plus être restauré." };
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function purgeTrashItem(entity: unknown, id: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = trashItemSchema.parse({ entity, id });
    const result = await destroyDeletedItem({ id: user.id, role: user.role }, parsed.entity, parsed.id);
    if (result === "missing") return { ok: false, error: "Élément introuvable." };
    if (result === "forbidden") return { ok: false, error: "Vous ne pouvez pas supprimer définitivement cette info." };
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveOkr(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = okrWriteSchema.parse(input);
    await prisma.$transaction(async (tx) => {
      const id = data.id ?? randomUUID();
      await tx.okr.upsert({
        where: { id },
        update: { projectId: data.projectId, phase: data.phase, title: data.title, due: data.due },
        create: { id, projectId: data.projectId, phase: data.phase, title: data.title, due: data.due },
      });
      const keep = data.keyResults.map((kr) => kr.id);
      await tx.keyResult.deleteMany({
        where: keep.length ? { okrId: id, id: { notIn: keep } } : { okrId: id },
      });
      for (const kr of data.keyResults) {
        await tx.keyResult.upsert({
          where: { okrId_id: { okrId: id, id: kr.id } },
          update: { label: kr.label, target: kr.target, current: kr.current, unit: kr.unit },
          create: { ...kr, okrId: id },
        });
      }
      await logActivity(tx, { actorId: user.id, entity: "okr", entityId: id, field: "title", after: data.title });
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setKeyResultCurrent(okrId: string, krId: string, current: number): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!Number.isFinite(current)) return { ok: false, error: "Valeur invalide." };
    await prisma.$transaction(async (tx) => {
      const prev = await tx.keyResult.findUnique({ where: { okrId_id: { okrId, id: krId } } });
      if (!prev) throw new Error("Résultat clé introuvable.");
      await tx.keyResult.update({ where: { okrId_id: { okrId, id: krId } }, data: { current } });
      await logActivity(tx, {
        actorId: user.id,
        entity: "okr",
        entityId: okrId,
        field: krId,
        before: String(prev.current),
        after: String(current),
      });
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveKpi(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = kpiWriteSchema.parse(input);
    const id = data.id ?? randomUUID();
    await prisma.kpi.upsert({
      where: { id },
      update: { label: data.label, unit: data.unit, target: data.target, projectId: data.projectId },
      create: { id, label: data.label, unit: data.unit, target: data.target, projectId: data.projectId, createdAt: new Date() },
    });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "kpi", entityId: id, field: "label", after: data.label } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setKpiValue(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = kpiValueSchema.parse(input);
    if (data.value == null) {
      await prisma.kpiValue.deleteMany({ where: { kpiId: data.kpiId, date: data.date } });
    } else {
      await prisma.kpiValue.upsert({
        where: { kpiId_date: { kpiId: data.kpiId, date: data.date } },
        update: { value: data.value },
        create: { kpiId: data.kpiId, date: data.date, value: data.value },
      });
    }
    await prisma.activityLog.create({
      data: { actorId: user.id, entity: "kpi", entityId: data.kpiId, field: data.date, after: data.value == null ? null : String(data.value) },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveInfo(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = infoWriteSchema.parse(input);
    const id = randomUUID();
    await prisma.info.create({
      data: { id, ...data, source: data.source, byId: user.id, createdAt: new Date() },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveCourse(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = courseWriteSchema.parse(input);
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project?.coursesEnabled) return { ok: false, error: "Les courses ne sont pas activées sur ce projet." };
    if (data.date > todayISO()) return { ok: false, error: "La date ne peut pas être dans le futur." };
    await prisma.course.create({
      data: { id: randomUUID(), ...data, byId: user.id, createdAt: new Date() },
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveAnomaly(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = anomalyWriteSchema.parse({
      projectId: formData.get("projectId"),
      date: formData.get("date"),
      text: formData.get("text"),
      severity: formData.get("severity"),
    });
    const project = await prisma.project.findUnique({ where: { id: parsed.projectId } });
    if (!project?.anomaliesEnabled) return { ok: false, error: "Les anomalies ne sont pas activées sur ce projet." };
    if (parsed.date > todayISO()) return { ok: false, error: "La date ne peut pas être dans le futur." };
    const file = formData.get("file");
    const id = randomUUID();
    let stored: { name: string; mimeType: string; storagePath: string } | null = null;
    if (file instanceof File && file.size > 0) {
      const uploaded = await storeAnomalyUpload(id, file);
      if (!uploaded.ok) return uploaded;
      stored = uploaded;
    }
    await prisma.anomaly.create({
      data: {
        id,
        ...parsed,
        byId: user.id,
        createdAt: new Date(),
        file: stored
          ? { create: { kind: "asset", name: stored.name, mimeType: stored.mimeType, storagePath: stored.storagePath, unavailable: false } }
          : undefined,
      },
    });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "anomaly", entityId: id, field: "text", after: parsed.text } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setAnomalyStatus(id: string, status: "open" | "progress" | "resolved"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const next = anomalyStatusSchema.safeParse(status);
    if (!id || !next.success) return { ok: false, error: "Statut invalide." };
    const current = await prisma.anomaly.findUnique({ where: { id } });
    if (!current) return { ok: false, error: "Anomalie introuvable." };
    if (current.status === next.data) return { ok: true };
    await prisma.anomaly.update({ where: { id }, data: { status: next.data } });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "anomaly", entityId: id, field: "status", before: current.status, after: next.data } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function assignAnomaly(id: string, assigneeId: string | null): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const current = await prisma.anomaly.findUnique({ where: { id } });
    if (!current) return { ok: false, error: "Anomalie introuvable." };
    if (assigneeId) {
      const member = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (!member) return { ok: false, error: "Ce membre n'existe pas." };
    }
    await prisma.anomaly.update({ where: { id }, data: { assigneeId } });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "anomaly", entityId: id, field: "assignee", before: current.assigneeId, after: assigneeId } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const ANOMALY_PROJECTS = new Set(["safya", "triage", "rpm"]);

async function storeAnomalyUpload(id: string, file: File) {
  const error = anomalyFileError({ type: file.type, size: file.size });
  if (error) return { ok: false as const, error };
  const storagePath = await anomalyStorage().save({
    id,
    name: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });
  return { ok: true as const, name: file.name, mimeType: file.type, storagePath };
}

async function discardStoredFile(storagePath: string | null | undefined) {
  if (!storagePath) return;
  await anomalyStorage().remove(storagePath);
}

export async function updateAnomaly(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canWriteCollection(user.role, "anomalies")) return { ok: false, error: "Vous ne pouvez pas modifier cette anomalie." };
    const assigneeRaw = formData.get("assigneeId");
    const parsed = anomalyUpdateSchema.safeParse({
      id: formData.get("id"),
      projectId: formData.get("projectId"),
      text: formData.get("text"),
      severity: formData.get("severity"),
      status: formData.get("status"),
      assigneeId: typeof assigneeRaw === "string" && assigneeRaw.length > 0 ? assigneeRaw : null,
      fileAction: formData.get("fileAction"),
    });
    if (!parsed.success) return { ok: false, error: "Vérifiez les champs de l'anomalie." };
    if (!ANOMALY_PROJECTS.has(parsed.data.projectId)) return { ok: false, error: "Projet non autorisé." };
    const current = await prisma.anomaly.findUnique({ where: { id: parsed.data.id }, include: { file: true } });
    if (!current) return { ok: false, error: "Anomalie introuvable." };
    const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
    if (!project?.anomaliesEnabled) return { ok: false, error: "Les anomalies ne sont pas activées sur ce projet." };
    if (parsed.data.assigneeId) {
      const member = await prisma.user.findUnique({ where: { id: parsed.data.assigneeId } });
      if (!member) return { ok: false, error: "Ce membre n'existe pas." };
    }
    const upload = formData.get("file");
    const changes = anomalyFieldChanges(current, parsed.data);
    const fileUntouched = parsed.data.fileAction === "keep" || (parsed.data.fileAction === "remove" && !current.file);
    if (changes.length === 0 && fileUntouched) return { ok: true };
    let replacement: { ok: true; name: string; mimeType: string; storagePath: string } | null = null;
    if (parsed.data.fileAction === "replace") {
      if (!(upload instanceof File) || upload.size === 0) return { ok: false, error: "Choisissez un fichier à ajouter." };
      const stored = await storeAnomalyUpload(parsed.data.id, upload);
      if (!stored.ok) return stored;
      replacement = stored;
    }
    const previousPath = current.file?.storagePath;
    try {
    await prisma.$transaction(async (tx) => {
      await tx.anomaly.update({
        where: { id: current.id },
        data: {
          projectId: parsed.data.projectId,
          text: parsed.data.text,
          severity: parsed.data.severity,
          status: parsed.data.status,
          assigneeId: parsed.data.assigneeId,
        },
      });
      if (parsed.data.fileAction === "remove" && current.file) {
        await tx.anomalyFile.delete({ where: { id: current.file.id } });
      }
      if (parsed.data.fileAction === "replace" && replacement?.ok) {
        if (current.file) await tx.anomalyFile.delete({ where: { id: current.file.id } });
        await tx.anomalyFile.create({
          data: {
            anomalyId: current.id,
            kind: "asset",
            name: replacement.name,
            mimeType: replacement.mimeType,
            storagePath: replacement.storagePath,
            unavailable: false,
          },
        });
      }
      for (const change of changes) {
        await logActivity(tx, { actorId: user.id, entity: "anomaly", entityId: current.id, field: change.field, before: change.before, after: change.after });
      }
      if (parsed.data.fileAction === "remove" && current.file) {
        await logActivity(tx, { actorId: user.id, entity: "anomaly", entityId: current.id, field: "file", before: current.file.name, after: null });
      }
      if (parsed.data.fileAction === "replace" && replacement?.ok) {
        await logActivity(tx, { actorId: user.id, entity: "anomaly", entityId: current.id, field: "file", before: current.file?.name ?? null, after: replacement.name });
      }
    });
    } catch (error) {
      if (replacement) await discardStoredFile(replacement.storagePath);
      throw error;
    }
    if ((parsed.data.fileAction === "remove" || parsed.data.fileAction === "replace") && previousPath) await discardStoredFile(previousPath);
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function addAnomalyComment(id: string, body: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const text = anomalyCommentSchema.safeParse(body);
    if (!text.success) return { ok: false, error: "Le commentaire doit contenir entre 1 et 1 000 caractères." };
    const current = await prisma.anomaly.findUnique({ where: { id } });
    if (!current) return { ok: false, error: "Anomalie introuvable." };
    await prisma.anomalyComment.create({ data: { anomalyId: id, authorId: user.id, body: text.data } });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "anomaly", entityId: id, field: "comment", after: text.data } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setProjectPhase(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = projectPhaseChangeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Phase invalide." };
    const current = await prisma.project.findUnique({ where: { id: parsed.data.id }, select: { phase: true } });
    if (!current) return { ok: false, error: "Projet introuvable." };
    if (current.phase === parsed.data.phase) return { ok: true };
    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id: parsed.data.id }, data: { phase: parsed.data.phase } });
      await logActivity(tx, {
        actorId: user.id,
        entity: "project",
        entityId: parsed.data.id,
        field: "phase",
        before: String(current.phase),
        after: String(parsed.data.phase),
      });
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveNotes(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const data = notesWriteSchema.parse(input);
    await prisma.projectNote.upsert({
      where: { projectId: data.projectId },
      update: { hot: data.hot, sofar: data.sofar, keep: data.keep },
      create: { projectId: data.projectId, hot: data.hot, sofar: data.sofar, keep: data.keep },
    });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "notes", entityId: data.projectId, field: "notes" } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveMgmt(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const data = mgmtWriteSchema.parse(input);
    const id = randomUUID();
    await prisma.mgmtItem.create({ data: { id, ...data, byId: user.id, createdAt: new Date() } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setMgmtStatus(id: string, status: "todo" | "doing" | "done"): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    await prisma.mgmtItem.update({ where: { id }, data: { status } });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "mgmt", entityId: id, field: "status", after: status } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveMeeting(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const data = meetingWriteSchema.parse(input);
    const id = data.id ?? randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.meeting.upsert({
        where: { id },
        update: { title: data.title, date: data.date, start: data.start, participants: data.participants, cr: data.cr },
        create: {
          id,
          title: data.title,
          date: data.date,
          start: data.start,
          participants: data.participants,
          cr: data.cr,
          source: "Saisi dans le Journal",
          createdAt: new Date(),
        },
      });
      await tx.meetingProject.deleteMany({ where: { meetingId: id } });
      if (data.projectIds.length) {
        await tx.meetingProject.createMany({ data: data.projectIds.map((projectId) => ({ meetingId: id, projectId })) });
      }
      await logActivity(tx, { actorId: user.id, entity: "meeting", entityId: id, field: "title", after: data.title });
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function followUpToTask(meetingId: string, text: string, projectId: string, phase: number): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const title = text.replace(/\*\*/g, "").trim().slice(0, 200);
    if (!title) return { ok: false, error: "Action vide." };
    const id = randomUUID();
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.task.create({
        data: {
          id,
          title,
          projectId,
          phase,
          assigneeId: user.id,
          status: "todo",
          date: todayISO(now),
          createdAt: now,
          createdById: user.id,
          updatedById: user.id,
          history: { create: { at: now, status: "todo", byId: user.id } },
        },
      });
      await tx.meetingAction.create({ data: { meetingId, text: title, taskId: id } });
    });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function generateSummary(day: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const existing = await prisma.summary.findUnique({ where: { id: day } });
    if (existing?.imported) return { ok: false, error: "Ce récap importé est conservé tel quel." };
    const [tasks, infos, okrs, projects] = await Promise.all([
      prisma.task.findMany({ where: { deletedAt: null }, include: { project: true, history: true } }),
      prisma.info.findMany({ where: { deletedAt: null, date: day }, include: { project: true } }),
      prisma.okr.findMany({ where: { deletedAt: null }, include: { keyResults: true, project: true } }),
      prisma.project.findMany(),
    ]);
    const phaseOf = new Map(projects.map((project) => [project.id, project.phase]));
    const facts: SummaryFacts = {
      day,
      done: tasks.filter((task) => task.history.some((entry) => entry.status === "done" && todayISO(entry.at) === day) || (task.date === day && task.status === "done")).map((task) => task.title),
      started: tasks.filter((task) => task.date === day && task.status === "doing").map((task) => task.title),
      blocked: tasks.filter((task) => task.status === "blocked").map((task) => ({ title: task.title, project: task.project.name, reason: task.blocker })),
      infos: infos.map((info) => ({ project: info.project?.name ?? "Projet", text: info.text, source: info.source, channel: info.channel })),
      okrs: okrs
        .filter((okr) => okr.phase === phaseOf.get(okr.projectId))
        .map((okr) => ({
          project: okr.project.name,
          phase: okr.phase,
          title: okr.title,
          okr: { due: okr.due, keyResults: okr.keyResults.map((kr) => ({ target: kr.target, current: kr.current, unit: kr.unit })) },
        })),
      upcoming: tasks.filter((task) => task.due && task.due >= day && task.status !== "done").map((task) => `${task.due} — ${task.title}`),
    };
    const text = buildSummary(facts);
    await prisma.summary.upsert({
      where: { id: day },
      update: { text, generatedAt: new Date(), imported: false, date: day },
      create: { id: day, date: day, text, generatedAt: new Date(), imported: false },
    });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "summary", entityId: day, field: "generate" } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

async function memberGuard(actorId: string, memberId: string, nextActive: boolean, nextRole: "ADMIN" | "VENTURE_ARCHITECT") {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isTest: false }, select: { id: true, active: true } });
  return memberRoleChangeError({ actorId, memberId, nextActive, nextRole, admins });
}

export async function inviteMember(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = memberWriteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Vérifiez le nom, l'e-mail et le poste." };
    const data = parsed.data;
    const email = data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { ok: false, error: "Cet e-mail est déjà utilisé." };
    const last = await prisma.user.aggregate({ _max: { sortOrder: true } });
    const id = `u_${randomUUID()}`;
    await prisma.user.create({
      data: {
        id,
        name: data.name,
        email,
        title: data.title,
        role: data.role,
        active: true,
        isTest: false,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
      },
    });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "user", entityId: id, field: "invite", after: data.name } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function updateMember(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = memberUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Vérifiez le nom, l'e-mail et le poste." };
    const data = parsed.data;
    const current = await prisma.user.findUnique({ where: { id: data.id } });
    if (!current || current.isTest) return { ok: false, error: "Membre introuvable." };
    const email = data.email.toLowerCase();
    const duplicate = await prisma.user.findFirst({ where: { email, NOT: { id: data.id } } });
    if (duplicate) return { ok: false, error: "Cet e-mail est déjà utilisé." };
    const blocked = await memberGuard(user.id, data.id, data.active, data.role);
    if (blocked) return { ok: false, error: blocked };
    await prisma.user.update({
      where: { id: data.id },
      data: { name: data.name, email, title: data.title, role: data.role, active: data.active },
    });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "user", entityId: data.id, field: "profile", before: current.name, after: data.name } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setMemberActive(id: string, active: boolean): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const current = await prisma.user.findUnique({ where: { id } });
    if (!current || current.isTest) return { ok: false, error: "Membre introuvable." };
    const blocked = await memberGuard(user.id, id, active, current.role);
    if (blocked) return { ok: false, error: blocked };
    await prisma.user.update({ where: { id }, data: { active } });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "user", entityId: id, field: "active", before: String(current.active), after: String(active) } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function removeMember(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    if (user.id === id) return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
    const current = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            ledProjects: true,
            participations: true,
            assignedTasks: true,
            createdTasks: true,
            updatedTasks: true,
            historyEntries: true,
            infos: true,
            courses: true,
            anomalies: true,
            assignedAnomalies: true,
            anomalyComments: true,
            mgmtItems: true,
            activity: true,
          },
        },
      },
    });
    if (!current || current.isTest) return { ok: false, error: "Membre introuvable." };
    const linked = Object.values(current._count).some((count) => count > 0);
    if (linked) return { ok: false, error: "Ce membre est lié à des données du studio. Désactivez-le plutôt." };
    const blocked = await memberGuard(user.id, id, false, current.role);
    if (blocked) return { ok: false, error: blocked };
    await prisma.user.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
