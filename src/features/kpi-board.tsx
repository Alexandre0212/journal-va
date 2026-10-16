"use client";

import { BarChart3, Bike, Car, Database, Eye, MoreHorizontal, Pencil, Plus, Search, Target, Trash2, TrendingUp, TriangleAlert, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { courseGap, coursesSummary, formatFcfa, formatGap } from "@/domain/courses";
import { averageLast7, kpiPace, kpiSeries, shareRatio, weekDelta, type KpiPace } from "@/domain/kpi";
import { formatPercent } from "@/domain/okr";
import { PROJECT_ACCENTS, PROJECT_LOGOS } from "@/domain/phases";
import { CourseForm, KpiCreate, KpiToday } from "@/features/forms";
import { KpiChart } from "@/features/kpi-chart";
import { Reveal } from "@/features/reveal";
import { formatDay } from "@/lib/dates";
import { saveKpi, softDelete } from "@/server/actions";

export type KpiCard = {
  id: string;
  projectId: string;
  projectName: string;
  label: string;
  unit: string;
  target: number | null;
  todayValue: number | null;
  values: Record<string, number>;
};

export type CourseRow = {
  id: string;
  date: string;
  fromPlace: string | null;
  toPlace: string | null;
  app: number | null;
  yango: number | null;
  liv: number | null;
};

const PACE: Record<KpiPace, { label: string; note: string; tone: string }> = {
  reached: { label: "Objectif atteint", note: "La moyenne sur 7 jours atteint l'objectif.", tone: "good" },
  under: { label: "Sous l'objectif", note: "La moyenne sur 7 jours reste sous l'objectif.", tone: "progress" },
  open: { label: "Sans objectif chiffré", note: "Aucune cible n'est enregistrée.", tone: "idle" },
  empty: { label: "Données insuffisantes", note: "Aucune mesure sur les 7 derniers jours.", tone: "late" },
};

const CHART_COLOR: Record<string, string> = { triage: "#23358E", rpm: "#E79409", safya: "#1F5F4D" };
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function signed(ratio: number | null) {
  if (ratio == null) return null;
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(ratio * 100)} %`;
}

function statusOf(kpi: KpiCard, today: string) {
  const average = averageLast7(kpi.values, today);
  if (kpi.target == null) return { ...PACE.open, average };
  return { ...PACE[kpiPace(average, kpi.target)], average };
}

export function KpiBoard({
  kpis, courses, projects, today, openAnomalies, coursesEnabled,
}: {
  kpis: KpiCard[];
  courses: CourseRow[];
  projects: Array<{ id: string; name: string }>;
  today: string;
  openAnomalies: number;
  coursesEnabled: boolean;
}) {
  const router = useRouter();
  const [hiddenKpis, setHiddenKpis] = useState<string[]>([]);
  const [hiddenCourses, setHiddenCourses] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [pace, setPace] = useState("");
  const [entry, setEntry] = useState("");
  const [unit, setUnit] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ entity: "kpi" | "course"; id: string; label: string } | null>(null);
  const [sort, setSort] = useState<{ key: "date" | "app" | "yango" | "liv" | "gap"; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const items = kpis.filter((kpi) => !hiddenKpis.includes(kpi.id));
  const units = [...new Set(items.map((kpi) => kpi.unit).filter(Boolean))];
  const visible = items.filter((kpi) => {
    const needle = query.trim().toLowerCase();
    const paceId = kpi.target == null ? "open" : kpiPace(averageLast7(kpi.values, today), kpi.target);
    if (needle && !kpi.label.toLowerCase().includes(needle) && !kpi.projectName.toLowerCase().includes(needle)) return false;
    if (projectId && kpi.projectId !== projectId) return false;
    if (pace && paceId !== pace) return false;
    if (entry === "today" && kpi.todayValue == null) return false;
    if (entry === "none" && kpi.todayValue != null) return false;
    if (unit && kpi.unit !== unit) return false;
    return true;
  });
  const reached = items.filter((kpi) => kpi.target != null && kpiPace(averageLast7(kpi.values, today), kpi.target) === "reached").length;
  const watch = items.filter((kpi) => kpi.target != null && kpiPace(averageLast7(kpi.values, today), kpi.target) === "under").length;
  const deltas = items.map((kpi) => weekDelta(kpi.values, today)).filter((value): value is number => value != null);
  const week = deltas.length ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length : null;
  const reachedShare = shareRatio(reached, items.length);
  const watchShare = shareRatio(watch, items.length);
  const listed = courses.filter((course) => !hiddenCourses.includes(course.id));
  const summary = coursesSummary(listed);
  const sorted = [...listed].sort((a, b) => {
    const left = sort.key === "gap" ? courseGap(a) ?? -Infinity : sort.key === "date" ? a.date : a[sort.key] ?? -Infinity;
    const right = sort.key === "gap" ? courseGap(b) ?? -Infinity : sort.key === "date" ? b.date : b[sort.key] ?? -Infinity;
    return left < right ? -sort.dir : left > right ? sort.dir : 0;
  });
  const detail = items.find((kpi) => kpi.id === detailId) ?? null;
  const editing = items.find((kpi) => kpi.id === editId) ?? null;

  function toggle(key: typeof sort.key) {
    setSort((current) => current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: key === "date" ? -1 : 1 });
  }

  return (
    <div className="kpi-page">
      <header className="task-mast">
        <div className="task-mast-copy">
          <p className="text-caption text-accent-text">Mesure</p>
          <h1 className="text-h1">Indicateurs</h1>
          <p className="text-small text-muted">Suivez vos métriques opérationnelles et vos tendances par projet.</p>
          <span className="mast-rule" />
        </div>
        <button type="button" className="btn btn-primary task-create" onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Nouvel indicateur</button>
      </header>

      <div className="kpi-tools">
        <label className="board-search-wrap">
          <Search size={16} aria-hidden />
          <input className="control board-search" placeholder="Rechercher un indicateur…" value={query} aria-label="Rechercher un indicateur" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="control" aria-label="Filtrer par projet" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Tous les projets</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select className="control" aria-label="Filtrer par statut" value={pace} onChange={(event) => setPace(event.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="reached">Objectif atteint</option>
          <option value="under">Sous l&apos;objectif</option>
          <option value="open">Sans objectif chiffré</option>
          <option value="empty">Données insuffisantes</option>
        </select>
        <select className="control" aria-label="Filtrer par saisie du jour" value={entry} onChange={(event) => setEntry(event.target.value)}>
          <option value="">Toutes les saisies</option>
          <option value="today">Valeur aujourd&apos;hui</option>
          <option value="none">Sans valeur aujourd&apos;hui</option>
        </select>
        <select className="control" aria-label="Filtrer par unité" value={unit} onChange={(event) => setUnit(event.target.value)}>
          <option value="">Toutes les unités</option>
          {units.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      <section className="kpi-stats" aria-label="Synthèse des indicateurs">
        <Stat tint="#23358E" icon={<BarChart3 size={18} />} label="Indicateurs suivis" value={items.length} detail={week == null ? "Historique insuffisant" : `${signed(week)} vs semaine précédente`} />
        <Stat tint="#1F7A45" icon={<Target size={18} />} label="Objectifs atteints" value={reached} detail={reachedShare == null ? "Aucun indicateur" : `${formatPercent(reachedShare)} des ${items.length} indicateurs suivis`} />
        <Stat tint="#E79409" icon={<TrendingUp size={18} />} label="Sous surveillance" value={watch} detail={watch === 0 ? "Aucun sous l'objectif" : `${formatPercent(watchShare ?? 0)} des ${items.length} indicateurs suivis`} />
        <Stat tint="#B3362B" icon={<TriangleAlert size={18} />} label="Alertes / anomalies" value={openAnomalies} detail={openAnomalies ? `${openAnomalies > 1 ? "ouvertes" : "ouverte"} à traiter` : "Tout est sous contrôle"} />
      </section>

      <section className="kpi-block">
        <p className="text-caption text-accent-text">Indicateurs clés</p>
        {visible.length ? (
          <div className="kpi-grid">
            {visible.map((kpi, index) => {
              const status = statusOf(kpi, today);
              const series = kpiSeries(kpi.values);
              const latest = series.at(-1) ?? null;
              const color = CHART_COLOR[kpi.projectId] ?? "#23358E";
              return (
                <Reveal key={kpi.id} delay={Math.min(index, 6) * 0.04}>
                  <article className="kpi-tile" style={{ ["--pc" as string]: PROJECT_ACCENTS[kpi.projectId] ?? "#23358E" }} onClick={() => setDetailId(kpi.id)}>
                    <header className="kpi-tile-top">
                      <span className="logo-plate kpi-logo"><Logo src={PROJECT_LOGOS[kpi.projectId] ?? ""} alt="" height={kpi.projectId === "rpm" ? 28 : kpi.projectId === "triage" ? 16 : 22} /></span>
                      <span className={`fiche-badge fiche-badge-${status.tone}`}>{status.label}</span>
                      <CardMenu
                        onDetail={() => setDetailId(kpi.id)}
                        onEdit={() => setEditId(kpi.id)}
                        onDelete={() => setConfirm({ entity: "kpi", id: kpi.id, label: kpi.label })}
                      />
                    </header>
                    <h2 className="kpi-tile-title">{kpi.label}</h2>
                    <p className="text-small text-muted">{kpi.target == null ? "Sans objectif chiffré" : `Objectif ${nf.format(kpi.target)} ${kpi.unit}`}</p>
                    <div className="kpi-tile-split">
                      <p className="kpi-reading"><span>{latest ? formatDay(latest.date) : "Aujourd'hui"}</span><strong className="num">{latest ? nf.format(latest.value) : "—"}</strong></p>
                      <p className="text-small text-muted">{status.note}</p>
                    </div>
                    <KpiChart points={series} target={kpi.target} color={color} unit={kpi.unit} />
                  </article>
                </Reveal>
              );
            })}
          </div>
        ) : <p className="kpi-empty surface">Aucun indicateur ne correspond.</p>}
      </section>

      {coursesEnabled ? (
        <section className="kpi-courses surface">
          <header className="task-mast">
            <div>
              <p className="text-caption text-accent-text">RacTac</p>
              <h2 className="text-h2">Courses</h2>
              <p className="text-small text-muted">Analysez et comparez les prix de vos courses de livraison.</p>
            </div>
            <button type="button" className="btn" onClick={() => setAddingCourse(true)}><Plus size={16} aria-hidden /> Ajouter une course</button>
          </header>
          <p className="text-small text-muted">Moyenne des {listed.length} course{listed.length > 1 ? "s" : ""} enregistrée{listed.length > 1 ? "s" : ""}. L&apos;écart compare le prix RacTac au prix Yango.</p>
          <div className="kpi-prices">
            <article><Database size={16} aria-hidden /><p className="text-caption text-muted">Prix RacTac</p><p className="num text-h3">{formatFcfa(summary.avgApp)}</p></article>
            <article><Car size={16} aria-hidden /><p className="text-caption text-muted">Yango</p><p className="num text-h3">{formatFcfa(summary.avgYango)}</p></article>
            <article><Bike size={16} aria-hidden /><p className="text-caption text-muted">Livreur</p><p className="num text-h3">{formatFcfa(summary.avgLiv)}</p></article>
            <article><TrendingUp size={16} aria-hidden /><p className="text-caption text-muted">Écart</p><p className="num text-h3">{formatGap(summary.gap)}</p></article>
          </div>
          <div className="kpi-table-wrap">
            <table className="kpi-table">
              <thead>
                <tr>
                  <th><button type="button" onClick={() => toggle("date")}>Date</button></th>
                  <th>Trajet</th>
                  <th><button type="button" onClick={() => toggle("app")}>Prix RacTac</button></th>
                  <th><button type="button" onClick={() => toggle("yango")}>Prix Yango</button></th>
                  <th><button type="button" onClick={() => toggle("liv")}>Prix livreur</button></th>
                  <th><button type="button" onClick={() => toggle("gap")}>Écart</button></th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((course) => {
                  const gap = courseGap(course);
                  return (
                    <tr key={course.id}>
                      <td className="num">{course.date}</td>
                      <td>{[course.fromPlace, course.toPlace].filter(Boolean).join(" → ") || "Trajet non renseigné"}</td>
                      <td className="num">{formatFcfa(course.app)}</td>
                      <td className="num">{formatFcfa(course.yango)}</td>
                      <td className="num">{formatFcfa(course.liv)}</td>
                      <td><span className={`fiche-badge ${gap != null && gap > 0 ? "fiche-badge-progress" : "fiche-badge-good"}`}>{formatGap(gap)}</span></td>
                      <td><button type="button" className="kpi-row-action" onClick={() => setConfirm({ entity: "course", id: course.id, label: "cette course" })}>Retirer</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!sorted.length ? <p className="text-small text-muted">Aucune course enregistrée.</p> : null}
          </div>
        </section>
      ) : <p className="text-muted">Les courses ne sont activées sur aucun projet affiché ici.</p>}

      {creating ? <Drawer title="Nouvel indicateur" onClose={() => setCreating(false)}><KpiCreate projects={projects} /></Drawer> : null}
      {addingCourse ? <Drawer title="Ajouter une course" onClose={() => setAddingCourse(false)}><CourseForm projectId="rpm" /></Drawer> : null}
      {detail ? <DetailDrawer kpi={detail} today={today} onClose={() => setDetailId(null)} onEdit={() => { setDetailId(null); setEditId(detail.id); }} /> : null}
      {editing ? <EditDrawer kpi={editing} projects={projects} onClose={() => setEditId(null)} onSaved={() => { setEditId(null); router.refresh(); }} /> : null}
      {confirm ? (
        <Drawer title={confirm.entity === "kpi" ? "Supprimer cet indicateur ?" : "Retirer cette course ?"} onClose={() => setConfirm(null)}>
          <p className="text-small text-muted">{confirm.label} sera envoyé dans la corbeille.</p>
          <div className="okr-drawer-actions">
            <button type="button" className="btn" onClick={() => setConfirm(null)}>Annuler</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              const current = confirm;
              void softDelete(current.entity, current.id).then((result) => {
                if (!result.ok) { toast.error(result.error); return; }
                if (current.entity === "kpi") setHiddenKpis((ids) => [...ids, current.id]);
                else setHiddenCourses((ids) => [...ids, current.id]);
                toast.success("Envoyé dans la corbeille");
                setConfirm(null);
                router.refresh();
              });
            }}>Confirmer</button>
          </div>
        </Drawer>
      ) : null}
    </div>
  );
}

function Stat({ tint, icon, label, value, detail }: { tint: string; icon: ReactNode; label: string; value: number; detail: string }) {
  return (
    <article className="kpi-stat" style={{ ["--tint" as string]: tint }}>
      <span className="dash-ico">{icon}</span>
      <p className="kpi-stat-label">{label}</p>
      <p className="kpi-stat-value">{value}</p>
      <p className="kpi-stat-context">{detail}</p>
    </article>
  );
}

function CardMenu({ onDetail, onEdit, onDelete }: { onDetail: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function away(event: MouseEvent) { if (!ref.current?.contains(event.target as Node)) setOpen(false); }
    function key(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <div className="kpi-menu" ref={ref} onClick={(event) => event.stopPropagation()}>
      <button type="button" className="kpi-menu-btn" aria-label="Actions de l'indicateur" aria-expanded={open} onClick={() => setOpen((value) => !value)}><MoreHorizontal size={16} aria-hidden /></button>
      {open ? (
        <div className="kpi-menu-pop" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onDetail(); }}><Eye size={14} aria-hidden /> Voir les détails</button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onEdit(); }}><Pencil size={14} aria-hidden /> Modifier</button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); onDelete(); }}><Trash2 size={14} aria-hidden /> Supprimer</button>
        </div>
      ) : null}
    </div>
  );
}

function DetailDrawer({ kpi, today, onClose, onEdit }: { kpi: KpiCard; today: string; onClose: () => void; onEdit: () => void }) {
  const status = statusOf(kpi, today);
  const series = kpiSeries(kpi.values);
  const color = CHART_COLOR[kpi.projectId] ?? "#23358E";
  return (
    <Drawer title={kpi.label} onClose={onClose}>
      <p className="text-small text-muted">{kpi.target == null ? "Sans objectif chiffré" : `Objectif ${nf.format(kpi.target)} ${kpi.unit}`} · {status.label}</p>
      <KpiChart points={series} target={kpi.target} color={color} unit={kpi.unit} height={180} />
      <p className="text-small text-muted">{status.note}</p>
      <label className="field">Valeur du jour <KpiToday kpiId={kpi.id} date={today} value={kpi.todayValue} /></label>
      {series.length ? (
        <ul className="kpi-history">
          {series.map((point) => <li key={point.date}><span>{formatDay(point.date)}</span><strong className="num">{nf.format(point.value)} {kpi.unit}</strong></li>)}
        </ul>
      ) : null}
      <button type="button" className="btn btn-primary" onClick={onEdit}>Modifier</button>
    </Drawer>
  );
}

function EditDrawer({ kpi, projects, onClose, onSaved }: { kpi: KpiCard; projects: Array<{ id: string; name: string }>; onClose: () => void; onSaved: () => void }) {
  const [projectId, setProjectId] = useState(kpi.projectId);
  const [label, setLabel] = useState(kpi.label);
  const [unit, setUnit] = useState(kpi.unit);
  const [target, setTarget] = useState(kpi.target == null ? "" : String(kpi.target));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!label.trim()) { setError("Indiquez le nom de l'indicateur."); return; }
    if (target !== "" && !Number.isFinite(Number(target))) { setError("L'objectif doit être un nombre."); return; }
    setPending(true);
    void saveKpi({ id: kpi.id, projectId, label: label.trim(), unit, target: target === "" ? null : Number(target) }).then((result) => {
      setPending(false);
      if (!result.ok) { setError(result.error); toast.error(result.error); return; }
      toast.success("Indicateur modifié");
      onSaved();
    });
  }
  return (
    <Drawer title="Modifier l'indicateur" onClose={onClose}>
      <form className="kpi-edit" onSubmit={submit}>
        <label className="field"><span>Projet</span>
          <select className="control" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        </label>
        <label className="field"><span>Indicateur</span><input className="control" value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></label>
        <label className="field"><span>Objectif</span><input className="control" value={target} inputMode="decimal" placeholder="Sans objectif" onChange={(event) => setTarget(event.target.value)} /></label>
        <label className="field"><span>Unité</span><input className="control" value={unit} maxLength={30} onChange={(event) => setUnit(event.target.value)} /></label>
        {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
        <div className="okr-drawer-actions">
          <button type="button" className="btn" disabled={pending} onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
      </form>
    </Drawer>
  );
}

function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return createPortal(
    <div className="drawer-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="drawer kpi-drawer" role="dialog" aria-modal="true" aria-labelledby="kpi-drawer-title">
        <header className="okr-drawer-head">
          <h2 id="kpi-drawer-title" className="text-h2">{title}</h2>
          <button type="button" className="okr-x" aria-label="Fermer" onClick={onClose}><X size={18} aria-hidden /></button>
        </header>
        {children}
      </aside>
    </div>,
    document.body,
  );
}
