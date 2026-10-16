import { ArrowLeft, BarChart3, CalendarClock, CircleCheck, Flame, ListTodo, StickyNote, Target, UserRound, Users } from "lucide-react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/logo";
import { MarkdownView } from "@/components/markdown-view";
import { coursesSummary, formatFcfa, formatGap } from "@/domain/courses";
import { averageLast7, sparkPoints, targetReached } from "@/domain/kpi";
import { averageRatio, formatPercent, okrRatio } from "@/domain/okr";
import { PHASES, PROJECT_ACCENTS, PROJECT_LOGOS, phaseByIndex } from "@/domain/phases";
import { isLate, onDay } from "@/domain/tasks";
import { AnomalyForm, CourseForm, DayActionsBound, DeleteButton, InfoForm, KpiToday, NotesEditor, ResolveButton } from "@/features/forms";
import { PhaseSwitch } from "@/features/phase-switch";
import { ProjectEditor } from "@/features/project-editor";
import { ProjectObjectives } from "@/features/project-objectives";
import { Counter, Reveal } from "@/features/reveal";
import { Spark } from "@/features/spark";
import { TaskBoard, type BoardTask } from "@/features/board";
import { dayOfInstant, formatDay, todayISO } from "@/lib/dates";
import { requireUser } from "@/server/auth/session";
import { loadProject, loadUsers } from "@/server/queries";

