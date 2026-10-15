import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { MarkdownView } from "@/components/markdown-view";
import { coursesSummary, formatFcfa, formatGap } from "@/domain/courses";
import { averageLast7, sparkPoints, targetReached } from "@/domain/kpi";
import { formatPercent, okrRatio, paceText } from "@/domain/okr";
import { PROJECT_LOGOS, phaseByIndex } from "@/domain/phases";
import { isLate, onDay } from "@/domain/tasks";
import { AnomalyForm, CourseForm, DayActionsBound, DeleteButton, InfoForm, KpiToday, KrField, NotesEditor, ProjectEditor, ResolveButton } from "@/features/forms";
import { Spark } from "@/features/spark";
import { TaskBoard, type BoardTask } from "@/features/board";
import { formatDay, todayISO } from "@/lib/dates";
import { requireUser } from "@/server/auth/session";
import { loadProject, loadUsers } from "@/server/queries";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ phase?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();
  const project = await loadProject(id);
  if (!project) notFound();
  const users = await loadUsers();
  const phase = Number.isInteger(Number(query.phase)) ? Number(query.phase) : project.phase;
  const today = todayISO();
  const okrs = project.okrs.filter((okr) => okr.phase === phase);
  const tasks = project.tasks.filter((task) => task.phase === phase);
  const dayTasks = project.tasks.filter((task) => onDay({ date: task.date, createdAt: task.createdAt.toISOString(), history: task.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status })) }, today) && task.projectId === project.id);
  const board: BoardTask[] = tasks.map((task) => ({
    id: task.id, title: task.title, status: task.status, projectName: project.name, okrTitle: task.okr?.title ?? null,
    assignee: task.assignee?.name ?? null, due: task.due, blocker: task.blocker, late: isLate(task.due, task.status, today),
  }));
  const summary = coursesSummary(project.courses.map((course) => ({ app: course.app, yango: course.yango, liv: course.liv })));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-caption text-accent-text">Projet</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="logo-plate"><Logo src={PROJECT_LOGOS[project.id] ?? ""} alt="" height={40} /></span>
            <h1 className="text-h1">{project.name}</h1>
          </div>
          <p className="text-small text-muted">Phase actuelle : {phaseByIndex(project.phase).name}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === "ADMIN" ? <NotesEditor projectId={project.id} hot={project.note?.hot ?? null} sofar={project.note?.sofar ?? null} keep={project.note?.keep ?? null} /> : null}
          <ProjectEditor admin={user.role === "ADMIN"} users={users.map((person) => ({ id: person.id, name: person.name }))} project={{ id: project.id, name: project.name, phase: project.phase, coursesEnabled: project.coursesEnabled, anomaliesEnabled: project.anomaliesEnabled, leadId: project.leadId, participantIds: project.participants.map((item) => item.userId) }} />
        </div>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Phase affichée">
        {Array.from({ length: 7 }, (_, index) => (
          <Link key={index} href={`/projets/${project.id}?phase=${index}`} className={`btn ${index === phase ? "btn-primary" : ""}`}>{phaseByIndex(index).name}{index === project.phase ? " · actuelle" : ""}</Link>
        ))}
      </nav>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="text-h3">Actions du jour</h2>
          <p className="text-small text-muted">{formatDay(today, true)}</p>
          <div className="mt-4"><DayActionsBound projectId={project.id} phase={phase} date={today} okrs={okrs.map((okr) => ({ id: okr.id, name: okr.title }))} /></div>
          <ul className="mt-4 flex flex-col gap-2">
            {dayTasks.length ? dayTasks.map((task) => <li key={task.id} className="text-small">{task.title} · {task.status}</li>) : <li className="text-muted">Aucune action saisie aujourd'hui sur {project.name}.</li>}
          </ul>
        </div>
        <div className="surface p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="text-h3">Infos reçues</h2><InfoForm projectId={project.id} date={today} /></div>
          <ul className="mt-4 flex flex-col gap-2">
            {project.infos.filter((info) => info.date === today).map((info) => (
              <li key={info.id} className="rounded-[8px] border border-line p-3 text-small">
                <p>{info.text}</p>
                <p className="text-muted">{info.source ?? "Source non renseignée"} · {info.channel}</p>
                <DeleteButton entity="info" id={info.id} />
              </li>
            ))}
            {project.infos.every((info) => info.date !== today) ? <li className="text-muted">Aucune info reçue aujourd'hui sur {project.name}.</li> : null}
          </ul>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {okrs.length ? okrs.map((okr) => (
          <article key={okr.id} className="surface p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-h3">{okr.title}</h2>
              <span className="num text-h3">{formatPercent(okrRatio({ keyResults: okr.keyResults }))}</span>
            </div>
            {okr.due ? <p className="text-small text-muted">Échéance : {formatDay(okr.due, true)}</p> : null}
            <ul className="mt-3 flex flex-col gap-3">
              {okr.keyResults.map((kr) => (
                <li key={kr.id} className="text-small">
                  <div className="flex items-center justify-between gap-2"><span>{kr.label}</span><span className="flex items-center gap-2"><KrField okrId={okr.id} krId={kr.id} current={kr.current} />/ {kr.target} {kr.unit}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-sunken"><i className="block h-full bg-primary" style={{ width: `${Math.round(okrRatio({ keyResults: [kr] }) * 100)}%` }} /></div>
                  <p className="text-muted">{paceText(okr.due, kr) ?? ""}</p>
                </li>
              ))}
            </ul>
            <DeleteButton entity="okr" id={okr.id} />
          </article>
        )) : <p className="text-muted">Aucun OKR pour la phase {phaseByIndex(phase).name}.</p>}
      </section>
      <section className="surface p-5">
        <h2 className="text-h3">Indicateurs suivis</h2>
        <div className="mt-4 flex flex-col gap-4">
          {project.kpis.length ? project.kpis.map((kpi) => {
            const values = Object.fromEntries(kpi.values.map((value) => [value.date, value.value]));
            const avg = averageLast7(values, today);
            const reached = targetReached(avg, kpi.target);
            return (
              <article key={kpi.id} className="grid gap-3 border-b border-line pb-4 md:grid-cols-[1.4fr_auto_1fr]">
                <div><h3 className="text-h3">{kpi.label}</h3><p className="text-small text-muted">{kpi.target == null ? "Sans objectif chiffré" : `Objectif : ${kpi.target} ${kpi.unit} par jour`}</p></div>
                <label className="text-small text-muted">Aujourd'hui <KpiToday kpiId={kpi.id} date={today} value={values[today] ?? null} /></label>
                <div>
                  <p className="text-small">Moy. 7 j <strong className="num">{avg == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(avg)}</strong> {reached == null ? null : <span className="chip">{reached ? "atteint" : "en dessous"}</span>}</p>
                  <Spark points={sparkPoints(values, today)} target={kpi.target} />
                  <DeleteButton entity="kpi" id={kpi.id} />
                </div>
              </article>
            );
          }) : <p className="text-muted">Aucun indicateur pour ce projet.</p>}
        </div>
      </section>
      {project.coursesEnabled ? (
        <section className="surface p-5">
          <h2 className="text-h3">Détail des courses</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <p className="text-small">Prix moyen RacTac<br /><strong className="num">{formatFcfa(summary.avgApp)}</strong></p>
            <p className="text-small">Prix moyen Yango<br /><strong className="num">{formatFcfa(summary.avgYango)}</strong></p>
            <p className="text-small">Prix moyen livreur<br /><strong className="num">{formatFcfa(summary.avgLiv)}</strong></p>
            <p className="text-small">RacTac vs Yango<br /><strong className="num">{formatGap(summary.gap)}</strong></p>
          </div>
          <div className="mt-4"><CourseForm projectId={project.id} /></div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-small">
              <thead><tr className="text-caption text-muted text-left"><th>Date</th><th>Trajet</th><th>RacTac</th><th>Yango</th><th>Livreur</th><th></th></tr></thead>
              <tbody>
                {project.courses.slice(0, 60).map((course) => (
                  <tr key={course.id} className="border-t border-line">
                    <td className="py-2">{course.date}</td>
                    <td>{[course.fromPlace, course.toPlace].filter(Boolean).join(" → ") || "—"}{course.driver ? <div className="text-muted">{course.driver}</div> : null}</td>
                    <td className="num">{formatFcfa(course.app)}</td>
                    <td className="num">{formatFcfa(course.yango)}</td>
                    <td className="num">{formatFcfa(course.liv)}</td>
                    <td><DeleteButton entity="course" id={course.id} label="×" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!project.courses.length ? <p className="text-muted">Aucune course enregistrée.</p> : null}
          </div>
        </section>
      ) : null}
      {project.anomaliesEnabled ? (
        <section className="surface p-5">
          <h2 className="text-h3">Anomalies</h2>
          <div className="mt-4"><AnomalyForm projectId={project.id} /></div>
          <ul className="mt-4 flex flex-col gap-3">
            {project.anomalies.map((anomaly) => (
              <li key={anomaly.id} className={`rounded-[12px] border border-line p-3 ${anomaly.status === "resolved" ? "opacity-60" : ""}`}>
                <p className="text-small">{anomaly.text}</p>
                <p className="text-small text-muted">{anomaly.date} · {anomaly.severity} · {anomaly.status === "resolved" ? "Résolue" : "Ouverte"}</p>
                {anomaly.file?.unavailable ? <p className="text-small">Fichier indisponible{anomaly.file.name ? ` · ${anomaly.file.name}` : ""}</p> : anomaly.file ? <a className="text-small text-primary-fg" href={`/api/anomalies/${anomaly.id}/fichier`}>Ouvrir {anomaly.file.name}</a> : null}
                <ResolveButton id={anomaly.id} status={anomaly.status} />
              </li>
            ))}
            {!project.anomalies.length ? <li className="text-muted">Aucune anomalie notée.</li> : null}
          </ul>
        </section>
      ) : null}
      {project.meetings.length ? (
        <section className="surface p-5">
          <h2 className="text-h3">Réunions liées</h2>
          {project.meetings.map((link) => <article key={link.meetingId} className="mt-3"><h3 className="text-h3">{link.meeting.title}</h3><MarkdownView text={link.meeting.cr} /></article>)}
        </section>
      ) : null}
      <section>
        <h2 className="text-h3 mb-3">Tâches de la phase</h2>
        <TaskBoard tasks={board} />
      </section>
    </div>
  );
}
