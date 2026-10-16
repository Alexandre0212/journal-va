import { KpiBoard } from "@/features/kpi-board";
import { todayISO } from "@/lib/dates";
import { loadKpis } from "@/server/queries";

const ALLOWED = new Set(["safya", "triage", "rpm"]);

export default async function KpiPage() {
  const { kpis, courses, projects, openAnomalies } = await loadKpis();
  const today = todayISO();
  const allowed = projects.filter((project) => ALLOWED.has(project.id));
  return (
    <div className="page">
      <KpiBoard
        today={today}
        openAnomalies={openAnomalies}
        coursesEnabled={allowed.some((project) => project.coursesEnabled)}
        projects={allowed.map((project) => ({ id: project.id, name: project.name }))}
        kpis={kpis.filter((kpi) => ALLOWED.has(kpi.projectId)).map((kpi) => ({
          id: kpi.id,
          projectId: kpi.projectId,
          projectName: kpi.project.name,
          label: kpi.label,
          unit: kpi.unit,
          target: kpi.target,
          todayValue: kpi.values.find((value) => value.date === today)?.value ?? null,
          values: Object.fromEntries(kpi.values.map((value) => [value.date, value.value])),
        }))}
        courses={courses.filter((course) => course.projectId === "rpm").map((course) => ({
          id: course.id,
          date: course.date,
          fromPlace: course.fromPlace,
          toPlace: course.toPlace,
          app: course.app,
          yango: course.yango,
          liv: course.liv,
        }))}
      />
    </div>
  );
}
