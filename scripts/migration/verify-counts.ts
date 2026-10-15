import { PrismaClient } from "@prisma/client";

const expected = "GitHub haskeventures branché au récap du soir (SAFYA, TRIAGE+)";

async function main() {
  const prisma = new PrismaClient();
  try {
    const [users, projects, tasks, okrs, kpis, infos, courses, anomalies, notes, mgmt, meetings, summaries] =
      await Promise.all([
        prisma.user.count(),
        prisma.project.count(),
        prisma.task.count(),
        prisma.okr.count(),
        prisma.kpi.count(),
        prisma.info.count(),
        prisma.course.count(),
        prisma.anomaly.count(),
        prisma.projectNote.count(),
        prisma.mgmtItem.count(),
        prisma.meeting.count(),
        prisma.summary.count(),
      ]);
    const row = await prisma.mgmtItem.findUnique({ where: { id: "m-1013-06" }, select: { text: true } });
    const flags = await prisma.project.findMany({
      select: { id: true, coursesEnabled: true, anomaliesEnabled: true, leadId: true },
      orderBy: { order: "asc" },
    });
    const statuses = await prisma.task.groupBy({ by: ["status"], _count: true });
    const file = await prisma.anomalyFile.findFirst({ select: { unavailable: true, storagePath: true, name: true } });
    console.log(
      JSON.stringify(
        {
          users,
          projects,
          tasks,
          okrs,
          kpis,
          infos,
          courses,
          anomalies,
          notes,
          mgmt,
          meetings,
          summaries,
          mgmtMatch: row?.text === expected,
          flags,
          statuses,
          file,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
