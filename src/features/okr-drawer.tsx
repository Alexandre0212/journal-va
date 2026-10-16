"use client";

import { BadgeCheck, Calendar, Folder, History, ListChecks, Loader2, MoreHorizontal, Pencil, Plus, Target, Trash2, X } from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { formatPercent, krRatio, okrPace, okrRatio, paceText } from "@/domain/okr";
import { PHASES, PROJECT_ACCENTS, PROJECT_LOGOS, phaseByIndex } from "@/domain/phases";
import { formatDay, TIMEZONE } from "@/lib/dates";
import { saveOkr, saveTask, setKeyResultCurrent, softDelete } from "@/server/actions";
import type { OkrCard } from "@/features/okr-board";

const PACE = {
  done: { label: "Atteint", tone: "good" },
  late: { label: "En retard", tone: "late" },
  active: { label: "En cours", tone: "progress" },
  idle: { label: "À démarrer", tone: "idle" },
} as const;

const TASK = {
  todo: { label: "À faire", tone: "idle" },
  doing: { label: "En cours", tone: "progress" },
  blocked: { label: "Bloqué", tone: "late" },
  done: { label: "Fait", tone: "good" },
} as const;

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const when = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type ViewTab = "overview" | "krs" | "actions" | "history";
type EditTab = "info" | "krs" | "actions";

export function OkrDetail({
  okr, today, projects, editing, onEdit, onClose, onCurrent, onSaved, onDeleted,
}: {
  okr: OkrCard;
  today: string;
  projects: Array<{ id: string; name: string }>;
  editing: boolean;
  onEdit: (value: boolean) => void;
  onClose: () => void;
  onCurrent: (okrId: string, krId: string, current: number) => void;
  onSaved: (okr: OkrCard) => void;
  onDeleted: () => void;
}) {
  const reduced = useReducedMotion();
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const [tab, setTab] = useState<ViewTab>("overview");
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const cancelEdit = useRef<() => void>(() => onEdit(false));
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = panel.current;
    root?.querySelector<HTMLButtonElement>(".okr-x")?.focus();
    function items() {
      return [...(root?.querySelectorAll<HTMLElement>("button, input, select, textarea, [role='tab']") ?? [])].filter((item) => !item.hasAttribute("disabled"));
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (document.querySelector(".okr-edit")) { cancelEdit.current(); return; }
        document.getElementById(`okr-card-${okr.id}`)?.focus();
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
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [okr.id]);

  function close() {
    document.getElementById(`okr-card-${okr.id}`)?.focus();
    closeRef.current();
  }

  const ratio = okrRatio(okr);
  const status = PACE[okrPace(okr, today)];
  const accent = PROJECT_ACCENTS[okr.projectId] ?? "#23358E";
  const phase = phaseByIndex(okr.phase);

  return createPortal(
    <div className="drawer-back" onMouseDown={(event) => { if (event.target === event.currentTarget && !removing) { if (document.querySelector(".okr-edit")) cancelEdit.current(); else close(); } }}>
      <motion.aside
        ref={panel}
        className="drawer okr-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="okr-detail-title"
        initial={reduced ? false : { x: 36 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ ["--pc" as string]: accent }}
      >
        <button type="button" className="okr-x okr-detail-x" aria-label="Fermer" onClick={() => { if (editing) cancelEdit.current(); else close(); }}><X size={18} aria-hidden /></button>
        {editing ? (
          <EditForm okr={okr} projects={projects} onCancel={() => onEdit(false)} onSaved={onSaved} onBindCancel={(handler) => { cancelEdit.current = handler; }} />
        ) : (
          <>
            <header className="okr-detail-head">
              <div className="okr-detail-brand">
                <span className="logo-plate okr-logo"><Logo src={PROJECT_LOGOS[okr.projectId] ?? ""} alt="" height={okr.projectId === "rpm" ? 28 : okr.projectId === "triage" ? 16 : 22} /></span>
                <span className="okr-phase-pill" style={{ background: phase.color, color: phase.on }}>{phase.name}</span>
              </div>
              <h2 id="okr-detail-title" className="text-h2">{okr.title}</h2>
              <div className="okr-hero-progress">
                <strong className="num okr-hero-pct">{formatPercent(ratio)}</strong>
                <div className="dash-meter" role="img" aria-label={formatPercent(ratio)}><span style={{ width: `${Math.round(ratio * 100)}%`, background: accent }} /></div>
                <span className={`fiche-badge fiche-badge-${status.tone}`}>{status.label}</span>
              </div>
              <p className="text-small text-muted">{okr.recent} action{okr.recent > 1 ? "s" : ""} sur 7 jours{okr.due ? ` · Échéance : ${formatDay(okr.due)}` : " · sans échéance"}</p>
            </header>
            <Tabs
              label="Sections de l'objectif"
              value={tab}
              onChange={setTab}
              items={[
                { id: "overview", label: "Aperçu", icon: <Folder size={15} /> },
                { id: "krs", label: "Résultats clés", icon: <Target size={15} /> },
                { id: "actions", label: "Actions", icon: <ListChecks size={15} /> },
                { id: "history", label: "Historique", icon: <History size={15} /> },
              ]}
            />
            <div className="okr-detail-scroll">
              {tab === "overview" ? <Overview okr={okr} today={today} accent={accent} /> : null}
              {tab === "krs" ? <KeyResults okr={okr} onCurrent={onCurrent} /> : null}
              {tab === "actions" ? <Actions okr={okr} /> : null}
              {tab === "history" ? <HistoryList okr={okr} /> : null}
            </div>
            <footer className="okr-detail-foot">
              <button type="button" className="btn btn-primary" onClick={() => onEdit(true)}><Pencil size={16} aria-hidden /> Modifier l&apos;objectif</button>
              <button type="button" className="okr-delete" onClick={() => setConfirming(true)}><Trash2 size={16} aria-hidden /> Supprimer</button>
            </footer>
          </>
        )}
        {confirming ? (
          <div className="okr-confirm" role="alertdialog" aria-labelledby="okr-delete-title">
            <h3 id="okr-delete-title" className="text-h3">Supprimer cet objectif ?</h3>
            <p className="text-small text-muted">Il sera envoyé dans la corbeille. Vous pourrez le restaurer.</p>
            <div className="okr-detail-foot">
              <button type="button" className="btn" disabled={removing} onClick={() => setConfirming(false)}>Annuler</button>
              <button type="button" className="btn btn-primary" disabled={removing} onClick={() => {
                setRemoving(true);
                void softDelete("okr", okr.id).then((result) => {
                  setRemoving(false);
                  if (!result.ok) { toast.error(result.error); return; }
                  toast.success("Objectif envoyé dans la corbeille");
                  onDeleted();
                });
              }}>{removing ? "Suppression…" : "Confirmer"}</button>
            </div>
          </div>
        ) : null}
      </motion.aside>
    </div>,
    document.body,
  );
}

