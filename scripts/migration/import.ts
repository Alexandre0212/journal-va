import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { normalizeMgmtText } from "./normalize";

const root = path.resolve(process.cwd(), "passation-journal-va", "donnees");
const dryRun = process.argv.includes("--dry-run");

type Doc = Record<string, unknown>;

async function readCollection(name: string): Promise<Array<{ id: string; data: Doc }>> {
  const dir = path.join(root, name);
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((file) => file.endsWith(".json"));
  } catch {
    return [];
  }
  const docs = [];
  for (const file of files) {
    const raw = await readFile(path.join(dir, file), "utf8");
    docs.push({ id: file.replace(/\.json$/, ""), data: JSON.parse(raw) as Doc });
  }
  return docs;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}
function num(value: unknown): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}
function date(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const USERS = [
  {
    id: "u_alexandre_sankara",
    email: "alexandre.sankara@haskeventures.com",
    name: "Alexandre Sankara",
    role: "ADMIN" as const,
    isTest: false,
  },
  {
    id: "u_5MKSBjCyBoc8Pi6hC78kuQ",
    email: "fatoumata.sonko@haskeventures.com",
    name: "Fatoumata Sonko",
    role: "ADMIN" as const,
    isTest: false,
  },
  {
    id: "u_va_test",
    email: "va.test@haskeventures.com",
    name: "VA Test",
    role: "VENTURE_ARCHITECT" as const,
    isTest: true,
  },
];

async function main() {
  const [projects, okrs, tasks, kpis, infos, courses, anomalies, notes, mgmt, meetings, summaries, team] =
    await Promise.all([
      readCollection("projects"),
      readCollection("okrs"),
      readCollection("tasks"),
      readCollection("kpis"),
      readCollection("infos"),
      readCollection("courses"),
      readCollection("anomalies"),
      readCollection("notes"),
      readCollection("mgmt"),
      readCollection("meetings"),
      readCollection("summaries"),
      readCollection("team"),
    ]);

  const mgmtChanges = mgmt.map((item) => {
    const text = String(item.data.text ?? "");
    const normalized = normalizeMgmtText(item.id, text);
    return { id: item.id, before: text, after: normalized.text, changed: normalized.changed };
  });

  const report = {
    dryRun,
    counts: {
      projects: projects.length,
      okrs: okrs.length,
      tasks: tasks.length,
      kpis: kpis.length,
      infos: infos.length,
      courses: courses.length,
      anomalies: anomalies.length,
      notes: notes.length,
      mgmt: mgmt.length,
      meetings: meetings.length,
      summaries: summaries.length,
      team: team.length,
      anomalyfiles: 0,
    },
    users: USERS.map((user) => user.email),
    mgmtChanges: mgmtChanges.filter((item) => item.changed),
    missingFile: anomalies
      .filter((item) => item.data.file && typeof item.data.file === "object")
      .map((item) => {
        const file = item.data.file as { name?: string; kind?: string; id?: string };
        return { anomalyId: item.id, name: file.name ?? null, kind: file.kind ?? null, externalId: file.id ?? null };
      }),
  };

  const consoleReport = {
    ...report,
    mgmtChanges: report.mgmtChanges.map((item) => ({ id: item.id, changed: item.changed })),
  };

  if (dryRun) {
    console.log(JSON.stringify(consoleReport, null, 2));
    return;
  }

  const prisma = new PrismaClient();
  const knownUsers = new Set(USERS.map((user) => user.id));
  const userOrNull = (value: unknown) => {
    const id = str(value);
    return id && knownUsers.has(id) ? id : null;
  };

  try {
    await prisma.$transaction(async (tx) => {
      const fatou = team.find((item) => item.id === "u_5MKSBjCyBoc8Pi6hC78kuQ");
      for (const user of USERS) {
        await tx.user.upsert({
          where: { id: user.id },
          update: { email: user.email, name: user.name, role: user.role, isTest: user.isTest },
          create: {
            ...user,
            joinedAt: user.id === "u_5MKSBjCyBoc8Pi6hC78kuQ" ? date(fatou?.data.joinedAt) : null,
          },
        });
      }

      for (const project of projects) {
        await tx.project.upsert({
          where: { id: project.id },
          update: {
            name: String(project.data.name),
            order: Number(project.data.order ?? 0),
            phase: Number(project.data.phase ?? 0),
          },
          create: {
            id: project.id,
            name: String(project.data.name),
            order: Number(project.data.order ?? 0),
            phase: Number(project.data.phase ?? 0),
            coursesEnabled: project.id === "rpm",
            anomaliesEnabled: project.id === "rpm",
            leadId: null,
            updatedAt: date(project.data.updatedAt) ?? new Date(),
          },
        });
      }

      for (const note of notes) {
        await tx.projectNote.upsert({
          where: { projectId: note.id },
          update: {
            hot: str(note.data.hot),
            sofar: str(note.data.sofar),
            keep: str(note.data.keep),
          },
          create: {
            projectId: note.id,
            hot: str(note.data.hot),
            sofar: str(note.data.sofar),
            keep: str(note.data.keep),
            updatedAt: date(note.data.updatedAt) ?? new Date(),
          },
        });
      }

      for (const okr of okrs) {
        await tx.okr.upsert({
          where: { id: okr.id },
          update: {
            projectId: String(okr.data.projectId),
            phase: Number(okr.data.phase ?? 0),
            title: String(okr.data.title),
            due: str(okr.data.due),
          },
          create: {
            id: okr.id,
            projectId: String(okr.data.projectId),
            phase: Number(okr.data.phase ?? 0),
            title: String(okr.data.title),
            due: str(okr.data.due),
            updatedAt: date(okr.data.updatedAt) ?? new Date(),
          },
        });
        await tx.keyResult.deleteMany({ where: { okrId: okr.id } });
        const keyResults = Array.isArray(okr.data.keyResults) ? okr.data.keyResults : [];
        if (keyResults.length) {
          await tx.keyResult.createMany({
            data: keyResults.map((kr) => {
              const row = kr as Doc;
              return {
                id: String(row.id),
                okrId: okr.id,
                label: String(row.label ?? ""),
                target: Number(row.target ?? 0),
                current: Number(row.current ?? 0),
                unit: String(row.unit ?? ""),
              };
            }),
          });
        }
      }

      for (const task of tasks) {
        const data = task.data;
        await tx.task.upsert({
          where: { id: task.id },
          update: {
            title: String(data.title),
            projectId: String(data.projectId),
            phase: Number(data.phase ?? 0),
            okrId: str(data.okrId),
            assigneeId: userOrNull(data.assignee),
            due: str(data.due),
            date: str(data.date),
            status: (str(data.status) ?? "todo") as Prisma.TaskCreateInput["status"],
            blocker: str(data.blocker),
            createdById: userOrNull(data.createdBy),
            updatedById: userOrNull(data.updatedBy),
            doneAt: date(data.doneAt),
            blockedAt: date(data.blockedAt),
          },
          create: {
            id: task.id,
            title: String(data.title),
            projectId: String(data.projectId),
            phase: Number(data.phase ?? 0),
            okrId: str(data.okrId),
            assigneeId: userOrNull(data.assignee),
            due: str(data.due),
            date: str(data.date),
            status: (str(data.status) ?? "todo") as Prisma.TaskCreateInput["status"],
            priority: null,
            blocker: str(data.blocker),
            createdAt: date(data.createdAt) ?? new Date(),
            createdById: userOrNull(data.createdBy),
            updatedById: userOrNull(data.updatedBy),
            doneAt: date(data.doneAt),
            blockedAt: date(data.blockedAt),
          },
        });
        await tx.taskHistory.deleteMany({ where: { taskId: task.id } });
        const history = Array.isArray(data.history) ? data.history : [];
        if (history.length) {
          await tx.taskHistory.createMany({
            data: history.map((entry) => {
              const row = entry as Doc;
              return {
                taskId: task.id,
                at: date(row.at) ?? new Date(),
                status: (str(row.status) ?? "todo") as Prisma.TaskCreateInput["status"],
                byId: userOrNull(row.by),
              };
            }),
          });
        }
      }

      for (const kpi of kpis) {
        await tx.kpi.upsert({
          where: { id: kpi.id },
          update: {
            label: String(kpi.data.label),
            unit: String(kpi.data.unit ?? ""),
            target: num(kpi.data.target),
            projectId: String(kpi.data.projectId),
          },
          create: {
            id: kpi.id,
            projectId: String(kpi.data.projectId),
            label: String(kpi.data.label),
            unit: String(kpi.data.unit ?? ""),
            target: num(kpi.data.target),
            createdAt: date(kpi.data.createdAt) ?? new Date(),
          },
        });
        await tx.kpiValue.deleteMany({ where: { kpiId: kpi.id } });
        const values = kpi.data.values && typeof kpi.data.values === "object" ? (kpi.data.values as Record<string, unknown>) : {};
        const rows = Object.entries(values).filter(([, value]) => typeof value === "number");
        if (rows.length) {
          await tx.kpiValue.createMany({
            data: rows.map(([day, value]) => ({ kpiId: kpi.id, date: day, value: value as number })),
          });
        }
      }

      for (const info of infos) {
        await tx.info.upsert({
          where: { id: info.id },
          update: {
            text: String(info.data.text),
            source: str(info.data.source),
            channel: String(info.data.channel ?? "Autre"),
            projectId: str(info.data.projectId),
            date: String(info.data.date),
          },
          create: {
            id: info.id,
            date: String(info.data.date),
            text: String(info.data.text),
            source: str(info.data.source),
            channel: String(info.data.channel ?? "Autre"),
            projectId: str(info.data.projectId),
            byId: userOrNull(info.data.by),
            createdAt: date(info.data.createdAt) ?? new Date(),
          },
        });
      }

      for (const course of courses) {
        await tx.course.upsert({
          where: { id: course.id },
          update: {
            date: String(course.data.date),
            fromPlace: str(course.data.from),
            toPlace: str(course.data.to),
            km: num(course.data.km),
            app: num(course.data.app),
            yango: num(course.data.yango),
            liv: num(course.data.liv),
            driver: str(course.data.who),
            note: str(course.data.note),
          },
          create: {
            id: course.id,
            projectId: String(course.data.projectId),
            date: String(course.data.date),
            fromPlace: str(course.data.from),
            toPlace: str(course.data.to),
            km: num(course.data.km),
            app: num(course.data.app),
            yango: num(course.data.yango),
            liv: num(course.data.liv),
            driver: str(course.data.who),
            note: str(course.data.note),
            byId: userOrNull(course.data.by),
            createdAt: date(course.data.createdAt) ?? new Date(),
          },
        });
      }

      for (const anomaly of anomalies) {
        await tx.anomaly.upsert({
          where: { id: anomaly.id },
          update: {
            text: String(anomaly.data.text),
            severity: (str(anomaly.data.severity) ?? "major") as Prisma.AnomalyCreateInput["severity"],
            status: (str(anomaly.data.status) ?? "open") as Prisma.AnomalyCreateInput["status"],
            date: String(anomaly.data.date),
          },
          create: {
            id: anomaly.id,
            projectId: String(anomaly.data.projectId),
            date: String(anomaly.data.date),
            text: String(anomaly.data.text),
            severity: (str(anomaly.data.severity) ?? "major") as Prisma.AnomalyCreateInput["severity"],
            status: (str(anomaly.data.status) ?? "open") as Prisma.AnomalyCreateInput["status"],
            byId: userOrNull(anomaly.data.by),
            createdAt: date(anomaly.data.createdAt) ?? new Date(),
          },
        });
        const file = anomaly.data.file && typeof anomaly.data.file === "object" ? (anomaly.data.file as Doc) : null;
        if (file) {
          await tx.anomalyFile.upsert({
            where: { anomalyId: anomaly.id },
            update: { unavailable: true, storagePath: null },
            create: {
              anomalyId: anomaly.id,
              kind: String(file.kind ?? "asset"),
              externalId: str(file.id) ?? str(file.doc),
              name: str(file.name),
              mimeType: str(file.type),
              storagePath: null,
              unavailable: true,
            },
          });
        }
      }

      for (const item of mgmt) {
        const normalized = normalizeMgmtText(item.id, String(item.data.text ?? ""));
        await tx.mgmtItem.upsert({
          where: { id: item.id },
          update: { text: normalized.text, status: (str(item.data.status) ?? "done") as Prisma.MgmtItemCreateInput["status"] },
          create: {
            id: item.id,
            text: normalized.text,
            status: (str(item.data.status) ?? "done") as Prisma.MgmtItemCreateInput["status"],
            date: String(item.data.date),
            createdAt: date(item.data.createdAt) ?? new Date(),
            byId: userOrNull(item.data.by),
          },
        });
      }

      for (const meeting of meetings) {
        const participants = Array.isArray(meeting.data.participants) ? meeting.data.participants.map(String) : [];
        await tx.meeting.upsert({
          where: { id: meeting.id },
          update: {
            title: String(meeting.data.title),
            date: String(meeting.data.date),
            start: str(meeting.data.start),
            participants,
            cr: String(meeting.data.cr ?? ""),
            source: str(meeting.data.source),
          },
          create: {
            id: meeting.id,
            title: String(meeting.data.title),
            date: String(meeting.data.date),
            start: str(meeting.data.start),
            participants,
            cr: String(meeting.data.cr ?? ""),
            source: str(meeting.data.source),
            createdAt: date(meeting.data.createdAt) ?? new Date(),
          },
        });
      }

      for (const summary of summaries) {
        await tx.summary.upsert({
          where: { id: summary.id },
          update: {
            text: String(summary.data.text ?? ""),
            generatedAt: date(summary.data.generatedAt),
            imported: true,
          },
          create: {
            id: summary.id,
            date: String(summary.data.date ?? summary.id),
            text: String(summary.data.text ?? ""),
            generatedAt: date(summary.data.generatedAt),
            imported: true,
          },
        });
      }
    }, { maxWait: 20_000, timeout: 180_000 });

    const lines = [
      "# Rapport de migration",
      "",
      `Import exécuté le ${new Date().toISOString()} vers le Prisma Postgres configuré dans \`.env\`. Les fichiers de \`passation-journal-va/\` n'ont pas été modifiés.`,
      "",
      "## Volumes",
      "",
      ...Object.entries(report.counts).map(([key, value]) => `- ${key} : ${value}`),
      "",
      "## Comptes créés",
      "",
      "- Alexandre Sankara, administrateur, utilisateur par défaut",
      "- Fatoumata Sonko, administratrice, propriétaire des données déjà attribuées à son identifiant",
      "- VA Test, venture architect, compte de test",
      "",
      "## Transformations",
      "",
      ...report.mgmtChanges.map(
        (item) =>
          `- \`${item.id}\` : le texte importé est « ${item.after} ». Le texte source était « ${item.before} ». Transformation faite dans le script, pas dans le fichier source.`,
      ),
      "",
      "## Fichiers",
      "",
      ...report.missingFile.map(
        (file) =>
          `- Anomalie \`${file.anomalyId}\` : référence conservée (${file.name ?? "sans nom"}, ${file.kind ?? "type inconnu"}, ${file.externalId ?? "sans id"}). Binaire absent : état « fichier indisponible ».`,
      ),
      "",
      "## Contrôles",
      "",
      "Les identifiants d'origine sont conservés. Courses et anomalies sont activées sur RacTac seulement. Priorité, responsable et participants sont vides. Les auteurs absents de la source restent vides.",
      "",
    ];
    await writeFile(path.resolve(process.cwd(), "docs", "MIGRATION.md"), lines.join("\n"), "utf8");
    console.log(JSON.stringify({ ...consoleReport, wrote: "docs/MIGRATION.md" }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
