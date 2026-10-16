import { OkrBoard } from "@/features/okr-board";
import { inLast7 } from "@/domain/tasks";
import { todayISO } from "@/lib/dates";
import { loadOkrs } from "@/server/queries";

const ALLOWED = new Set(["safya", "triage", "rpm"]);

export default async function OkrPage() {
  const { okrs, projects, logs } = await loadOkrs();
  const today = todayISO();
  const cards = okrs.filter((okr) => ALLOWED.has(okr.projectId)).map((okr) => ({
    id: okr.id,
    title: okr.title,
    projectId: okr.projectId,
    projectName: okr.project.name,
    phase: okr.phase,
    due: okr.due,
    recent: okr.tasks.filter((task) => inLast7({ date: task.date, createdAt: task.createdAt.toISOString(), history: task.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status })) }, today)).length,
    keyResults: okr.keyResults.map((kr) => ({ id: kr.id, label: kr.label, current: kr.current, target: kr.target, unit: kr.unit })),
    tasks: okr.tasks.map((task) => ({ id: task.id, title: task.title, status: task.status, due: task.due, assignee: task.assignee?.name ?? null })),
    history: logs.filter((log) => log.entityId === okr.id).map((log) => ({
      id: log.id,
      at: log.at.toISOString(),
      actor: log.actor?.name ?? null,
      field: log.field,
      before: log.before,
      after: log.after,
    })),
  }));
  return (
    <div className="page">
      <OkrBoard
        okrs={cards}
        today={today}
        projects={projects.filter((project) => ALLOWED.has(project.id)).map((project) => ({ id: project.id, name: project.name }))}
      />
    </div>
  );
}