function Overview({ okr, today, accent }: { okr: OkrCard; today: string; accent: string }) {
  const ratio = okrRatio(okr);
  const status = PACE[okrPace(okr, today)];
  return (
    <div className="okr-detail-stack">
      <section>
        <h3 className="okr-section-title">Informations générales</h3>
        <div className="okr-facts">
          <Fact icon={<Folder size={15} />} label="Projet" value={okr.projectName} />
          <Fact icon={<Target size={15} />} label="Phase" value={phaseByIndex(okr.phase).name} />
          <Fact icon={<BadgeCheck size={15} />} label="Statut" value={status.label} />
          <Fact icon={<Calendar size={15} />} label="Échéance" value={okr.due ? formatDay(okr.due) : "Sans échéance"} />
        </div>
      </section>
      <section className="okr-note">
        <h3 className="okr-section-title">Description</h3>
        <p className="text-small text-muted">Aucune description enregistrée.</p>
      </section>
      <section className="okr-progress-block">
        <div className="okr-detail-score">
          <h3 className="okr-section-title">Progression de l&apos;objectif</h3>
          <strong className="num">{formatPercent(ratio)}</strong>
        </div>
        <div className="dash-meter" role="img" aria-label={formatPercent(ratio)}><span style={{ width: `${Math.round(ratio * 100)}%`, background: accent }} /></div>
        <p className="text-small text-muted">Calculée sur {okr.keyResults.length} résultat{okr.keyResults.length > 1 ? "s" : ""} clé{okr.keyResults.length > 1 ? "s" : ""}.</p>
      </section>
    </div>
  );
}

