"use client";

import { BadgeCheck, BarChart3, CalendarClock, Folder, Loader2, Plus, Search, Target, Timer, Trash2, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { formatPercent, okrPace, okrRatio, type OkrPace } from "@/domain/okr";
import { PHASES, PROJECT_ACCENTS, PROJECT_LOGOS, phaseByIndex } from "@/domain/phases";
import { shiftDay } from "@/lib/dates";
import { saveOkr } from "@/server/actions";
import { OkrDetail } from "@/features/okr-drawer";
import { Reveal } from "@/features/reveal";

export type OkrCard = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  phase: number;
  due: string | null;
  recent: number;
  keyResults: Array<{ id: string; label: string; current: number; target: number; unit: string }>;
  tasks: Array<{ id: string; title: string; status: "todo" | "doing" | "blocked" | "done"; due: string | null; assignee: string | null }>;
  history: Array<{ id: string; at: string; actor: string | null; field: string | null; before: string | null; after: string | null }>;
};

const ROW = ["rpm", "safya", "triage"];

function weave(list: OkrCard[]) {
  const groups = new Map<string, OkrCard[]>();
  for (const okr of list) groups.set(okr.projectId, [...(groups.get(okr.projectId) ?? []), okr]);
  const ids = [...ROW.filter((id) => groups.has(id)), ...[...groups.keys()].filter((id) => !ROW.includes(id))];
  const count = Math.max(0, ...ids.map((id) => groups.get(id)?.length ?? 0));
  const ordered: OkrCard[] = [];
  for (let index = 0; index < count; index += 1) {
    for (const id of ids) {
      const card = groups.get(id)?.[index];
      if (card) ordered.push(card);
    }
  }
  return ordered;
}

