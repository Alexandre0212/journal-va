import "server-only";

import { courseTrashTitle, isRestorable, retentionDeadline, type TrashKind, type TrashRow } from "@/domain/trash";
import { dayOfInstant } from "@/lib/dates";
import { prisma } from "@/server/db";
import { dropExpiredTrash } from "@/server/trash";

export async function loadDashboard(today: string) {
  const [projects, infos, meetings, summary, mgmtToday] = await Promise.all([
    prisma.project.findMany({
      orderBy: { order: "asc" },
      relationLoadStrategy: "join",
      include: {
        note: true,
        okrs: { where: { deletedAt: null }, include: { keyResults: true } },
        tasks: {
          where: { deletedAt: null },
          include: { assignee: true, history: { select: { at: true, status: true } } },
        },
        kpis: { where: { deletedAt: null }, include: { values: true } },
      },
    }),
    prisma.info.findMany({
      where: { deletedAt: null, date: today },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.meeting.findMany({ where: { date: today }, orderBy: { start: "asc" } }),
    prisma.summary.findUnique({ where: { id: today } }),
    prisma.mgmtItem.count({ where: { date: today } }),
  ]);
  return { projects, infos, meetings, summary, mgmtToday };
}

export async function loadProjects() {
  return prisma.project.findMany({
    orderBy: { order: "asc" },
    include: {
      note: true,
      lead: true,
      okrs: { where: { deletedAt: null }, include: { keyResults: true } },
      tasks: { where: { deletedAt: null }, select: { id: true, status: true, phase: true, due: true, title: true } },
    },
  });
}

export async function loadProject(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      note: true,
      lead: true,
      participants: { include: { user: true } },
      okrs: { where: { deletedAt: null }, include: { keyResults: true } },
      tasks: {
        where: { deletedAt: null },
        include: { assignee: true, okr: true, history: true },
        orderBy: { createdAt: "asc" },
      },
      kpis: { where: { deletedAt: null }, include: { values: true }, orderBy: { createdAt: "asc" } },
      courses: { where: { deletedAt: null }, orderBy: { date: "desc" } },
      anomalies: { include: { file: true, by: true }, orderBy: { createdAt: "desc" } },
      infos: { where: { deletedAt: null }, include: { by: true }, orderBy: { createdAt: "desc" } },
      meetings: { include: { meeting: true } },
    },
  });
}

