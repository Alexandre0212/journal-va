import "server-only";

import { prisma } from "@/server/db";

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
      include: { keyResults: true, project: true, tasks: { where: { deletedAt: null }, select: { id: true, date: true, createdAt: true, history: { select: { at: true, status: true } } } } },
      orderBy: [{ projectId: "asc" }, { title: "asc" }],
    }),
    prisma.project.findMany({ orderBy: { order: "asc" } }),
  ]);
  return { okrs, projects };
}

export async function loadKpis() {
  const [kpis, courses, projects] = await Promise.all([
    prisma.kpi.findMany({ where: { deletedAt: null }, include: { values: true, project: true }, orderBy: { createdAt: "asc" } }),
    prisma.course.findMany({ where: { deletedAt: null }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
    prisma.project.findMany({ orderBy: { order: "asc" } }),
  ]);
  return { kpis, courses, projects };
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
  return { meetings, projects, users };
}

export async function loadAnomalies() {
  const [anomalies, projects] = await Promise.all([
    prisma.anomaly.findMany({ include: { file: true, by: true, project: true }, orderBy: { createdAt: "desc" } }),
    prisma.project.findMany({ orderBy: { order: "asc" } }),
  ]);
  return { anomalies, projects };
}

export async function loadSummaries() {
  return prisma.summary.findMany({ orderBy: { date: "desc" } });
}

export async function loadSummary(id: string) {
  return prisma.summary.findUnique({ where: { id } });
}

export async function loadTeam() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}

export async function loadMgmt() {
  return prisma.mgmtItem.findMany({ include: { by: true }, orderBy: { createdAt: "desc" } });
}

export async function loadTrash() {
  const [tasks, okrs, kpis, infos, courses] = await Promise.all([
    prisma.task.findMany({ where: { deletedAt: { not: null } }, include: { project: true }, orderBy: { deletedAt: "desc" } }),
    prisma.okr.findMany({ where: { deletedAt: { not: null } }, include: { project: true }, orderBy: { deletedAt: "desc" } }),
    prisma.kpi.findMany({ where: { deletedAt: { not: null } }, include: { project: true }, orderBy: { deletedAt: "desc" } }),
    prisma.info.findMany({ where: { deletedAt: { not: null } }, include: { project: true }, orderBy: { deletedAt: "desc" } }),
    prisma.course.findMany({ where: { deletedAt: { not: null } }, include: { project: true }, orderBy: { deletedAt: "desc" } }),
  ]);
  return { tasks, okrs, kpis, infos, courses };
}

export async function loadUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}

export async function countUsers() {
  return prisma.user.count();
}
