import Link from "next/link";
import { MarkdownView } from "@/components/markdown-view";
import { phaseByIndex } from "@/domain/phases";
import { onDay } from "@/domain/tasks";
import { DayActionsBound, DeleteButton, InfoForm } from "@/features/forms";
import { formatDayLong, shiftDay, todayISO } from "@/lib/dates";
import { loadJournal } from "@/server/queries";

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ jour?: string; projet?: string }> }) {
  const query = await searchParams;
  const today = todayISO();
  const day = query.jour && query.jour <= today ? query.jour : today;
  const data = await loadJournal(day);
  const project = data.projects.find((item) => item.id === query.projet) ?? data.projects[0];
  if (!project) return <p>Aucun projet chargé.</p>;
  const phase = project.phase;
  const okrs = data.okrs.filter((okr) => okr.projectId === project.id && okr.phase === phase);
  const actions = data.tasks.filter((task) => task.projectId === project.id && onDay({ date: task.date, createdAt: task.createdAt.toISOString(), history: task.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status })) }, day));
  const infos = data.infos.filter((info) => info.projectId === project.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-caption text-accent-text">Journal du jour</p>
          <h1 className="text-h1">{day === today ? `Aujourd'hui · ${formatDayLong(day)}` : formatDayLong(day)}</h1>
        </div>
        <div className="flex gap-2">
          <Link className="btn" href={`/journal?jour=${shiftDay(day, -1)}&projet=${project.id}`}>Jour précédent</Link>
          <Link className={`btn ${day >= today ? "pointer-events-none opacity-40" : ""}`} href={`/journal?jour=${shiftDay(day, 1)}&projet=${project.id}`}>Jour suivant</Link>
          {day !== today ? <Link className="btn" href={`/journal?projet=${project.id}`}>Aujourd'hui</Link> : null}
        </div>
      </div>
      {day < today ? <p className="rounded-[8px] bg-warn-soft px-3 py-2 text-small text-warn">Jour passé : ce que vous ajoutez ici est daté de ce jour.</p> : null}
      <nav className="flex flex-wrap gap-2">{data.projects.map((item) => <Link key={item.id} className={`btn ${item.id === project.id ? "btn-primary" : ""}`} href={`/journal?jour=${day}&projet=${item.id}`}>{item.name}</Link>)}</nav>
      {data.meetings.length ? <div className="surface p-5"><h2 className="text-h3">Réunions</h2>{data.meetings.map((meeting) => <article key={meeting.id} className="mt-3"><h3 className="text-h3">{meeting.title}</h3><MarkdownView text={meeting.cr} /></article>)}</div> : null}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <h2 className="text-h3">{day < today ? "Actions de ce jour" : "Actions du jour"}</h2>
          <p className="text-small text-muted">{phaseByIndex(phase).name}</p>
          <div className="mt-3"><DayActionsBound date={day} projectId={project.id} phase={phase} okrs={okrs.map((okr) => ({ id: okr.id, name: okr.title }))} /></div>
          <ul className="mt-4 flex flex-col gap-2">{actions.length ? actions.map((task) => <li key={task.id} className="text-small">{task.assignee?.name ?? "Non attribuée"} · {task.title}</li>) : <li className="text-muted">Aucune action enregistrée ce jour-là.</li>}</ul>
        </div>
        <div className="surface p-5">
          <div className="flex justify-between"><h2 className="text-h3">Infos reçues</h2><InfoForm projectId={project.id} date={day} /></div>
          <ul className="mt-4 flex flex-col gap-2">
            {infos.map((info) => <li key={info.id} className="text-small">{info.text}<div className="text-muted">{info.channel}</div><DeleteButton entity="info" id={info.id} /></li>)}
            {!infos.length ? <li className="text-muted">Aucune info notée ce jour-là.</li> : null}
          </ul>
        </div>
      </section>
      {data.summary ? <section className="surface p-5"><h2 className="text-h3">Récap</h2><MarkdownView text={data.summary.text} /></section> : <p className="text-muted">Pas de récapitulatif pour ce jour.</p>}
    </div>
  );
}
