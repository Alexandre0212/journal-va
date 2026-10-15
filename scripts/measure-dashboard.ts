import { PrismaClient } from "@prisma/client";

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dakar", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function main() {
  const prisma = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
  let queries = 0;
  prisma.$on("query", () => {
    queries += 1;
  });
  try {
    await Promise.all([
      prisma.project.findMany({
        orderBy: { order: "asc" },
        relationLoadStrategy: "join",
        include: {
          note: true,
          okrs: { where: { deletedAt: null }, include: { keyResults: true } },
          tasks: { where: { deletedAt: null }, include: { assignee: true, history: { select: { at: true, status: true } } } },
          kpis: { where: { deletedAt: null }, include: { values: true } },
        },
      }),
      prisma.info.findMany({ where: { deletedAt: null, date: today }, include: { project: true } }),
      prisma.meeting.findMany({ where: { date: today } }),
      prisma.summary.findUnique({ where: { id: today } }),
      prisma.mgmtItem.count({ where: { date: today } }),
    ]);
    console.log(JSON.stringify({ today, queries }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
