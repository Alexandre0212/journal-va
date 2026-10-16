import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, BarChart3, Box, Calendar, CalendarClock, CheckSquare, ClipboardCheck, Compass, Flag, FolderKanban, Gauge, Layers, MessageSquare, Rocket, TrendingUp, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { MISSION, PHASES, PROJECT_ACCENTS, PROJECT_LOGOS, phaseByIndex } from "@/domain/phases";
import { averageRatio, formatPercent, okrRatio } from "@/domain/okr";
import { isLate, onDay } from "@/domain/tasks";
import { Counter, Reveal } from "@/features/reveal";
import { TIMEZONE, formatDay, shiftDay, todayISO } from "@/lib/dates";
import { DAKAR_HERO } from "@/lib/images";
import { requireUser } from "@/server/auth/session";
import { loadDashboard } from "@/server/queries";

const PHASE_ICONS = [Flag, Compass, BadgeCheck, Box, Rocket, TrendingUp, Layers];
const PROJECT_ART: Record<string, { src: string; position: string }> = {
  safya: { src: "/images/dashboard/project-safya-soignante.webp", position: "center 16%" },
  triage: { src: "/images/dashboard/project-triage-medical.webp", position: "72% center" },
  rpm: { src: "/images/dashboard/project-ractac-livreur.webp", position: "32% center" },
};
const MARK = "entreprises à fort potentiel";
const STATUS = { todo: "À faire", doing: "En cours", blocked: "Bloqué", done: "Fait" } as const;
const MIX = [
  { key: "todo" as const, label: "À faire", color: "#23358E" },
  { key: "doing" as const, label: "En cours", color: "#E79409" },
  { key: "blocked" as const, label: "Bloqué", color: "#B3362B" },
  { key: "done" as const, label: "Fait", color: "#1F7A45" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const today = todayISO();
  const data = await loadDashboard(today);
  const tasks = data.projects.flatMap((project) => project.tasks.map((task) => ({ ...task, projectName: project.name, projectId: project.id })));
  const done = tasks.filter((task) => task.status === "done").length;
  const blocked = tasks.filter((task) => task.status === "blocked");
  const soon = tasks.filter((task) => task.due && task.status !== "done" && task.due >= today && task.due <= shiftDay(today, 7));
  const mine = tasks.filter((task) => task.assigneeId === user.id && task.status !== "done");
  const todayTasks = tasks.filter((task) => onDay({ date: task.date, createdAt: task.createdAt.toISOString(), history: task.history.map((entry) => ({ at: entry.at.toISOString(), status: entry.status })) }, today));
  const open = tasks.length - done;
  const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const counts = { todo: 0, doing: 0, blocked: 0, done: 0 };
  for (const task of tasks) counts[task.status] += 1;
  const kpis = data.projects.flatMap((project) => project.kpis.map((kpi) => ({ ...kpi, projectId: project.id, projectName: project.name })));
  const studioRatios = data.projects.flatMap((project) => project.okrs.filter((okr) => okr.phase === project.phase).map((okr) => okrRatio({ keyResults: okr.keyResults })));
  const studioAvg = averageRatio(studioRatios);
  const first = user.name.split(" ")[0] ?? user.name;
  const [missionBefore, missionAfter] = MISSION.split(MARK);
  const when = new Date(`${today}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, weekday: "long" }).format(when);
  const month = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, month: "long" }).format(when);

  return (
    <div className="board">
      <Reveal>
        <section className="dash-hero">
          <Image className="dash-hero-photo" src={DAKAR_HERO.src} alt="" width={DAKAR_HERO.width} height={DAKAR_HERO.height} unoptimized priority />
          <div className="dash-hero-scrim" aria-hidden />
          <div className="dash-hero-row">
            <div className="dash-hero-copy">
              <p className="dash-kicker text-caption">Haskè Ventures</p>
              <h1 className="text-h1 mt-1">Bonjour {first}</h1>
              <p className="dash-lead text-small">Voici un aperçu de l'avancement de vos projets aujourd'hui.</p>
              <h2 className="dash-mission">« {missionBefore}<em>{MARK}</em>{missionAfter} »</h2>
            </div>
            <aside className="dash-date">
              <span className="text-caption">{weekday}</span>
              <span className="dash-date-num">{Number(today.slice(8))}</span>
              <span className="text-small">{month} {today.slice(0, 4)}</span>
            </aside>
          </div>
        </section>
      </Reveal>

      <ol className="phases" aria-label="Les 7 phases du venture building">
        {PHASES.map((phase) => {
          const Icon = PHASE_ICONS[phase.index] ?? Flag;
          return (
            <li key={phase.name} style={{ ["--c" as string]: phase.color }}>
              <span className="chev" tabIndex={0}><Icon size={14} strokeWidth={1.75} aria-hidden />{phase.name}</span>
              <span className="tip"><strong className="text-small">{phase.name}.</strong> {phase.tip}</span>
            </li>
          );
        })}
      </ol>

      <Reveal delay={0.06}>
        <section className="dash-stats" aria-label="Synthèse">
          <Stat tint="#23358E" icon={<FolderKanban size={18} strokeWidth={1.75} />} label="Projets actifs" value={data.projects.length} detail={data.projects.map((project) => project.name).join(" · ")} />
          <Stat tint="#E79409" icon={<CheckSquare size={18} strokeWidth={1.75} />} label="Tâches ouvertes" value={open} detail={`${done} terminées sur ${tasks.length}`} />
          <Stat tint="#23358E" icon={<Gauge size={18} strokeWidth={1.75} />} label="Taux de réalisation" value={rate} suffix=" %" detail="Tâches faites sur l'ensemble" ring={rate} />
          <Stat tint="#B3362B" icon={<AlertTriangle size={18} strokeWidth={1.75} />} label="Blocages" value={blocked.length} detail={blocked.length ? `${blocked.length} tâche${blocked.length > 1 ? "s" : ""} bloquée${blocked.length > 1 ? "s" : ""}` : "Aucun blocage en cours"} />
          <Stat tint="#23358E" icon={<CalendarClock size={18} strokeWidth={1.75} />} label="Échéances 7 j" value={soon.length} detail="Tâches ouvertes à venir" />
        </section>
      </Reveal>

      <section>
        <header className="section-head">
          <div>
            <h2 className="text-h2">Notre portefeuille</h2>
            <p className="text-small text-muted">{data.projects.length} projets · SAFYA, TRIAGE+ et RacTac</p>
          </div>
          <Link href="/projets" className="btn">Voir tous les projets <ArrowRight size={16} /></Link>
        </header>
        <div className="dash-projects">
          {data.projects.map((project, index) => {
            const phase = phaseByIndex(project.phase);
            const ratios = project.okrs.filter((okr) => okr.phase === project.phase).map((okr) => okrRatio({ keyResults: okr.keyResults }));
            const avg = averageRatio(ratios);
            const percent = avg == null ? null : Math.round(avg * 100);
            const projectOpen = project.tasks.filter((task) => task.status !== "done").length;
            const okrCount = ratios.length;
            return (
              <Reveal key={project.id} delay={0.08 + index * 0.05}>
                <Link href={`/projets/${project.id}`} className="dash-project" aria-label={project.name} style={{ ["--pc" as string]: PROJECT_ACCENTS[project.id] ?? phase.color }}>
                  {PROJECT_ART[project.id] ? <Image className="dash-project-photo" src={PROJECT_ART[project.id].src} alt="" width={640} height={420} unoptimized style={{ objectPosition: PROJECT_ART[project.id].position }} /> : null}
                  <div className="dash-project-copy">
                    <div className="dash-project-top">
                      <span className="logo-plate"><Logo src={PROJECT_LOGOS[project.id] ?? ""} alt="" height={project.id === "rpm" ? 40 : project.id === "triage" ? 22 : 28} /></span>
                      <span className="dash-phase">{phase.name}</span>
                    </div>
                    <p className="num text-kpi whitespace-nowrap">{percent == null ? "—" : `${percent} %`}</p>
                    <p className="text-small">{projectOpen} tâche{projectOpen > 1 ? "s" : ""} ouverte{projectOpen > 1 ? "s" : ""}</p>
                    <p className="text-small text-muted">{okrCount} OKR de la phase</p>
                    {project.note?.hot ? <p className="text-small">{project.note.hot}</p> : null}
                    <span className="dash-go" aria-hidden><ArrowRight size={16} /></span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="dash-panels">
        <Reveal delay={0.12}>
          <article className="dash-panel">
            <header className="dash-panel-head">
              <div>
                <p className="text-caption text-accent-text">Répartition</p>
                <h2 className="text-h3">Tâches du studio</h2>
                <p className="text-small text-muted">Vue d'ensemble de l'état des tâches sur tous les projets du studio.</p>
              </div>
              <Image className="dash-illu" src="/images/dashboard/section-taches-checklist.webp" alt="" width={76} height={58} unoptimized />
            </header>
            <div className="dash-split">
              <Donut total={tasks.length} counts={counts} />
              <ul className="dash-legend">
                {MIX.map((item) => (
                  <li key={item.key}><i className="dash-dot" style={{ background: item.color }} />{item.label}<strong>{counts[item.key]}</strong></li>
                ))}
              </ul>
            </div>
            <div className="dash-bar" role="img" aria-label={`${counts.todo} à faire, ${counts.doing} en cours, ${counts.blocked} bloqué, ${counts.done} fait`}>
              {MIX.map((item) => <i key={item.key} style={{ width: `${(counts[item.key] / Math.max(1, tasks.length)) * 100}%`, background: item.color }} />)}
            </div>
          </article>
        </Reveal>
        <Reveal delay={0.16}>
          <article className="dash-panel">
            <header>
              <p className="text-caption" style={{ color: "var(--primary-fg)" }}>Objectifs</p>
              <h2 className="text-h3">Avancement des OKR</h2>
              <p className="text-small text-muted">Suivi de la progression des OKR par projet du studio.</p>
            </header>
            <div className="flex flex-col gap-2">
              {data.projects.map((project) => {
                const ratios = project.okrs.filter((okr) => okr.phase === project.phase).map((okr) => okrRatio({ keyResults: okr.keyResults }));
                const avg = averageRatio(ratios);
                const width = avg == null ? 0 : Math.round(avg * 100);
                return (
                  <Link key={project.id} href={`/projets/${project.id}`} className="dash-okr" aria-label={`Objectifs de ${project.name}`}>
                    <span className="dash-mark logo-plate"><Logo src={PROJECT_LOGOS[project.id] ?? ""} alt="" height={project.id === "rpm" ? 32 : project.id === "triage" ? 16 : 20} /></span>
                    <span className="dash-okr-track">
                      <span className="text-small font-medium">{project.name}</span>
                      <span className="dash-meter" role="img" aria-label={`${project.name}, ${avg == null ? "aucune moyenne" : formatPercent(avg)}`}><span style={{ width: `${width}%`, background: PROJECT_ACCENTS[project.id] ?? "var(--primary)" }} /></span>
                    </span>
                    <strong className="num text-small">{avg == null ? "—" : formatPercent(avg)}</strong>
                    <ArrowRight className="dash-arrow" size={16} aria-hidden />
                  </Link>
                );
              })}
            </div>
            <div className="dash-avg">
              <Image className="dash-illu dash-illu-okr" src="/images/dashboard/section-okr-cible.webp" alt="" width={56} height={56} unoptimized />
              <p className="min-w-0 text-small">Moyenne des OKR de la phase en cours</p>
              <p className="num text-h3">{studioAvg == null ? "—" : formatPercent(studioAvg)}</p>
            </div>
          </article>
        </Reveal>
        <Reveal delay={0.2}>
          <article className="dash-panel">
            <header className="dash-panel-head">
              <div>
                <p className="text-caption text-accent-text">Indicateurs</p>
                <h2 className="text-h3">KPI suivis</h2>
                <p className="text-small text-muted">Principaux indicateurs de performance du studio.</p>
              </div>
              <Image className="dash-illu" src="/images/dashboard/section-kpi-analytics.webp" alt="" width={76} height={58} unoptimized />
            </header>
            {kpis.length ? (
              <ul className="flex flex-col gap-2">
                {kpis.map((kpi) => {
                  const latest = [...kpi.values].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
                  return (
                    <li key={kpi.id} className="dash-kpi" title={kpi.label}>
                      <span className="dash-mark logo-plate"><Logo src={PROJECT_LOGOS[kpi.projectId] ?? ""} alt="" height={kpi.projectId === "rpm" ? 28 : 16} /></span>
                      <span className="min-w-0">
                        <span className="dash-clamp text-small font-medium" title={kpi.label}>{kpi.label}</span>
                        <span className="text-caption text-muted">{kpi.projectName}</span>
                      </span>
                      <strong className="num text-small"><span className="text-body font-semibold" style={{ color: "var(--text)" }}>{latest == null ? "—" : latest.value}</span>{kpi.unit ? <span>{kpi.unit}</span> : null}</strong>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="dash-empty dash-empty-blue text-small">Aucun KPI enregistré.</p>}
            <Link href="/kpi" className="dash-link">Ouvrir les KPI <ArrowRight className="dash-arrow" size={16} /></Link>
          </article>
        </Reveal>
      </section>

      <section className="dash-panels">
        <Reveal delay={0.18}>
          <article className="dash-panel">
            <Image className="dash-wash" src="/images/dashboard/section-haske-abstrait.webp" alt="" width={320} height={84} unoptimized />
            <header className="dash-panel-head">
              <div>
                <h2 className="text-h3"><Calendar size={18} className="mr-1 inline" aria-hidden /> La journée</h2>
                <p className="text-small text-muted">Votre activité et vos interactions du jour.</p>
              </div>
            </header>
            <div className="flex flex-col gap-2">
              <div className="dash-line"><span className="dash-ico-sm" style={{ background: "color-mix(in srgb, var(--accent) 18%, var(--surface))", color: "var(--accent-text)" }}><CheckSquare size={16} /></span>Actions touchées<strong className="num">{todayTasks.length}</strong></div>
              <div className="dash-line"><span className="dash-ico-sm" style={{ background: "color-mix(in srgb, var(--primary) 12%, var(--surface))", color: "var(--primary-fg)" }}><MessageSquare size={16} /></span>Infos reçues<strong className="num">{data.infos.length}</strong></div>
              <div className="dash-line"><span className="dash-ico-sm" style={{ background: "color-mix(in srgb, var(--primary) 12%, var(--surface))", color: "var(--primary-fg)" }}><Users size={16} /></span>Réunions<strong className="num">{data.meetings.length}</strong></div>
              <Link href="/pilotage" className="dash-line">Pilotage<strong className="num">{data.mgmtToday}</strong><ArrowRight className="dash-arrow" size={14} /></Link>
            </div>
            {data.infos.length ? <div className="flex flex-col gap-2">{data.infos.map((info) => <p key={info.id} className="text-small"><span className="font-medium">{info.project?.name}.</span> {info.text}</p>)}</div> : null}
            {data.summary ? <p className="text-small text-muted">{data.summary.imported ? "Récap importé pour aujourd'hui." : "Récap calculé pour aujourd'hui."}</p> : null}
            <div className="dash-pills">
              <Link href="/journal" className="dash-pill dash-pill-blue"><ClipboardCheck size={15} /> Journal <ArrowRight className="dash-arrow" size={14} /></Link>
              <Link href="/taches" className="dash-pill dash-pill-orange"><CheckSquare size={15} /> Tâches <ArrowRight className="dash-arrow" size={14} /></Link>
              <Link href="/recaps" className="dash-pill dash-pill-soft"><BarChart3 size={15} /> Récaps <ArrowRight className="dash-arrow" size={14} /></Link>
            </div>
          </article>
        </Reveal>
        <Reveal delay={0.22}>
          <article className="dash-panel">
            <Image className="dash-wash" src="/images/dashboard/section-haske-abstrait.webp" alt="" width={320} height={84} unoptimized />
            <header>
              <h2 className="text-h3"><AlertTriangle size={18} className="mr-1 inline text-crit" aria-hidden /> Blocages</h2>
              <p className="text-small text-muted">Suivi des tâches bloquées sur l'ensemble des projets.</p>
            </header>
            {blocked.length ? (
              <ul className="flex flex-col gap-2">
                {blocked.map((task) => (
                  <li key={task.id}>
                    <Link href="/taches" className="dash-task">
                      <span className="text-caption text-muted">{task.projectName}</span>
                      <span className="text-small font-medium">{task.title}</span>
                      {task.blocker ? <span className="text-small text-muted">{task.blocker}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dash-empty dash-empty-warn">
                <AlertArt />
                <p className="text-h3">Aucun blocage en cours</p>
                <p className="text-small text-muted">Les tâches bloquées apparaîtront ici.</p>
              </div>
            )}
          </article>
        </Reveal>
        <Reveal delay={0.26}>
          <article className="dash-panel">
            <Image className="dash-wash" src="/images/dashboard/section-haske-abstrait.webp" alt="" width={320} height={84} unoptimized />
            <header>
              <h2 className="text-h3">Mon travail</h2>
              <p className="text-small text-muted">Vos tâches personnelles à traiter.</p>
            </header>
            {mine.length ? (
              <ul className="flex flex-col gap-2">
                {mine.slice(0, 5).map((task) => (
                  <li key={task.id}>
                    <Link href="/taches" className="dash-task">
                      <span className="text-small font-medium">{task.title}</span>
                      <span className="text-caption text-muted">{task.projectName} · {STATUS[task.status]}{task.priority ? ` · priorité ${task.priority === "high" ? "haute" : task.priority === "low" ? "basse" : "normale"}` : ""}{task.due ? ` · ${formatDay(task.due)}` : ""}{isLate(task.due, task.status, today) ? " · en retard" : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="dash-empty dash-empty-blue">
                <Image className="dash-illu" src="/images/dashboard/section-taches-checklist.webp" alt="" width={76} height={58} unoptimized />
                <p className="text-h3">Aucune tâche à votre nom pour le moment</p>
              </div>
            )}
            <Link href="/taches" className="dash-link">Voir les tâches <ArrowRight className="dash-arrow" size={16} /></Link>
          </article>
        </Reveal>
      </section>
    </div>
  );
}

function Stat({ tint, icon, label, value, suffix = "", detail, ring }: { tint: string; icon: React.ReactNode; label: string; value: number; suffix?: string; detail: string; ring?: number }) {
  return (
    <article className="dash-stat" style={{ ["--tint" as string]: tint }}>
      <span className="dash-ico">{icon}</span>
      <p className="text-caption text-muted mt-3">{label}</p>
      <p><Counter value={value} />{suffix ? <span className="text-h3 text-muted">{suffix}</span> : null}</p>
      {ring != null ? <div className="dash-meter mt-2" aria-hidden><span style={{ width: `${ring}%`, background: "linear-gradient(90deg, #23358E, #E79409)" }} /></div> : null}
      <p className="metric-detail text-small text-muted">{detail}</p>
    </article>
  );
}

function Donut({ total, counts }: { total: number; counts: { todo: number; doing: number; blocked: number; done: number } }) {
  const segments = MIX.reduce<Array<{ key: string; color: string; pct: number; start: number }>>((list, item) => {
    const pct = total ? (counts[item.key] / total) * 100 : 0;
    const start = list.reduce((sum, segment) => sum + segment.pct, 0);
    return [...list, { key: item.key, color: item.color, pct, start }];
  }, []);
  return (
    <svg className="dash-donut" viewBox="0 0 120 120" role="img" aria-label={`${total} tâches`}>
      <circle cx="60" cy="60" r="42" fill="none" stroke="var(--surface-sunken)" strokeWidth="14" />
      {segments.map((item) => item.pct > 0 ? <circle key={item.key} className="donut-seg" cx="60" cy="60" r="42" fill="none" stroke={item.color} strokeWidth="14" pathLength={100} strokeDasharray={`${item.pct} ${100 - item.pct}`} strokeDashoffset={-item.start} transform="rotate(-90 60 60)" /> : null)}
      <text x="60" y="58" textAnchor="middle" fill="var(--text)" fontSize="22" fontWeight="700">{total}</text>
      <text x="60" y="74" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">tâches</text>
    </svg>
  );
}

function AlertArt() {
  return (
    <svg width="92" height="72" viewBox="0 0 92 72" aria-hidden>
      <circle cx="68" cy="16" r="6" fill="#E79409" opacity="0.28" />
      <circle cx="18" cy="54" r="8" fill="#E79409" opacity="0.16" />
      <circle cx="46" cy="36" r="26" fill="#FFF6E6" stroke="#E79409" strokeOpacity="0.35" />
      <path d="M46 18.5 l18 30.5 H28 Z" fill="#E79409" />
      <path d="M46 22 l14.2 24.2 H31.8 Z" fill="#F6B24A" />
      <rect x="44" y="31" width="4" height="10" rx="2" fill="#fff" />
      <circle cx="46" cy="45.5" r="2.2" fill="#fff" />
    </svg>
  );
}