const PACE: Record<OkrPace, { label: string; tone: string }> = {
  done: { label: "Atteint", tone: "good" },
  late: { label: "En retard", tone: "late" },
  active: { label: "En cours", tone: "progress" },
  idle: { label: "À démarrer", tone: "idle" },
};

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function OkrBoard({ okrs, projects, today }: { okrs: OkrCard[]; projects: Array<{ id: string; name: string }>; today: string }) {
  const router = useRouter();
  const [patches, setPatches] = useState<Record<string, number>>({});
  const [hidden, setHidden] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [phase, setPhase] = useState("");
  const [pace, setPace] = useState("");
  const [horizon, setHorizon] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<Record<string, OkrCard>>({});
  const items = okrs.filter((okr) => !hidden.includes(okr.id)).map((okr) => {
    const next = saved[okr.id] ? { ...okr, ...saved[okr.id], tasks: okr.tasks, history: okr.history } : okr;
    return { ...next, keyResults: next.keyResults.map((kr) => ({ ...kr, current: patches[`${okr.id}:${kr.id}`] ?? kr.current })) };
  });

  const soon = shiftDay(today, 7);
  const visible = items.filter((okr) => {
    const needle = query.trim().toLowerCase();
    if (needle && !okr.title.toLowerCase().includes(needle) && !okr.keyResults.some((kr) => kr.label.toLowerCase().includes(needle))) return false;
    if (projectId && okr.projectId !== projectId) return false;
    if (phase !== "" && okr.phase !== Number(phase)) return false;
    if (pace && okrPace(okr, today) !== pace) return false;
    if (horizon === "soon" && !(okr.due && okr.due >= today && okr.due <= soon)) return false;
    if (horizon === "late" && !(okr.due && okr.due < today)) return false;
    if (horizon === "none" && okr.due) return false;
    return true;
  });
  const counts = {
    total: visible.length,
    done: visible.filter((okr) => okrPace(okr, today) === "done").length,
    active: visible.filter((okr) => okrPace(okr, today) === "active").length,
    late: visible.filter((okr) => okrPace(okr, today) === "late").length,
  };
  const selected = items.find((okr) => okr.id === selectedId) ?? null;
  const shown = weave(visible);

  function share(part: number) {
    if (!counts.total) return "—";
    return `${Math.round((part / counts.total) * 100)} %`;
  }

  function updateCurrent(okrId: string, krId: string, current: number) {
    setPatches((currentPatches) => ({ ...currentPatches, [`${okrId}:${krId}`]: current }));
    router.refresh();
  }

  return (
    <div className="okr-page">
      <header className="task-mast">
        <div className="task-mast-copy">
          <p className="text-caption text-accent-text">Mesure</p>
          <h1 className="text-h1">Objectifs et résultats clés</h1>
          <p className="text-small text-muted">Suivez et mesurez l&apos;avancement des objectifs stratégiques de vos ventures.</p>
          <span className="mast-rule" />
        </div>
        <button type="button" className="btn btn-primary task-create" onClick={() => { setCreating(true); setSelectedId(null); }}><Plus size={16} aria-hidden /> Nouvel objectif</button>
      </header>

      <div className="board-panel">
        <label className="board-search-wrap">
          <Search size={16} aria-hidden />
          <input className="control board-search" placeholder="Rechercher un objectif ou un résultat clé…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Rechercher un objectif ou un résultat clé" />
        </label>
        <div className="board-filters">
          <select className="control" aria-label="Filtrer par projet" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">Tous les projets</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select className="control" aria-label="Filtrer par phase" value={phase} onChange={(event) => setPhase(event.target.value)}>
            <option value="">Toutes les phases</option>
            {PHASES.map((item) => <option key={item.index} value={item.index}>{item.name}</option>)}
          </select>
          <select className="control" aria-label="Filtrer par statut" value={pace} onChange={(event) => setPace(event.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="done">Atteint</option>
            <option value="active">En cours</option>
            <option value="late">En retard</option>
            <option value="idle">À démarrer</option>
          </select>
          <select className="control" aria-label="Filtrer par échéance" value={horizon} onChange={(event) => setHorizon(event.target.value)}>
            <option value="">Toutes les échéances</option>
            <option value="soon">Dans 7 jours</option>
            <option value="late">Dépassées</option>
            <option value="none">Sans échéance</option>
          </select>
        </div>
      </div>

      <section className="okr-stats" aria-label="Synthèse des objectifs">
        <Stat tint="#23358E" icon={<Target size={18} />} label="Objectifs totaux" value={counts.total} detail="sur tous les projets" />
        <Stat tint="#1F7A45" icon={<BadgeCheck size={18} />} label="Objectifs atteints" value={counts.done} detail={counts.done ? `${share(counts.done)} de réussite` : "Aucun objectif atteint"} />
        <Stat tint="#E79409" icon={<Timer size={18} />} label="En cours" value={counts.active} detail={counts.active ? `${share(counts.active)} en progression` : "Aucun en progression"} />
        <Stat tint="#B3362B" icon={<CalendarClock size={18} />} label="En retard" value={counts.late} detail={counts.late ? `${share(counts.late)} nécessitent une attention` : "Aucun retard"} />
      </section>

      {visible.length ? (
        <div className="okr-grid">
          {shown.map((okr, index) => (
            <Reveal key={okr.id} delay={Math.min(index, 8) * 0.04}>
              <OkrTile okr={okr} today={today} onOpen={() => { setSelectedId(okr.id); setEditing(false); }} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="okr-empty surface">
          <Target size={22} aria-hidden />
          <p className="text-h3">{items.length ? "Aucun objectif ne correspond" : "Aucun objectif pour le moment"}</p>
          <p className="text-small text-muted">{items.length ? "Modifiez la recherche ou les filtres." : "Créez le premier objectif du studio."}</p>
        </div>
      )}

      {selected ? (
        <OkrDetail
          okr={selected}
          today={today}
          projects={projects}
          editing={editing}
          onEdit={setEditing}
          onClose={() => { setSelectedId(null); setEditing(false); }}
          onCurrent={updateCurrent}
          onSaved={(next) => {
            setSaved((current) => ({ ...current, [next.id]: next }));
            setEditing(false);
            router.refresh();
          }}
          onDeleted={() => {
            setHidden((current) => [...current, selected.id]);
            setSelectedId(null);
            router.refresh();
          }}
        />
      ) : null}
      {creating ? <CreateDrawer projects={projects} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); router.refresh(); }} /> : null}
    </div>
  );
}

function Stat({ tint, icon, label, value, detail }: { tint: string; icon: ReactNode; label: string; value: number; detail: string }) {
  return (
    <article className="dash-stat" style={{ ["--tint" as string]: tint }}>
      <span className="dash-ico">{icon}</span>
      <p className="text-caption text-muted mt-3">{label}</p>
      <p className="text-kpi num">{value}</p>
      <p className="metric-detail text-small text-muted">{detail}</p>
    </article>
  );
}

function OkrTile({ okr, today, onOpen }: { okr: OkrCard; today: string; onOpen: () => void }) {
  const ratio = okrRatio(okr);
  const status = PACE[okrPace(okr, today)];
  const preview = okr.keyResults.slice(0, 3);
  const rest = okr.keyResults.length - preview.length;
  return (
    <article
      id={`okr-card-${okr.id}`}
      className="okr-card"
      style={{ ["--pc" as string]: PROJECT_ACCENTS[okr.projectId] ?? "#23358E" }}
      role="button"
      tabIndex={0}
      aria-label={`${okr.title}, ${formatPercent(ratio)}`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <header className="okr-card-top">
        <span className="logo-plate okr-logo">
          <Logo src={PROJECT_LOGOS[okr.projectId] ?? ""} alt="" height={okr.projectId === "rpm" ? 28 : okr.projectId === "triage" ? 16 : 22} />
        </span>
        <span className="dash-phase">{phaseByIndex(okr.phase).name}</span>
      </header>
      <div className="okr-card-title">
        <h2 className="text-h3">{okr.title}</h2>
        <strong className="num okr-pct">{formatPercent(ratio)}</strong>
      </div>
      <div className="dash-meter" role="img" aria-label={formatPercent(ratio)}><span style={{ width: `${Math.round(ratio * 100)}%`, background: PROJECT_ACCENTS[okr.projectId] ?? "#23358E" }} /></div>
      <p className="okr-card-meta">
        <span className={`fiche-badge fiche-badge-${status.tone}`}>{status.label}</span>
        <span className="text-small text-muted">{okr.recent} action{okr.recent > 1 ? "s" : ""} sur 7 jours</span>
      </p>
      <ul className="okr-preview">
        {preview.map((kr) => (
          <li key={kr.id}>
            <span className="okr-preview-label">{kr.label}</span>
            <span className="okr-mini" aria-hidden><span style={{ width: `${Math.round(okrRatio({ keyResults: [kr] }) * 100)}%` }} /></span>
            <span className="num">{nf.format(kr.current)} / {nf.format(kr.target)}</span>
          </li>
        ))}
      </ul>
      {rest > 0 ? <p className="text-small text-muted">et {rest} autre{rest > 1 ? "s" : ""} résultat{rest > 1 ? "s" : ""} clé{rest > 1 ? "s" : ""}</p> : null}
      {!okr.keyResults.length ? <p className="text-small text-muted">Aucun résultat clé</p> : null}
    </article>
  );
}

function CreateDrawer({ projects, onClose, onCreated }: { projects: Array<{ id: string; name: string }>; onClose: () => void; onCreated: () => void }) {
  const reduced = useReducedMotion();
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const root = panel.current;
    const items = () => [...(root?.querySelectorAll<HTMLElement>("button, input, select, textarea") ?? [])].filter((item) => !item.hasAttribute("disabled"));
    items().find((item) => item.tagName === "TEXTAREA")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        document.querySelector<HTMLButtonElement>(".okr-page .task-create")?.focus();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const list = items();
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function close() {
    document.querySelector<HTMLButtonElement>(".okr-page .task-create")?.focus();
    closeRef.current();
  }
  return createPortal(
    <div className="drawer-back okr-create-back" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <motion.aside
        ref={panel}
        className="drawer okr-create"
        role="dialog"
        aria-modal="true"
        aria-labelledby="okr-create-title"
        initial={reduced ? false : { x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <header className="okr-create-head">
          <span className="okr-create-mark"><Target size={18} aria-hidden /></span>
          <div>
            <h2 id="okr-create-title" className="text-h2">Nouvel objectif</h2>
            <p className="text-small text-muted">Définissez un nouvel objectif stratégique et ses résultats clés</p>
          </div>
          <button type="button" className="okr-x" aria-label="Fermer" onClick={close}><X size={18} aria-hidden /></button>
        </header>
        <ObjectiveForm premium projects={projects} submitLabel="Enregistrer l'objectif" onCancel={close} onSaved={() => { toast.success("Enregistré"); onCreated(); }} />
      </motion.aside>
    </div>,
    document.body,
  );
}

function ObjectiveForm({
  projects, initial, submitLabel, onCancel, onSaved, premium = false,
}: {
  projects: Array<{ id: string; name: string }>;
  initial?: OkrCard;
  submitLabel: string;
  onCancel: () => void;
  onSaved: (okr: OkrCard) => void;
  premium?: boolean;
}) {
  const reduced = useReducedMotion();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [projectId, setProjectId] = useState(initial?.projectId ?? projects[0]?.id ?? "");
  const [phase, setPhase] = useState(initial?.phase ?? 0);
  const [due, setDue] = useState(initial?.due ?? "");
  const [rows, setRows] = useState(initial?.keyResults ?? [{ id: "kr-nouveau", label: "", target: 100, current: 0, unit: "%" }]);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => { if (premium) titleRef.current?.focus(); }, [premium]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const keyResults = rows.filter((row) => row.label.trim());
    if (!title.trim()) { setError("Indiquez le titre de l'objectif."); titleRef.current?.focus(); return; }
    if (keyResults.some((row) => !Number.isFinite(row.target) || !Number.isFinite(row.current))) { setError("Les valeurs doivent être des nombres."); return; }
    setPending(true);
    setError("");
    const payload = { id: initial?.id, projectId, phase, title: title.trim(), due: due || null, keyResults };
    void saveOkr(payload).then((result) => {
      setPending(false);
      if (!result.ok) { setError(result.error); toast.error(result.error); return; }
      onSaved({
        id: initial?.id ?? "",
        title: title.trim(),
        projectId,
        projectName: projects.find((project) => project.id === projectId)?.name ?? "",
        phase,
        due: due || null,
        recent: initial?.recent ?? 0,
        tasks: initial?.tasks ?? [],
        history: initial?.history ?? [],
        keyResults,
      });
    }).catch(() => {
      setPending(false);
      setError("Enregistrement impossible.");
      toast.error("Enregistrement impossible.");
    });
  }

  function updateRow(index: number, patch: Partial<OkrCard["keyResults"][number]>) {
    setRows(rows.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  if (premium) {
    return (
      <form className="okr-create-body" onSubmit={submit}>
        <div className="okr-create-scroll">
          <motion.section className="okr-create-card" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.04 }}>
            <header className="okr-create-section">
              <span className="okr-create-mark"><Folder size={18} aria-hidden /></span>
              <div>
                <h3 className="text-h3">Informations générales</h3>
                <p className="text-small text-muted">Configurez les paramètres de votre objectif</p>
              </div>
            </header>
            <label className="field okr-title-field">
              <span>Objectif</span>
              <textarea ref={titleRef} className="control" value={title} maxLength={160} placeholder="Décrivez votre objectif stratégique..." aria-invalid={Boolean(error && !title.trim())} onChange={(event) => setTitle(event.target.value)} />
              <em className="okr-count">{title.length}/160</em>
            </label>
            <div className="okr-form-grid">
              <label className="field"><span>Projet</span>
                <select className="control" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
              </label>
              <label className="field"><span>Phase</span>
                <select className="control" value={phase} onChange={(event) => setPhase(Number(event.target.value))}>{PHASES.map((item) => <option key={item.index} value={item.index}>{item.name}</option>)}</select>
              </label>
              <label className="field"><span>Échéance</span><input className="control" type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
            </div>
          </motion.section>
          <motion.section className="okr-create-card okr-create-card-warm" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.1 }}>
            <header className="okr-create-section">
              <span className="okr-create-mark okr-create-mark-warm"><BarChart3 size={18} aria-hidden /></span>
              <div>
                <h3 className="text-h3">Résultats clés</h3>
                <p className="text-small text-muted">Ajoutez les indicateurs qui permettront de mesurer la réalisation de cet objectif</p>
              </div>
            </header>
            {rows.map((row, index) => (
                <motion.div key={row.id} className={rows.length > 1 ? `okr-kr-create${leaving === row.id ? " is-leaving" : ""}` : "okr-kr-create is-solo"} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <label className="field"><span>Description</span><input className="control" value={row.label} maxLength={240} placeholder="Ex. : Nombre de clients actifs" onChange={(event) => updateRow(index, { label: event.target.value })} /></label>
                  <label className="field"><span>Valeur actuelle</span><input className="control" type="number" inputMode="decimal" step="any" value={row.current} onChange={(event) => updateRow(index, { current: Number(event.target.value) })} /></label>
                  <label className="field"><span>Objectif</span><input className="control" type="number" inputMode="decimal" step="any" aria-label="Objectif cible" value={row.target} onChange={(event) => updateRow(index, { target: Number(event.target.value) })} /></label>
                  <label className="field"><span>Unité</span><input className="control" value={row.unit} maxLength={40} onChange={(event) => updateRow(index, { unit: event.target.value })} /></label>
                  {rows.length > 1 ? <button type="button" className="okr-trash" aria-label="Supprimer ce résultat clé" onClick={() => {
                    if (leaving) return;
                    setLeaving(row.id);
                    window.setTimeout(() => {
                      setRows((current) => current.filter((item) => item.id !== row.id));
                      setLeaving(null);
                    }, reduced ? 0 : 180);
                  }}><Trash2 size={16} aria-hidden /></button> : null}
                </motion.div>
              ))}
            <button type="button" className="okr-add" onClick={() => setRows([...rows, { id: `kr${Date.now().toString(36)}`, label: "", target: 100, current: 0, unit: "%" }])}><Plus size={16} aria-hidden /> Ajouter un résultat clé</button>
          </motion.section>
          {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
        </div>
        <footer className="okr-create-foot">
          <button type="button" className="btn" disabled={pending} onClick={onCancel}>Annuler</button>
          <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? <><Loader2 className="okr-spin" size={16} aria-hidden /> Enregistrement…</> : <><Target size={16} aria-hidden /> {submitLabel}</>}</button>
        </footer>
      </form>
    );
  }

  return (
    <form className="okr-form" onSubmit={submit}>
      <label className="field"><span>Objectif</span><input className="control" value={title} maxLength={160} required onChange={(event) => setTitle(event.target.value)} /></label>
      <div className="okr-form-grid">
        <label className="field"><span>Projet</span>
          <select className="control" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        </label>
        <label className="field"><span>Phase</span>
          <select className="control" value={phase} onChange={(event) => setPhase(Number(event.target.value))}>{PHASES.map((item) => <option key={item.index} value={item.index}>{item.name}</option>)}</select>
        </label>
        <label className="field"><span>Échéance</span><input className="control" type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
      </div>
      <section className="okr-form-krs">
        <h3 className="text-h3">Résultats clés</h3>
        {rows.map((row, index) => (
          <div key={row.id} className="okr-form-kr">
            <label className="field"><span>Description</span><input className="control" value={row.label} maxLength={240} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /></label>
            <label className="field"><span>Valeur actuelle</span><input className="control" type="number" step="any" value={row.current} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, current: Number(event.target.value) } : item))} /></label>
            <label className="field"><span>Objectif</span><input className="control" type="number" step="any" value={row.target} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, target: Number(event.target.value) } : item))} /></label>
            <label className="field"><span>Unité</span><input className="control" value={row.unit} maxLength={40} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} /></label>
          </div>
        ))}
        <button type="button" className="btn" onClick={() => setRows([...rows, { id: `kr${Date.now().toString(36)}`, label: "", target: 100, current: 0, unit: "%" }])}>Ajouter un résultat clé</button>
      </section>
      {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
      <div className="okr-drawer-actions">
        <button type="button" className="btn" disabled={pending} onClick={onCancel}>Annuler</button>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Enregistrement…" : submitLabel}</button>
      </div>
    </form>
  );
}