function KeyResults({ okr, onCurrent }: { okr: OkrCard; onCurrent: (okrId: string, krId: string, current: number) => void }) {
  if (!okr.keyResults.length) return <Empty text="Aucun résultat clé pour cet objectif." />;
  return (
    <div className="okr-detail-stack">
      {okr.keyResults.map((kr) => {
        const ratio = krRatio(kr);
        const pace = paceText(okr.due, kr);
        return (
          <article key={kr.id} className="okr-kr-line">
            <p className="okr-kr-label">{kr.label}</p>
            <div className="okr-kr-metrics">
              <CurrentField key={`${kr.id}-${kr.current}`} okrId={okr.id} krId={kr.id} current={kr.current} onSaved={(value) => onCurrent(okr.id, kr.id, value)} />
              <p><span>Objectif</span><strong className="num">{nf.format(kr.target)} {kr.unit}</strong></p>
              <p><span>Progression</span><strong className="num">{formatPercent(ratio)}</strong></p>
            </div>
            <div className="dash-meter okr-meter-thin" aria-hidden><span style={{ width: `${Math.round(ratio * 100)}%`, background: "var(--pc, #23358E)" }} /></div>
            {pace ? <p className={`text-small ${pace.startsWith("Échéance") ? "text-crit" : "text-muted"}`}>{pace}</p> : null}
          </article>
        );
      })}
    </div>
  );
}

function Actions({ okr }: { okr: OkrCard }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  function create(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    void saveTask({
      title: title.trim(), projectId: okr.projectId, phase: okr.phase, okrId: okr.id,
      assigneeId: null, due: null, date: null, status: "todo", priority: null, blocker: null,
    }).then((result) => {
      setPending(false);
      if (!result.ok) { toast.error(result.error); return; }
      setTitle("");
      setAdding(false);
      toast.success("Action ajoutée");
      router.refresh();
    });
  }
  return (
    <div className="okr-detail-stack">
      <div className="okr-action-head">
        <h3 className="okr-section-title">Actions liées ({okr.tasks.length})</h3>
        <button type="button" className="btn btn-primary" onClick={() => setAdding((value) => !value)}><Plus size={15} aria-hidden /> Ajouter une action</button>
      </div>
      {adding ? (
        <form className="okr-action-create" onSubmit={create}>
          <label className="field"><span>Titre de l&apos;action</span><input className="control" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} /></label>
          <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Ajout…" : "Ajouter"}</button>
        </form>
      ) : null}
      {okr.tasks.length ? okr.tasks.map((task) => {
        const status = TASK[task.status];
        const open = openId === task.id;
        return (
          <article key={task.id} className="okr-action">
            <button type="button" className="okr-action-main" onClick={() => setOpenId(open ? null : task.id)}>
              <span>
                <strong>{task.title}</strong>
                <em>{task.assignee ?? "Non assignée"}{task.due ? ` · ${formatDay(task.due)}` : ""}</em>
              </span>
              <span className={`fiche-badge fiche-badge-${status.tone}`}>{status.label}</span>
            </button>
            <details className="okr-menu">
              <summary aria-label={`Menu de ${task.title}`}><MoreHorizontal size={16} aria-hidden /></summary>
              <Link href="/taches">Voir dans les tâches</Link>
            </details>
            {open ? <p className="text-small text-muted">Cette action est une tâche liée à l&apos;objectif. Son suivi détaillé se fait dans les tâches, sans dupliquer la fiche.</p> : null}
          </article>
        );
      }) : <Empty text="Aucune action liée à cet objectif." />}
    </div>
  );
}