const PROJECT_ART: Record<string, { src: string; position: string }> = {
  safya: { src: "/images/dashboard/project-safya-soignante.webp", position: "center 16%" },
  triage: { src: "/images/dashboard/project-triage-medical.webp", position: "72% center" },
  rpm: { src: "/images/dashboard/project-ractac-livreur.webp", position: "32% center" },
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const project = await loadProject(id);
  if (!project) notFound();
  const users = await loadUsers();
  const phase = project.phase;
  const official = phaseByIndex(phase);
  const today = todayISO();
  const okrs = project.okrs.filter((okr) => okr.phase === phase);
  const tasks = project.tasks.filter((task) => task.phase === phase);
  const dayTasks = project.tasks.filter((task) => onDay({ date: task.date, createdAt: task.createdAt.toISOString(), history: task.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status })) }, today) && task.projectId === project.id);
  const board: BoardTask[] = tasks.map((task) => ({
    id: task.id, title: task.title, status: task.status, projectId: project.id, projectName: project.name, phase: task.phase,
    okrId: task.okrId, okrTitle: task.okr?.title ?? null, assigneeId: task.assigneeId, assignee: task.assignee?.name ?? null,
    due: task.due, date: task.date, priority: task.priority === "low" || task.priority === "normal" || task.priority === "high" ? task.priority : null,
    blocker: task.blocker, late: isLate(task.due, task.status, today),
  }));
  const summary = coursesSummary(project.courses.map((course) => ({ app: course.app, yango: course.yango, liv: course.liv })));
  const progress = averageRatio(okrs.map((okr) => okrRatio(okr)));
  const moving = okrs.filter((okr) => okrRatio(okr) > 0).length;
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const doneTasks = tasks.filter((task) => task.status === "done").length;
  const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
  const actors = new Set(tasks.map((task) => task.assigneeId).filter((assignee): assignee is string => Boolean(assignee))).size;
  const updated = dayOfInstant(project.updatedAt.toISOString());
  const art = PROJECT_ART[project.id];
  const accent = PROJECT_ACCENTS[project.id] ?? "#23358E";

  return (
    <div className="page fiche">
      <Link className="fiche-back" href="/projets">
        <ArrowLeft size={16} aria-hidden />
        Retour aux projets
      </Link>
      <div className="fiche-hero-wrap">
        <header className="fiche-hero" data-project={project.id} style={{ ["--project" as string]: accent }} aria-label={project.name}>
          {art ? <Image className="fiche-hero-photo" src={art.src} alt="" width={640} height={420} unoptimized style={{ objectPosition: art.position }} /> : null}
          <p className="sr-only">{project.name}</p>
          <div className="fiche-hero-copy">
            <p className="fiche-kicker">Projet</p>
            <span className="logo-plate fiche-logo"><Logo src={PROJECT_LOGOS[project.id] ?? ""} alt="" height={project.id === "rpm" ? 40 : 28} /></span>
            <p className="fiche-phase-label">Phase actuelle</p>
            <h1>{official.name}</h1>
            <p className="fiche-hero-text">{official.tip}</p>
          </div>
        </header>
      </div>
      <div className="fiche-phase-row">
        <PhaseSwitch projectId={project.id} projectName={project.name} official={project.phase} phases={PHASES.map((item) => ({ index: item.index, name: item.name, color: item.color }))} />
        {user.role === "ADMIN" ? (
          <ProjectEditor
            project={{
              id: project.id,
              name: project.name,
              phase: project.phase,
              coursesEnabled: project.coursesEnabled,
              anomaliesEnabled: project.anomaliesEnabled,
              leadId: project.leadId,
              participantIds: project.participants.map((item) => item.userId),
            }}
            users={users.filter((person) => !person.isTest && (person.active || person.id === project.leadId || project.participants.some((item) => item.userId === person.id))).map((person) => ({ id: person.id, name: person.name }))}
          />
        ) : null}
      </div>
      <section className="fiche-stats" aria-label={`Synthèse de la phase ${official.name}`}>
        <Reveal>
          <article className="dash-stat" style={{ ["--tint" as string]: "#23358E" }}>
            <span className="dash-ico"><Target size={18} aria-hidden /></span>
            <p className="text-small text-muted mt-3">Progression de la phase</p>
            <p className="text-kpi">{progress == null ? "—" : formatPercent(progress)}</p>
            {progress != null ? <div className="dash-meter mt-2" aria-hidden><span style={{ width: `${Math.round(progress * 100)}%`, background: "linear-gradient(90deg, #23358E, #E79409)" }} /></div> : null}
            <p className="text-small text-muted">{okrs.length ? `${moving} sur ${okrs.length} en progression` : "Aucun objectif sur cette phase"}</p>
          </article>
        </Reveal>
        <Reveal delay={0.05}>
          <article className="dash-stat" style={{ ["--tint" as string]: "#23358E" }}>
            <span className="dash-ico"><ListTodo size={18} aria-hidden /></span>
            <p className="text-small text-muted mt-3">Tâches ouvertes</p>
            <p><Counter value={openTasks} /></p>
            <p className="text-small text-muted">{blockedTasks === 0 ? "Aucune bloquée" : blockedTasks === 1 ? "1 bloquée" : `${blockedTasks} bloquées`}</p>
          </article>
        </Reveal>
        <Reveal delay={0.1}>
          <article className="dash-stat" style={{ ["--tint" as string]: "#E79409" }}>
            <span className="dash-ico"><CircleCheck size={18} aria-hidden /></span>
            <p className="text-small text-muted mt-3">Tâches terminées</p>
            <p><Counter value={doneTasks} /></p>
            <p className="text-small text-muted">sur {tasks.length}</p>
          </article>
        </Reveal>
        <Reveal delay={0.15}>
          <article className="dash-stat" style={{ ["--tint" as string]: "#23358E" }}>
            <span className="dash-ico"><Users size={18} aria-hidden /></span>
            <p className="text-small text-muted mt-3">Acteurs impliqués</p>
            <p><Counter value={actors} /></p>
            <p className="text-small text-muted">{actors === 0 ? "Aucun responsable sur ces tâches" : "Responsables des tâches de cette phase"}</p>
          </article>
        </Reveal>
      </section>
      <ProjectObjectives phaseName={official.name} today={today} okrs={okrs.map((okr) => ({ id: okr.id, title: okr.title, due: okr.due, keyResults: okr.keyResults }))} />
      <section className="fiche-card">
        <TaskBoard
          heading={
            <div className="fiche-card-title">
              <span className="fiche-ico fiche-ico-blue"><ListTodo size={18} aria-hidden /></span>
              <div>
                <h2 className="text-h3">Tâches de la phase</h2>
                <p className="text-small text-muted">{official.name} · {tasks.length} tâche{tasks.length > 1 ? "s" : ""}</p>
              </div>
            </div>
          }
          key={`${project.id}-${phase}`}
          tasks={board}
          today={today}
          createPhase={phase}
          meta={{ projects: [{ id: project.id, name: project.name, phase: project.phase }], okrs: project.okrs.map((okr) => ({ id: okr.id, title: okr.title, projectId: okr.projectId, phase: okr.phase })), users: users.map((person) => ({ id: person.id, name: person.name })) }}
        />
      </section>
      <section className="fiche-split">
        <article className="fiche-card">
          <header className="fiche-card-head">
            <div className="fiche-card-title">
              <span className="fiche-ico fiche-ico-orange"><Flame size={18} aria-hidden /></span>
              <h2 className="text-h3">Informations clés</h2>
            </div>
            {user.role === "ADMIN" ? <NotesEditor projectId={project.id} hot={project.note?.hot ?? null} sofar={project.note?.sofar ?? null} keep={project.note?.keep ?? null} /> : null}
          </header>
          <div className="fiche-infos">
            <InfoLine icon={<UserRound size={16} aria-hidden />} label="Responsable" value={project.lead?.name ?? "Non renseigné"} />
            <InfoLine icon={<Flame size={16} aria-hidden />} label="Point chaud" value={project.note?.hot ?? "Non renseigné"} />
            <InfoLine icon={<StickyNote size={16} aria-hidden />} label="So far" value={project.note?.sofar ?? "Non renseigné"} />
            <InfoLine icon={<StickyNote size={16} aria-hidden />} label="Keep in mind" value={project.note?.keep ?? "Non renseigné"} />
            <InfoLine icon={<Users size={16} aria-hidden />} label="Participants" value={project.participants.length ? project.participants.map((item) => item.user.name).join(", ") : "Aucun participant"} />
            <InfoLine icon={<CalendarClock size={16} aria-hidden />} label="Dernière mise à jour" value={updated ? formatDay(updated, true) : "Non renseignée"} />
          </div>
        </article>
        <article className="fiche-card">
          <header className="fiche-card-head">
            <div className="fiche-card-title">
              <span className="fiche-ico fiche-ico-blue"><BarChart3 size={18} aria-hidden /></span>
              <div>
                <h2 className="text-h3">Indicateurs suivis</h2>
                <p className="text-small text-muted">Indicateurs du projet. Ils ne sont pas rattachés à une phase.</p>
              </div>
            </div>
          </header>
          {project.kpis.length ? (
            <div className="fiche-kpis">
              {project.kpis.map((kpi) => {
                const values = Object.fromEntries(kpi.values.map((value) => [value.date, value.value]));
                const avg = averageLast7(values, today);
                const reached = targetReached(avg, kpi.target);
                return (
                  <article key={kpi.id} className="fiche-kpi">
                    <div>
                      <h3 className="text-h3">{kpi.label}</h3>
                      <p className="text-small text-muted">{kpi.target == null ? "Sans objectif chiffré" : `Objectif : ${kpi.target} ${kpi.unit}`}</p>
                    </div>
                    <label className="text-small text-muted">Aujourd&apos;hui <KpiToday kpiId={kpi.id} date={today} value={values[today] ?? null} /></label>
                    <div>
                      <p className="text-small">Moy. 7 j <strong className="num">{avg == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(avg)}</strong> {kpi.unit} {reached == null ? null : <span className="chip">{reached ? "atteint" : "en dessous"}</span>}</p>
                      <Spark points={sparkPoints(values, today)} target={kpi.target} />
                      <DeleteButton entity="kpi" id={kpi.id} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="fiche-empty">
              <span className="fiche-ico fiche-ico-blue"><BarChart3 size={18} aria-hidden /></span>
              <p className="text-h3">Aucun indicateur pour ce projet</p>
              <p className="text-small text-muted">Les indicateurs apparaissent ici une fois configurés.</p>
              <Link className="btn btn-primary" href="/kpi">Configurer les indicateurs</Link>
            </div>
          )}
        </article>
      </section>
      <section className="fiche-split">
        <article className="fiche-card">
          <h2 className="text-h3">Actions du jour</h2>
          <p className="text-small text-muted">{formatDay(today, true)} · phase actuelle : {official.name}</p>
          <div className="mt-4"><DayActionsBound projectId={project.id} phase={phase} date={today} okrs={okrs.map((okr) => ({ id: okr.id, name: okr.title }))} /></div>
          <ul className="mt-4 flex flex-col gap-2">
            {dayTasks.length ? dayTasks.map((task) => <li key={task.id} className="text-small">{task.title} · {task.status}</li>) : <li className="text-muted">Aucune action saisie aujourd&apos;hui sur {project.name}.</li>}
          </ul>
        </article>
        <article className="fiche-card">
          <div className="flex items-center justify-between gap-3"><h2 className="text-h3">Infos reçues</h2><InfoForm projectId={project.id} date={today} /></div>
          <ul className="mt-4 flex flex-col gap-2">
            {project.infos.filter((info) => info.date === today).map((info) => (
              <li key={info.id} className="rounded-[8px] border border-line p-3 text-small">
                <p>{info.text}</p>
                <p className="text-muted">{info.source ?? "Source non renseignée"} · {info.channel}</p>
                <DeleteButton entity="info" id={info.id} />
              </li>
            ))}
            {project.infos.every((info) => info.date !== today) ? <li className="text-muted">Aucune info reçue aujourd&apos;hui sur {project.name}.</li> : null}
          </ul>
        </article>
      </section>
      {project.coursesEnabled ? (
        <section className="fiche-card">
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
        <section className="fiche-card">
          <h2 className="text-h3">Anomalies</h2>
          <div className="mt-4"><AnomalyForm projectId={project.id} /></div>
          <ul className="mt-4 flex flex-col gap-3">
            {project.anomalies.map((anomaly) => (
              <li key={anomaly.id} className={`rounded-[12px] border border-line p-3 ${anomaly.status === "resolved" ? "opacity-60" : ""}`}>
                <p className="text-small">{anomaly.text}</p>
                <p className="text-small text-muted">{anomaly.date} · {anomaly.severity} · {anomaly.status === "resolved" ? "Résolue" : anomaly.status === "progress" ? "En cours" : "Ouverte"}</p>
                {anomaly.file?.unavailable ? <p className="text-small">Fichier indisponible{anomaly.file.name ? ` · ${anomaly.file.name}` : ""}</p> : anomaly.file ? <a className="text-small text-primary-fg" href={`/api/anomalies/${anomaly.id}/fichier`}>Ouvrir {anomaly.file.name}</a> : null}
                <ResolveButton id={anomaly.id} status={anomaly.status} />
              </li>
            ))}
            {!project.anomalies.length ? <li className="text-muted">Aucune anomalie notée.</li> : null}
          </ul>
        </section>
      ) : null}
      {project.meetings.length ? (
        <section className="fiche-card">
          <h2 className="text-h3">Réunions liées</h2>
          {project.meetings.map((link) => <article key={link.meetingId} className="mt-3"><h3 className="text-h3">{link.meeting.title}</h3><MarkdownView text={link.meeting.cr} /></article>)}
        </section>
      ) : null}
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="fiche-info">
      <span className="fiche-ico fiche-ico-blue">{icon}</span>
      <span className="min-w-0">
        <span className="fiche-info-label">{label}</span>
        <span className="fiche-info-value">{value}</span>
      </span>
    </div>
  );
}