export async function loadTasks() {
  const [tasks, projects, okrs, users] = await Promise.all([
    prisma.task.findMany({
      where: { deletedAt: null },
      include: { assignee: true, okr: true, project: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.project.findMany({ orderBy: { order: "asc" } }),
    prisma.okr.findMany({ where: { deletedAt: null }, select: { id: true, title: true, projectId: true, phase: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  return { tasks, projects, okrs, users };
}

export async function loadOkrs() {
  const [okrs, projects] = await Promise.all([
    prisma.okr.findMany({
      where: { deletedAt: null },
      include: {
        keyResults: true,
        project: true,
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            due: true,
            date: true,
            createdAt: true,
            assignee: { select: { name: true } },
            history: { select: { at: true, status: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: [{ projectId: "asc" }, { title: "asc" }],
    }),
    prisma.project.findMany({ orderBy: { order: "asc" } }),
  ]);
  const logs = await prisma.activityLog.findMany({
    where: { entity: "okr", entityId: { in: okrs.map((okr) => okr.id) } },
    include: { actor: { select: { name: true } } },
    orderBy: { at: "desc" },
    take: 400,
  });
  return { okrs, projects, logs };
}

export async function loadKpis() {
  const [kpis, courses, projects, openAnomalies] = await Promise.all([
    prisma.kpi.findMany({ where: { deletedAt: null }, include: { values: true, project: true }, orderBy: { createdAt: "asc" } }),
    prisma.course.findMany({ where: { deletedAt: null }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    prisma.project.findMany({ orderBy: { order: "asc" } }),
    prisma.anomaly.count({ where: { status: "open", projectId: { in: ["safya", "triage", "rpm"] } } }),
  ]);
  return { kpis, courses, projects, openAnomalies };
}

export async function loadJournal(day: string) {
  const [tasks, infos, projects, okrs, meetings, summary] = await Promise.all([
    prisma.task.findMany({
      where: { deletedAt: null },
      include: { assignee: true, project: true, okr: true, history: true },
    }),
    prisma.info.findMany({ where: { deletedAt: null, date: day }, include: { project: true, by: true } }),
    prisma.project.findMany({ orderBy: { order: "asc" }, include: { note: true } }),
    prisma.okr.findMany({ where: { deletedAt: null }, include: { keyResults: true } }),
    prisma.meeting.findMany({ where: { date: day }, orderBy: { start: "asc" } }),
    prisma.summary.findUnique({ where: { id: day } }),
  ]);
  return { tasks, infos, projects, okrs, meetings, summary };
}

export async function loadMeetings() {
  const [meetings, projects, users] = await Promise.all([
    prisma.meeting.findMany({ include: { projects: true, actions: true }, orderBy: { date: "desc" } }),
    prisma.project.findMany({ orderBy: { order: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  const taskIds = [...new Set(meetings.flatMap((meeting) => meeting.actions.map((action) => action.taskId).filter((id): id is string => Boolean(id))))];
  const tasks = taskIds.length
    ? await prisma.task.findMany({ where: { id: { in: taskIds } }, include: { assignee: true, project: true } })
    : [];
  return { meetings, projects, users, tasks };
}

export async function loadAnomalies() {
  const [anomalies, projects, users] = await Promise.all([
    prisma.anomaly.findMany({
      include: {
        file: true,
        by: true,
        assignee: true,
        project: true,
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({ orderBy: { order: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  const ids = anomalies.map((item) => item.id);
  const logs = ids.length
    ? await prisma.activityLog.findMany({
      where: { entity: "anomaly", entityId: { in: ids }, before: { not: null } },
      orderBy: { at: "desc" },
      select: { entityId: true, at: true },
    })
    : [];
  const revisedAt = new Map<string, Date>();
  for (const log of logs) if (!revisedAt.has(log.entityId)) revisedAt.set(log.entityId, log.at);
  return { anomalies, projects, users, revisedAt };
}

export async function loadSummaries() {
  return prisma.summary.findMany({ orderBy: { date: "desc" } });
}

export async function loadSummary(id: string) {
  return prisma.summary.findUnique({ where: { id } });
}

export async function loadTeam() {
  return prisma.user.findMany({ where: { isTest: false }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

export async function loadMgmt() {
  return prisma.mgmtItem.findMany({ include: { by: true }, orderBy: { createdAt: "desc" } });
}

export async function loadTrash(): Promise<TrashRow[]> {
  const now = new Date();
  const [tasks, okrs, kpis, infos, courses] = await Promise.all([
    prisma.task.findMany({ where: { deletedAt: { not: null } }, include: { project: true } }),
    prisma.okr.findMany({ where: { deletedAt: { not: null } }, include: { project: true } }),
    prisma.kpi.findMany({ where: { deletedAt: { not: null } }, include: { project: true } }),
    prisma.info.findMany({ where: { deletedAt: { not: null } }, include: { project: true } }),
    prisma.course.findMany({ where: { deletedAt: { not: null } }, include: { project: true } }),
  ]);
  const expired: Record<TrashKind, string[]> = { task: [], okr: [], kpi: [], info: [], course: [] };
  const kept: Array<Omit<TrashRow, "author">> = [];
  const push = (entity: TrashKind, id: string, deletedAt: Date, title: string, project: string | null) => {
    if (!isRestorable(deletedAt, now)) {
      expired[entity].push(id);
      return;
    }
    const deletedDay = dayOfInstant(deletedAt.toISOString());
    const deadlineDay = dayOfInstant(retentionDeadline(deletedAt).toISOString());
    if (!deletedDay || !deadlineDay) return;
    kept.push({ entity, id, title, project, deletedAt: deletedAt.toISOString(), deletedDay, deadlineDay });
  };
  for (const item of tasks) if (item.deletedAt) push("task", item.id, item.deletedAt, item.title, item.project.name);
  for (const item of okrs) if (item.deletedAt) push("okr", item.id, item.deletedAt, item.title, item.project.name);
  for (const item of kpis) if (item.deletedAt) push("kpi", item.id, item.deletedAt, item.label, item.project.name);
  for (const item of infos) if (item.deletedAt) push("info", item.id, item.deletedAt, item.text, item.project?.name ?? null);
  for (const item of courses) if (item.deletedAt) push("course", item.id, item.deletedAt, courseTrashTitle(item), item.project.name);
  await dropExpiredTrash(expired);
  const ids = kept.map((item) => item.id);
  const logs = ids.length
    ? await prisma.activityLog.findMany({
      where: { field: "deletedAt", after: { not: null }, entityId: { in: ids } },
      include: { actor: { select: { name: true } } },
      orderBy: { at: "desc" },
    })
    : [];
  const authors = new Map<string, string>();
  for (const log of logs) {
    const key = `${log.entity}:${log.entityId}`;
    if (!authors.has(key) && log.actor?.name) authors.set(key, log.actor.name);
  }
  return kept
    .map((item) => ({ ...item, author: authors.get(`${item.entity}:${item.id}`) ?? null }))
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function loadUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