function HistoryList({ okr }: { okr: OkrCard }) {
  if (!okr.history.length) return <Empty text="Aucun événement enregistré pour cet objectif." />;
  return (
    <ol className="okr-timeline">
      {okr.history.map((entry) => {
        const kr = okr.keyResults.find((item) => item.id === entry.field);
        const tone = entry.field === "deletedAt" ? "alert" : kr ? "green" : entry.field === "title" ? "blue" : "warm";
        const label = entry.field === "title" ? "Objectif enregistré" : entry.field === "deletedAt" ? "Corbeille" : kr ? "Valeur modifiée" : "Modification";
        return (
          <li key={entry.id} className={`okr-time okr-time-${tone}`}>
            <span className="okr-time-dot" aria-hidden />
            <div>
              <p className="okr-time-title">{label}</p>
              <p className="text-small">{kr ? kr.label : entry.after ?? "Mise à jour"}</p>
              {entry.before || entry.after ? <p className="num text-small">{entry.before ?? "—"} → {entry.after ?? "—"}</p> : null}
              <p className="text-small text-muted">{entry.actor ?? "Journal"} · {when.format(new Date(entry.at))}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function EditForm({ okr, projects, onCancel, onSaved, onBindCancel }: { okr: OkrCard; projects: Array<{ id: string; name: string }>; onCancel: () => void; onSaved: (okr: OkrCard) => void; onBindCancel: (handler: () => void) => void }) {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState<EditTab>("info");
  const [title, setTitle] = useState(okr.title);
  const [projectId, setProjectId] = useState(okr.projectId);
  const [phase, setPhase] = useState(okr.phase);
  const [due, setDue] = useState(okr.due ?? "");
  const [rows, setRows] = useState(okr.keyResults);
  const [dropId, setDropId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [leave, setLeave] = useState(false);
  const projectName = projects.find((project) => project.id === projectId)?.name ?? okr.projectName;
  const dirty = title !== okr.title || projectId !== okr.projectId || phase !== okr.phase || due !== (okr.due ?? "") || JSON.stringify(rows) !== JSON.stringify(okr.keyResults);
  function requestClose() {
    if (dirty) { setLeave(true); return; }
    onCancel();
  }
  useEffect(() => { onBindCancel(requestClose); });

  function submit(event: FormEvent) {
    event.preventDefault();
    const keyResults = rows.filter((row) => row.label.trim());
    if (!title.trim()) { setError("Indiquez le titre de l'objectif."); setTab("info"); return; }
    if (keyResults.some((row) => !Number.isFinite(row.current) || !Number.isFinite(row.target))) { setError("Les valeurs doivent être des nombres."); setTab("krs"); return; }
    setPending(true);
    setError("");
    const next: OkrCard = { ...okr, title: title.trim(), projectId, projectName, phase, due: due || null, keyResults };
    void saveOkr({ id: okr.id, projectId, phase, title: title.trim(), due: due || null, keyResults }).then((result) => {
      setPending(false);
      if (!result.ok) { setError(result.error); toast.error(result.error); return; }
      toast.success("Modifications enregistrées");
      onSaved(next);
    }).catch(() => {
      setPending(false);
      setError("Enregistrement impossible.");
      toast.error("Enregistrement impossible.");
    });
  }

  return (
    <form className="okr-edit" onSubmit={submit}>
      <header className="okr-detail-head">
        <h2 id="okr-detail-title" className="text-h2">Modifier l&apos;objectif</h2>
        <p className="text-small text-muted">{projectName} · {phaseByIndex(phase).name}</p>
      </header>
      <Tabs
        label="Sections du formulaire"
        value={tab}
        onChange={setTab}
        items={[
          { id: "info", label: "Informations", icon: <Folder size={15} /> },
          { id: "krs", label: "Résultats clés", icon: <Target size={15} /> },
          { id: "actions", label: "Actions", icon: <ListChecks size={15} /> },
        ]}
      />
      <div className="okr-detail-scroll">
        {tab === "info" ? (
          <div className="okr-detail-stack">
            <label className="field"><span>Titre de l&apos;objectif</span><GrowText value={title} maxLength={160} onChange={setTitle} /></label>
            <div className="okr-edit-grid">
              <label className="field"><span>Projet</span>
                <select className="control" value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
              </label>
              <label className="field"><span>Phase</span>
                <select className="control" value={phase} onChange={(event) => setPhase(Number(event.target.value))}>{PHASES.map((item) => <option key={item.index} value={item.index}>{item.name}</option>)}</select>
              </label>
              <label className="field"><span>Échéance</span><input className="control" type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
            </div>
          </div>
        ) : null}
        {tab === "krs" ? (
          <div className="okr-detail-stack">
            {rows.map((row, index) => (
              <motion.article key={row.id} className="okr-kr-edit" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <header className="okr-detail-score">
                  <h3 className="text-h3">Résultat clé {String(index + 1).padStart(2, "0")}</h3>
                  <button type="button" className="okr-trash" aria-label={`Retirer le résultat clé ${index + 1}`} onClick={() => setDropId(row.id)}><Trash2 size={16} aria-hidden /></button>
                </header>
                <label className="field"><span>Description</span><GrowText id={`kr-desc-${row.id}`} value={row.label} maxLength={240} onChange={(value) => setRows(rows.map((item, i) => i === index ? { ...item, label: value } : item))} /></label>
                <div className="okr-edit-grid">
                  <label className="field"><span>Valeur actuelle</span><input className="control" type="number" inputMode="decimal" step="any" value={row.current} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, current: Number(event.target.value) } : item))} /></label>
                  <label className="field"><span>Objectif</span><input className="control" type="number" inputMode="decimal" step="any" value={row.target} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, target: Number(event.target.value) } : item))} /></label>
                  <label className="field"><span>Unité</span><input className="control" value={row.unit} maxLength={40} onChange={(event) => setRows(rows.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} /></label>
                </div>
                <p className="text-small text-muted">Progression {formatPercent(krRatio(row))}</p>
                <div className="dash-meter okr-meter-thin" aria-hidden><span style={{ width: `${Math.round(krRatio(row) * 100)}%`, background: "var(--pc, #23358E)" }} /></div>
                {dropId === row.id ? (
                  <div className="okr-drop">
                    <p className="text-small">Retirer ce résultat clé ?</p>
                    <button type="button" className="btn" onClick={() => setDropId(null)}>Annuler</button>
                    <button type="button" className="okr-delete" onClick={() => { setRows(rows.filter((item) => item.id !== row.id)); setDropId(null); }}>Retirer</button>
                  </div>
                ) : null}
              </motion.article>
            ))}
            <button type="button" className="btn btn-primary okr-add-solid" onClick={() => {
              const id = `kr${Date.now().toString(36)}`;
              setRows([...rows, { id, label: "", target: 100, current: 0, unit: "%" }]);
              window.setTimeout(() => document.getElementById(`kr-desc-${id}`)?.focus(), 30);
            }}><Plus size={16} aria-hidden /> Ajouter un résultat clé</button>
          </div>
        ) : null}
        {tab === "actions" ? (
          <div className="okr-detail-stack">
            <p className="text-small text-muted">Ces actions sont les tâches déjà liées à l&apos;objectif. Elles se modifient depuis les tâches.</p>
            <Actions okr={okr} />
          </div>
        ) : null}
        {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
      </div>
      {leave ? (
        <div className="okr-leave" role="alertdialog" aria-labelledby="okr-leave-title">
          <p id="okr-leave-title">Abandonner les modifications non enregistrées ?</p>
          <button type="button" className="btn" onClick={() => setLeave(false)}>Continuer</button>
          <button type="button" className="btn btn-primary" onClick={onCancel}>Abandonner</button>
        </div>
      ) : null}
      <footer className="okr-detail-foot">
        <button type="button" className="btn okr-cancel" disabled={pending} onClick={requestClose}>Annuler</button>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? <><Loader2 className="okr-spin" size={16} aria-hidden /> Enregistrement…</> : "Enregistrer les modifications"}</button>
      </footer>
    </form>
  );
}

