import Link from "next/link";
import { Logo } from "@/components/logo";
import { Ribbon } from "@/components/motion/ribbon";
import { PROJECT_LOGOS } from "@/domain/phases";
import { averageRatio, formatPercent, okrRatio } from "@/domain/okr";
import { isLate, onDay } from "@/domain/tasks";
import { Counter, Reveal } from "@/features/reveal";
import { formatDayLong, shiftDay, todayISO } from "@/lib/dates";
import { phaseByIndex } from "@/domain/phases";
import { loadDashboard } from "@/server/queries";
import { requireUser } from "@/server/auth/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayISO();
  const data = await loadDashboard(today);
  const tasks = data.projects.flatMap((project) => project.tasks.map((task) => ({ ...task, projectName: project.name })));
  const done = tasks.filter((task) => task.status === "done").length;
  const blocked = tasks.filter((task) => task.status === "blocked");
  const soon = tasks.filter((task) => task.due && task.status !== "done" && task.due >= today && task.due <= shiftDay(today, 7));
  const mine = tasks.filter((task) => task.assigneeId === user.id && task.status !== "done");
  const todayTasks = tasks.filter((task) => onDay({ date: task.date, createdAt: task.createdAt.toISOString(), history: task.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status })) }, today));

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <header className="surface relative overflow-hidden px-6 py-8">
          <Ribbon className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-40" />
          <p className="text-caption text-accent-text relative">Notre mission</p>
          <h1 className="text-h1 relative mt-2 max-w-[34ch]">Transformer des opportunités de marché en <em className="text-accent-text not-italic">entreprises à fort potentiel</em>, en réunissant stratégie, entrepreneuriat, capital et exécution.</h1>
          <p className="relative mt-3 text-small text-muted">{formatDayLong(today)}</p>
          <ol className="relative mt-6 grid grid-cols-2 gap-2 md:grid-cols-7" aria-label="Les 7 phases du venture building">
            {Array.from({ length: 7 }, (_, index) => phaseByIndex(index)).map((phase) => (
              <li key={phase.name} className="rounded-[8px] px-2 py-3 text-center text-small font-semibold" style={{ background: phase.color, color: phase.on }} title={phase.tip}>{phase.name}</li>
            ))}
          </ol>
        </header>
      </Reveal>
      <Reveal delay={0.05}>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Synthèse">
          <Stat label="Projets actifs" value={data.projects.length} />
          <Stat label="Tâches ouvertes" value={tasks.length - done} />
          <Stat label="Taux de réalisation" value={tasks.length ? Math.round((done / tasks.length) * 100) : 0} suffix="%" />
          <Stat label="Blocages" value={blocked.length} />
          <Stat label="Échéances 7 j" value={soon.length} />
        </section>
      </Reveal>
      <section className="grid gap-4 lg:grid-cols-3">
        {data.projects.map((project, index) => {
          const phase = phaseByIndex(project.phase);
          const ratios = project.okrs.filter((okr) => okr.phase === project.phase).map((okr) => okrRatio({ keyResults: okr.keyResults }));
          const avg = averageRatio(ratios);
          const counts = { todo: 0, doing: 0, blocked: 0, done: 0 };
          for (const task of project.tasks.filter((task) => task.phase === project.phase)) counts[task.status] += 1;
          return (
            <Reveal key={project.id} delay={0.08 + index * 0.05}>
              <Link href={`/projets/${project.id}`} className="surface flex h-full flex-col gap-4 overflow-hidden p-0 transition hover:-translate-y-0.5" style={{ borderTop: `8px solid ${phase.color}` }}>
                <div className="flex items-center justify-between gap-3 px-4 pt-4">
                  <span className="logo-plate"><Logo src={PROJECT_LOGOS[project.id] ?? ""} alt="" height={32} /></span>
                  <span className="num text-kpi">{avg == null ? "—" : formatPercent(avg)}</span>
                </div>
                <div className="px-4">
                  <h2 className="text-h3">{project.name}</h2>
                  <p className="text-small" style={{ color: `var(--phase-${phase.index})` }}>{phase.name}</p>
                </div>
                <div className="flex flex-wrap gap-2 px-4">
                  <span className="chip">{counts.todo} à faire</span>
                  <span className="chip">{counts.doing} en cours</span>
                  <span className="chip">{counts.blocked} bloqué</span>
                  <span className="chip">{counts.done} fait</span>
                </div>
                <div className="flex flex-col gap-2 px-4 pb-4">
                  <Note label="Point chaud" value={project.note?.hot} />
                  <Note label="So far" value={project.note?.sofar} />
                  <Note label="Keep in mind" value={project.note?.keep} />
                </div>
              </Link>
            </Reveal>
          );
        })}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="text-h3">Points bloquants</h2>
          {blocked.length ? <ul className="mt-3 flex flex-col gap-2">{blocked.map((task) => <li key={task.id} className="rounded-[8px] bg-crit-soft p-3 text-small"><strong>{task.title}</strong><br />{task.projectName} · {task.blocker || "Raison non renseignée"}</li>)}</ul> : <p className="mt-3 text-muted">Aucun blocage signalé. Une tâche passée en « Bloqué » apparaît ici avec sa raison.</p>}
        </div>
        <div className="surface p-5">
          <h2 className="text-h3">Mon travail</h2>
          {mine.length ? <ul className="mt-3 flex flex-col gap-2">{mine.slice(0, 6).map((task) => <li key={task.id} className="text-small">{task.title}{isLate(task.due, task.status, today) ? <span className="text-crit"> · en retard</span> : null}</li>)}</ul> : <p className="mt-3 text-muted">Aucune tâche ne vous est attribuée.</p>}
          <h3 className="text-h3 mt-6">Aujourd'hui</h3>
          <p className="text-small text-muted">{todayTasks.length} action{todayTasks.length > 1 ? "s" : ""} touchée{todayTasks.length > 1 ? "s" : ""} aujourd'hui.</p>
        </div>
        <div className="surface p-5">
          <h2 className="text-h3">Journal</h2>
          {data.infos.length ? data.infos.map((info) => <p key={info.id} className="mt-3 text-small"><strong>{info.project?.name}</strong> · {info.text}</p>) : <p className="mt-3 text-muted">Aucune info reçue aujourd'hui.</p>}
          <p className="mt-4 text-small">{data.meetings.length ? `${data.meetings.length} réunion aujourd'hui.` : "Aucune réunion aujourd'hui."}</p>
          <Link href="/journal" className="btn mt-4">Ouvrir le journal</Link>
        </div>
        <div className="surface p-5">
          <h2 className="text-h3">Récap</h2>
          {data.summary ? <p className="mt-3 text-small text-muted">Un récap existe pour aujourd'hui{data.summary.imported ? ", importé tel quel" : ", calculé depuis les données"}.</p> : <p className="mt-3 text-muted">Pas de récapitulatif pour aujourd'hui. Le texte n'est pas inventé.</p>}
          <Link href="/recaps" className="btn mt-4">Voir les récaps</Link>
          <p className="mt-4 text-small text-muted">{data.mgmtToday} action{data.mgmtToday > 1 ? "s" : ""} de pilotage aujourd'hui.</p>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  return (
    <article className="surface p-4">
      <p className="text-caption text-muted">{label}</p>
      <p className="mt-2"><Counter value={value} />{suffix ? <span className="text-h3">{suffix}</span> : null}</p>
    </article>
  );
}

function Note({ label, value }: { label: string; value?: string | null }) {
  return <p className="text-small"><span className="text-caption text-muted">{label}</span><br />{value || "À renseigner"}</p>;
}
