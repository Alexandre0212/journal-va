import { AlertTriangle, BarChart3, CheckCircle2, ChevronLeft, ChevronRight, Clock, Flame } from "lucide-react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { MarkdownView } from "@/components/markdown-view";
import { averageRatio, formatPercent, okrRatio } from "@/domain/okr";
import { PROJECT_LOGOS, phaseByIndex } from "@/domain/phases";
import { onDay } from "@/domain/tasks";
import { DayActionsBound } from "@/features/forms";
import { JournalInfos } from "@/features/journal-infos";
import { JournalOkrProgressRow } from "@/features/journal-okr-progress";
import { JournalProjectSwitch } from "@/features/journal-project-switch";
import { formatDayLong, shiftDay, todayISO } from "@/lib/dates";
import { DAKAR_HERO } from "@/lib/images";
import { loadJournal } from "@/server/queries";

const OKR_ORDER = ["rpm", "safya", "triage"];

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
  const done = data.tasks.filter((task) => task.history.some((entry) => entry.status === "done" && todayISO(entry.at) === day) || (task.date === day && task.status === "done"));
  const started = data.tasks.filter((task) => task.date === day && task.status === "doing");
  const blocked = data.tasks.filter((task) => task.status === "blocked");
  const upcoming = data.tasks.filter((task) => task.due && task.due >= day && task.status !== "done");
  const taskLines = [
    ...done.map((task) => `Fait · ${task.project.name} — ${task.title}`),
    ...started.map((task) => `En cours · ${task.project.name} — ${task.title}`),
  ];
  const lead = data.summary?.text.split("\n")[0] ?? `Synthèse calculée depuis les enregistrements du ${formatDayLong(day)}.`;
  const nextDisabled = day >= today;

  return (
    <div className="journal page">
      <header className="journal-hero reveal">
        <Image className="journal-hero-photo" src={DAKAR_HERO.src} alt="" width={DAKAR_HERO.width} height={DAKAR_HERO.height} unoptimized />
        <div className="journal-hero-copy">
          <p className="journal-kicker text-caption">Journal du jour</p>
          <h1 className="text-h1">{day === today ? "Aujourd'hui" : formatDayLong(day)}</h1>
          <p className="journal-sub text-small">{formatDayLong(day)} · {phaseByIndex(phase).name}</p>
          <span className="mast-rule" />
          <JournalProjectSwitch projects={data.projects.map((item) => ({ id: item.id, name: item.name }))} activeId={project.id} day={day} />
        </div>
        <div className="journal-nav">
          <Link className="shrink-0 whitespace-nowrap" href={`/journal?jour=${shiftDay(day, -1)}&projet=${project.id}`}><ChevronLeft size={16} aria-hidden /> Jour précédent</Link>
          <Link className={`shrink-0 whitespace-nowrap ${nextDisabled ? "is-disabled" : ""}`} href={nextDisabled ? `/journal?jour=${day}&projet=${project.id}` : `/journal?jour=${shiftDay(day, 1)}&projet=${project.id}`} aria-disabled={nextDisabled || undefined} tabIndex={nextDisabled ? -1 : undefined}>Jour suivant <ChevronRight size={16} aria-hidden /></Link>
          {day !== today ? <Link className="is-today shrink-0 whitespace-nowrap" href={`/journal?projet=${project.id}`}>Aujourd'hui</Link> : null}
        </div>
      </header>

      {day < today ? <p className="journal-past">Jour passé : ce que vous ajoutez ici est daté de ce jour.</p> : null}

      {data.meetings.length ? (
        <section className="journal-card">
          <h2 className="text-h3">Réunions du jour</h2>
          {data.meetings.map((meeting) => (
            <article key={meeting.id} className="journal-meeting">
              <h3 className="text-h3">{meeting.title}</h3>
              <div className="report"><MarkdownView text={meeting.cr} /></div>
            </article>
          ))}
        </section>
      ) : null}

      <section className="journal-pair">
        <article className="journal-card">
          <header className="journal-card-head">
            <div className="journal-card-title">
              <span className="journal-ico journal-ico-orange" aria-hidden><CheckCircle2 size={18} /></span>
              <div>
                <h2 className="text-h3">Actions du jour</h2>
                <p className="text-small text-muted">{actions.length} enregistrée{actions.length > 1 ? "s" : ""} {day === today ? "aujourd'hui" : "ce jour-là"}</p>
              </div>
            </div>
          </header>
          <div className="journal-action">
            <div>
              <DayActionsBound
                date={day}
                projectId={project.id}
                phase={phase}
                okrs={okrs.map((okr) => ({ id: okr.id, name: okr.title }))}
                caption="Action"
                captionClassName="sr-only"
                placeholder="Décrivez votre action, votre avancement ou votre apprentissage…"
                submitLabel="Enregistrer mon action"
              />
              {actions.length ? (
                <ul className="journal-list">
                  {actions.map((task) => (
                    <li key={task.id}>
                      <p className="text-small">{task.title}</p>
                      <p className="text-small text-muted">{task.assignee?.name ?? "Non attribuée"} · {task.status}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <aside className="journal-aside">
              <NotebookArt />
              <p className="text-h3">Chaque avancée compte</p>
              <p className="text-small text-muted">Consignez vos actions, décisions et apprentissages au fil de la journée.</p>
            </aside>
          </div>
        </article>
        <article className="journal-card">
          <JournalInfos projectId={project.id} date={day} infos={infos.map((info) => ({ id: info.id, text: info.text, channel: info.channel, source: info.source }))} />
        </article>
      </section>

      <section className="journal-card journal-recap-card">
        <header className="journal-card-head">
          <div className="journal-card-title">
            <span className="journal-ico journal-ico-blue" aria-hidden><BarChart3 size={18} /></span>
            <div>
              <h2 className="text-h3">Récapitulatif du jour</h2>
              <p className="text-small text-muted">{lead}</p>
            </div>
          </div>
        </header>
        <div className="journal-recap">
          <div className="journal-recap-main">
            <div className="journal-minis">
              <Mini tone="good" icon={<CheckCircle2 size={16} />} title="Tâches du jour" lines={taskLines} empty="Aucun élément enregistré." />
              <Mini tone="info" icon={<InboxMini />} title="Infos reçues" lines={data.infos.map((info) => `${info.project?.name ?? "Projet"} — ${info.text}`)} empty="Aucun élément enregistré." />
              <Mini tone="alert" icon={<AlertTriangle size={16} />} title="Points bloquants" lines={blocked.map((task) => `${task.project.name} — ${task.title}${task.blocker ? ` : ${task.blocker}` : ""}`)} empty="Aucun élément enregistré." />
              <Mini tone="soon" icon={<Clock size={16} />} title="À venir" lines={upcoming.map((task) => `${task.due} — ${task.title}`)} empty="Aucun élément enregistré." />
            </div>
            {project.note?.hot ? (
              <Link href={`/projets/${project.id}`} className="journal-hot">
                <Flame size={18} aria-hidden />
                <span className="text-caption">Point chaud</span>
                <p>{project.note.hot}</p>
                <ChevronRight size={18} aria-hidden />
              </Link>
            ) : (
              <div className="journal-hot is-empty">
                <Flame size={18} aria-hidden />
                <span className="text-caption">Point chaud</span>
                <p>Aucun point chaud noté pour {project.name}.</p>
              </div>
            )}
          </div>
          <div className="journal-okr-panel">
            <h3 className="text-h3">Progression des OKR</h3>
            <div className="journal-okr-list">
              {OKR_ORDER.map((id) => {
                const item = data.projects.find((entry) => entry.id === id);
                if (!item) return null;
                const rows = data.okrs.filter((okr) => okr.projectId === item.id && okr.phase === item.phase);
                const avg = averageRatio(rows.map((okr) => okrRatio({ keyResults: okr.keyResults })));
                const current = phaseByIndex(item.phase);
                return (
                  <JournalOkrProgressRow
                    key={item.id}
                    href={`/projets/${item.id}`}
                    name={item.name}
                    logo={PROJECT_LOGOS[item.id] ?? ""}
                    logoHeight={item.id === "rpm" ? 28 : item.id === "triage" ? 16 : 20}
                    phase={current.name}
                    phaseColor={current.color}
                    percent={avg == null ? "—" : formatPercent(avg)}
                    width={avg == null ? 0 : Math.round(avg * 100)}
                    detail={avg == null ? "Aucun OKR de la phase en cours" : `${formatPercent(avg)} en moyenne sur ${rows.length} OKR`}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <details className="journal-details">
          <summary>Consulter le récapitulatif complet</summary>
          <div className="journal-details-body report">
            {data.summary ? <MarkdownView text={data.summary.text} /> : <p className="text-small text-muted">Pas de récapitulatif enregistré pour ce jour. La synthèse ci-dessus reprend les enregistrements disponibles.</p>}
          </div>
        </details>
      </section>
    </div>
  );
}

function Mini({ tone, icon, title, lines, empty }: { tone: string; icon: ReactNode; title: string; lines: string[]; empty: string }) {
  const shown = lines.slice(0, 3);
  const rest = lines.length - shown.length;
  return (
    <article className={`journal-mini journal-mini-${tone}`}>
      <h3>{icon}{title}</h3>
      {shown.length ? (
        <ul>
          {shown.map((line, index) => <li key={`${title}-${index}`}>{line}</li>)}
          {rest > 0 ? <li className="text-muted">et {rest} autre{rest > 1 ? "s" : ""} dans le récapitulatif complet</li> : null}
        </ul>
      ) : <p>{empty}</p>}
    </article>
  );
}

function InboxMini() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M3 4.5h12v7.2c0 .8-.7 1.5-1.5 1.5H4.5C3.7 13.2 3 12.5 3 11.7V4.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.2h3.1l1 1.6h3.8l1-1.6H15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function NotebookArt() {
  return (
    <svg className="journal-art" viewBox="0 0 160 120" aria-hidden>
      <circle cx="28" cy="24" r="14" fill="#FFF3DD" />
      <circle cx="126" cy="96" r="16" fill="#EAF0FF" />
      <rect x="46" y="22" width="62" height="78" rx="10" fill="#fff" stroke="#23358E" strokeOpacity="0.25" />
      <path d="M58 40h38M58 52h38M58 64h24" stroke="#23358E" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
      <path d="M96 58l22 8-8 6 4 16-14-10-10 8 4-16-8-6 10-6Z" fill="#E79409" />
      <path d="M108 78l6 10" stroke="#23358E" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
