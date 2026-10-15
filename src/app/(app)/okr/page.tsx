import { formatPercent, okrRatio, paceText } from "@/domain/okr";
import { phaseByIndex } from "@/domain/phases";
import { inLast7 } from "@/domain/tasks";
import { DeleteButton, KrField, OkrEditor } from "@/features/forms";
import { todayISO } from "@/lib/dates";
import { loadOkrs } from "@/server/queries";

export default async function OkrPage() {
  const { okrs, projects } = await loadOkrs();
  const today = todayISO();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Objectifs et résultats clés</h1>
      <OkrEditor projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
      <div className="grid gap-4 lg:grid-cols-2">
        {okrs.map((okr) => {
          const recent = okr.tasks.filter((task) => inLast7({ date: task.date, createdAt: task.createdAt.toISOString(), history: task.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status })) }, today)).length;
          return (
            <article key={okr.id} className="surface p-5">
              <p className="text-caption text-muted">{okr.project.name} · {phaseByIndex(okr.phase).name}</p>
              <div className="mt-1 flex items-start justify-between gap-3">
                <h2 className="text-h3">{okr.title}</h2>
                <span className="num text-h3">{formatPercent(okrRatio({ keyResults: okr.keyResults }))}</span>
              </div>
              <p className="text-small text-muted">{recent} action{recent > 1 ? "s" : ""} sur 7 jours</p>
              <ul className="mt-3 flex flex-col gap-3">
                {okr.keyResults.map((kr) => (
                  <li key={kr.id} className="text-small">
                    <div className="flex items-center justify-between gap-2"><span>{kr.label}</span><span className="flex items-center gap-2"><KrField okrId={okr.id} krId={kr.id} current={kr.current} />/ {kr.target} {kr.unit}</span></div>
                    <p className={paceText(okr.due, kr)?.startsWith("Échéance") ? "text-crit" : "text-muted"}>{paceText(okr.due, kr)}</p>
                  </li>
                ))}
              </ul>
              <DeleteButton entity="okr" id={okr.id} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
