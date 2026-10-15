"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { buildSummary, type SummaryFacts } from "@/domain/summary";
import {
  anomalyWriteSchema,
  courseWriteSchema,
  infoWriteSchema,
  kpiValueSchema,
  kpiWriteSchema,
  meetingWriteSchema,
  mgmtWriteSchema,
  moveTaskSchema,
  notesWriteSchema,
  okrWriteSchema,
  projectWriteSchema,
  taskWriteSchema,
} from "@/domain/schemas";
import { canDeleteInfo, canToggleProjectModules } from "@/domain/permissions";
import { stamp } from "@/domain/tasks";
import { todayISO } from "@/lib/dates";
import { setDevActor } from "@/server/auth/session";
import { logActivity } from "@/server/activity";
import { requireAdmin, requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";

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
    await prisma.$transaction(async (tx) => {
      const data = { deletedAt: null };
      if (entity === "task") await tx.task.update({ where: { id }, data });
      else if (entity === "okr") await tx.okr.update({ where: { id }, data });
      else if (entity === "kpi") await tx.kpi.update({ where: { id }, data });
      else if (entity === "info") await tx.info.update({ where: { id }, data });
      else await tx.course.update({ where: { id }, data });
      await logActivity(tx, { actorId: user.id, entity, entityId: id, field: "deletedAt", after: null });
    });
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
      await tx.keyResult.deleteMany({ where: { okrId: id } });
      if (data.keyResults.length) {
        await tx.keyResult.createMany({
          data: data.keyResults.map((kr) => ({ ...kr, okrId: id })),
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

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf", "video/mp4"]);

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
      if (!ALLOWED_MIME.has(file.type)) return { ok: false, error: "Type de fichier non accepté." };
      if (file.size > 8_000_000) return { ok: false, error: "Fichier trop lourd (8 Mo maximum)." };
      const dir = path.join(process.cwd(), "storage", "anomalies");
      await mkdir(dir, { recursive: true });
      const storagePath = path.join(dir, `${id}-${file.name.replace(/[^\w.\-]+/g, "_")}`);
      await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));
      stored = { name: file.name, mimeType: file.type, storagePath };
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
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setAnomalyStatus(id: string, status: "open" | "resolved"): Promise<ActionResult> {
  try {
    const user = await requireUser();
    await prisma.anomaly.update({ where: { id }, data: { status } });
    await prisma.activityLog.create({ data: { actorId: user.id, entity: "anomaly", entityId: id, field: "status", after: status } });
    refresh();
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function saveProject(input: unknown): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const data = projectWriteSchema.parse(input);
    if (!canToggleProjectModules(user.role)) {
      const current = await prisma.project.findUnique({ where: { id: data.id } });
      if (!current) return { ok: false, error: "Projet introuvable." };
      if (current.coursesEnabled !== data.coursesEnabled || current.anomaliesEnabled !== data.anomaliesEnabled) {
        return { ok: false, error: "Seul un administrateur active ces modules." };
      }
    }
    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: data.id },
        data: {
          name: data.name,
          phase: data.phase,
          coursesEnabled: data.coursesEnabled,
          anomaliesEnabled: data.anomaliesEnabled,
          leadId: data.leadId,
        },
      });
      await tx.projectParticipant.deleteMany({ where: { projectId: data.id } });
      if (data.participantIds.length) {
        await tx.projectParticipant.createMany({
          data: data.participantIds.map((userId) => ({ projectId: data.id, userId })),
        });
      }
      await logActivity(tx, { actorId: user.id, entity: "project", entityId: data.id, field: "phase", after: String(data.phase) });
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

export async function goToProject(id: string) {
  await requireUser();
  redirect(`/projets/${id}`);
}