function Tabs<T extends string>({ label, value, onChange, items }: { label: string; value: T; onChange: (value: T) => void; items: Array<{ id: T; label: string; icon: ReactNode }> }) {
  return (
    <div className="okr-tabs" role="tablist" aria-label={label} onKeyDown={(event) => {
      const index = items.findIndex((item) => item.id === value);
      const next = event.key === "ArrowRight" ? (index + 1) % items.length : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length : -1;
      if (next < 0) return;
      event.preventDefault();
      onChange(items[next].id);
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>
      {items.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)}>{item.icon} {item.label}</button>
      ))}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <p className="okr-fact">{icon}<span>{label}</span><strong>{value}</strong></p>;
}

function Empty({ text }: { text: string }) {
  return <p className="okr-empty-line">{text}</p>;
}

function GrowText({ id, value, onChange, maxLength }: { id?: string; value: string; onChange: (value: string) => void; maxLength: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const field = ref.current;
    if (!field) return;
    field.style.height = "auto";
    field.style.height = `${field.scrollHeight}px`;
  }, [value]);
  return <textarea id={id} ref={ref} className="control" rows={2} value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} />;
}

function CurrentField({ okrId, krId, current, onSaved }: { okrId: string; krId: string; current: number; onSaved: (value: number) => void }) {
  const [value, setValue] = useState(String(current));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  function commit() {
    if (value.trim() === "" || !Number.isFinite(Number(value))) { setState("error"); return; }
    const next = Number(value);
    if (next === current) { setState("idle"); return; }
    setState("saving");
    void setKeyResultCurrent(okrId, krId, next).then((result) => {
      if (!result.ok) { setState("error"); toast.error(result.error); return; }
      setState("saved");
      toast.success("Enregistré");
      onSaved(next);
    }).catch(() => { setState("error"); toast.error("Enregistrement impossible."); });
  }
  return (
    <label className="okr-current">
      <span>Valeur actuelle</span>
      <input className={`control ${state === "saved" ? "is-saved" : ""} ${state === "error" ? "is-error" : ""}`} type="number" inputMode="decimal" step="any" value={value} aria-label="Valeur actuelle" disabled={state === "saving"} onChange={(event) => setValue(event.target.value)} onBlur={commit} />
    </label>
  );
}
