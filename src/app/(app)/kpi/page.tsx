import { coursesSummary, formatFcfa, formatGap } from "@/domain/courses";
import { averageLast7, sparkPoints, targetReached } from "@/domain/kpi";
import { CourseForm, DeleteButton, KpiCreate, KpiToday } from "@/features/forms";
import { Spark } from "@/features/spark";
import { todayISO } from "@/lib/dates";
import { loadKpis } from "@/server/queries";

export default async function KpiPage() {
  const { kpis, courses, projects } = await loadKpis();
  const today = todayISO();
  const rac = projects.find((project) => project.id === "rpm");
  const summary = coursesSummary(courses.map((course) => ({ app: course.app, yango: course.yango, liv: course.liv })));
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">KPI</h1>
      <KpiCreate projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
      <div className="flex flex-col gap-4">
        {kpis.map((kpi) => {
          const values = Object.fromEntries(kpi.values.map((value) => [value.date, value.value]));
          const avg = averageLast7(values, today);
          const reached = targetReached(avg, kpi.target);
          return (
            <article key={kpi.id} className="surface grid gap-3 p-5 md:grid-cols-[1.2fr_auto_1fr]">
              <div>
                <p className="text-caption text-muted">{kpi.project.name}</p>
                <h2 className="text-h3">{kpi.label}</h2>
                <p className="text-small text-muted">{kpi.target == null ? "Sans objectif chiffré" : `Objectif : ${kpi.target} ${kpi.unit}`}</p>
              </div>
              <KpiToday kpiId={kpi.id} date={today} value={values[today] ?? null} />
              <div>
                <p className="text-small">Moy. 7 j {avg == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(avg)} {reached == null ? null : reached ? "atteint" : "en dessous"}</p>
                <Spark points={sparkPoints(values, today)} target={kpi.target} />
                <DeleteButton entity="kpi" id={kpi.id} />
              </div>
            </article>
          );
        })}
        {!kpis.length ? <p className="text-muted">Aucun indicateur.</p> : null}
      </div>
      {rac?.coursesEnabled ? (
        <section className="surface p-5">
          <h2 className="text-h2">Courses RacTac</h2>
          <p className="text-small text-muted">Prix moyen RacTac {formatFcfa(summary.avgApp)} · Yango {formatFcfa(summary.avgYango)} · livreur {formatFcfa(summary.avgLiv)} · écart {formatGap(summary.gap)}</p>
          <div className="mt-4"><CourseForm projectId="rpm" /></div>
          <ul className="mt-4 flex flex-col gap-2">
            {courses.map((course) => <li key={course.id} className="flex items-center justify-between text-small"><span>{course.date} · {[course.fromPlace, course.toPlace].filter(Boolean).join(" → ")} · {formatFcfa(course.app)}</span><DeleteButton entity="course" id={course.id} label="×" /></li>)}
          </ul>
        </section>
      ) : <p className="text-muted">Les courses ne sont activées sur aucun projet affiché ici.</p>}
    </div>
  );
}
