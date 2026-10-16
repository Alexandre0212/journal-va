"use client";

import NumberFlow from "@number-flow/react";
import { Calendar, Car, CheckSquare, FileText, Info, LineChart, RotateCcw, Search, Target, Trash2, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { filterTrashRows, isRestorable, TRASH_KIND_LABEL, trashHeadline, type TrashKind, type TrashRow } from "@/domain/trash";
import { formatDay } from "@/lib/dates";
import { purgeTrashItem, restoreItem } from "@/server/actions";

const ICONS: Record<TrashKind, LucideIcon> = {
  task: CheckSquare,
  okr: Target,
  kpi: LineChart,
  info: FileText,
  course: Car,
};

export function TrashBoard({ rows }: { rows: TrashRow[] }) {
  const router = useRouter();
  const searchId = useId();
  const [source, setSource] = useState(rows);
  const [items, setItems] = useState(rows);
  const [text, setText] = useState("");
  const [entity, setEntity] = useState<TrashKind | "all">("all");
  const [project, setProject] = useState("all");
  const [day, setDay] = useState("all");
  const [confirm, setConfirm] = useState<TrashRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  if (source !== rows) {
    setSource(rows);
    setItems(rows);
  }

  const ready = items.filter((row) => isRestorable(new Date(row.deletedAt), new Date())).length;
  const visible = filterTrashRows(items, { text, entity, project, day });
  const projects = [...new Set(items.map((row) => row.project).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b, "fr"));
  const days = [...new Set(items.map((row) => row.deletedDay))].sort((a, b) => b.localeCompare(a));
  const hasUnassigned = items.some((row) => row.project === null);

  function drop(row: TrashRow) {
    setItems((current) => current.filter((item) => item.id !== row.id || item.entity !== row.entity));
    router.refresh();
  }

  return (
    <div className="trash-page">
      <header className="mast">
        <p className="text-caption text-accent-text">Studio</p>
        <h1 className="text-h1">Corbeille</h1>
        <p className="text-small text-muted">{trashHeadline(items.length)}</p>
        <span className="mast-rule" />
      </header>

      <section className="trash-stats" aria-label="Synthèse de la corbeille">
        <article className="trash-stat trash-stat-blue">
          <span className="trash-stat-icon" aria-hidden="true"><Trash2 size={18} /></span>
          <div>
            <p>Éléments supprimés</p>
            <strong><NumberFlow value={items.length} /></strong>
          </div>
        </article>
        <article className="trash-stat trash-stat-green">
          <span className="trash-stat-icon" aria-hidden="true"><RotateCcw size={18} /></span>
          <div>
            <p>Prêts à restaurer</p>
            <strong><NumberFlow value={ready} /></strong>
          </div>
        </article>
        <article className="trash-stat trash-stat-warm">
          <span className="trash-stat-icon" aria-hidden="true"><Calendar size={18} /></span>
          <div>
            <p>Suppression définitive</p>
            <strong>30 jours</strong>
          </div>
        </article>
      </section>

      {items.length === 0 ? <EmptyTrash /> : (
        <>
          <div className="trash-tools">
            <label className="board-search-wrap" htmlFor={searchId}>
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">Rechercher</span>
              <input id={searchId} className="control board-search" value={text} placeholder="Rechercher un élément supprimé..." onChange={(event) => setText(event.target.value)} />
            </label>
            <label className="field">
              <span>Type d'élément</span>
              <select className="control" value={entity} onChange={(event) => setEntity(event.target.value as TrashKind | "all")}>
                <option value="all">Tous les types</option>
                {(Object.keys(TRASH_KIND_LABEL) as TrashKind[]).map((kind) => <option key={kind} value={kind}>{TRASH_KIND_LABEL[kind]}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Projet</span>
              <select className="control" value={project} onChange={(event) => setProject(event.target.value)}>
                <option value="all">Tous les projets</option>
                {projects.map((name) => <option key={name} value={name}>{name}</option>)}
                {hasUnassigned ? <option value="__none__">Sans projet</option> : null}
              </select>
            </label>
            <label className="field">
              <span>Date de suppression</span>
              <select className="control" value={day} onChange={(event) => setDay(event.target.value)}>
                <option value="all">Toutes les dates</option>
                {days.map((value) => <option key={value} value={value}>{formatDay(value)}</option>)}
              </select>
            </label>
          </div>
          {visible.length === 0 ? <p className="trash-none">Aucun élément ne correspond à cette recherche.</p> : (
            <ul className="trash-list">
              {visible.map((row) => {
                const Icon = ICONS[row.entity];
                const key = `${row.entity}-${row.id}`;
                return (
                  <li key={key} className="trash-card">
                    <span className="trash-mark" aria-hidden="true"><Icon size={18} /></span>
                    <div className="trash-copy">
                      <p>{row.title}</p>
                      <div className="trash-meta">
                        <em>{TRASH_KIND_LABEL[row.entity]}</em>
                        {row.project ? <span>{row.project}</span> : null}
                        <span>Supprimé le {formatDay(row.deletedDay)}</span>
                        <span>Jusqu'au {formatDay(row.deadlineDay)}</span>
                        {row.author ? <span>par {row.author}</span> : null}
                      </div>
                    </div>
                    <div className="trash-actions">
                      <button type="button" className="btn btn-primary trash-restore" disabled={busy === key} onClick={() => {
                        setBusy(key);
                        void restoreItem(row.entity, row.id).then((result) => {
                          setBusy(null);
                          if (!result.ok) {
                            toast.error(result.error);
                            if (result.error.includes("30 jours") || result.error.includes("introuvable")) drop(row);
                            return;
                          }
                          toast.success("Élément restauré avec succès.");
                          drop(row);
                        }).catch(() => { setBusy(null); toast.error("Restauration impossible pour le moment."); });
                      }}>{busy === key ? "Restauration…" : "Restaurer"}</button>
                      <button type="button" className="btn trash-danger" disabled={busy !== null} onClick={() => setConfirm(row)}>Supprimer définitivement</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      {confirm ? <ConfirmPurge row={confirm} onClose={() => setConfirm(null)} onDone={() => { const row = confirm; setConfirm(null); drop(row); }} /> : null}
    </div>
  );
}

function EmptyTrash() {
  return (
    <section className="trash-empty">
      <TrashArt />
      <h2>La corbeille est vide</h2>
      <p>Les éléments supprimés apparaîtront ici et pourront être restaurés avant suppression définitive.</p>
      <aside className="trash-note">
        <span className="trash-note-icon" aria-hidden="true"><Info size={16} /></span>
        <div>
          <strong>Les éléments restent disponibles pendant 30 jours</strong>
          <p>Passé ce délai, ils seront automatiquement et définitivement supprimés.</p>
        </div>
      </aside>
    </section>
  );
}

function TrashArt() {
  return (
    <svg className="trash-art" viewBox="0 0 280 168" role="img" aria-label="Corbeille vide">
      <circle className="blob" cx="146" cy="86" r="58" />
      <circle className="blob blob-soft" cx="196" cy="62" r="26" />
      <g className="paper paper-left">
        <rect x="52" y="48" width="54" height="66" rx="7" transform="rotate(-16 79 81)" />
        <path d="M62 70 h28 M62 80 h20" transform="rotate(-16 79 81)" />
      </g>
      <g className="paper paper-right">
        <rect x="176" y="44" width="48" height="58" rx="7" transform="rotate(14 200 73)" />
        <path d="M186 62 h28 M186 72 h18" transform="rotate(14 200 73)" />
      </g>
      <g className="bin">
        <rect x="128" y="52" width="26" height="7" rx="3" />
        <rect x="112" y="60" width="58" height="8" rx="3" />
        <path d="M118 72 h46 l-5 50 a6 6 0 0 1 -6 5 h-24 a6 6 0 0 1 -6 -5 z" />
        <path className="slot" d="M132 80 v36 M141 80 v36 M150 80 v36" />
      </g>
      <path className="spark" d="M214 38 l2.2 4.6 5 .6-3.7 3.4 1 4.9-4.5-2.5-4.5 2.5 1-4.9-3.7-3.4 5-.6 z" />
      <circle className="spark" cx="78" cy="42" r="3.5" />
    </svg>
  );
}

function ConfirmPurge({ row, onClose, onDone }: { row: TrashRow; onClose: () => void; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape" && !pending) onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);
  return createPortal(
    <div className="modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
      <div className="sheet trash-dialog" role="alertdialog" aria-modal="true" aria-labelledby="trash-confirm-title" aria-describedby="trash-confirm-copy">
        <h2 id="trash-confirm-title" className="text-h2">Supprimer définitivement cet élément ?</h2>
        <p id="trash-confirm-copy" className="text-small text-muted">Cette action est irréversible. L'élément ne pourra plus être restauré.</p>
        <p className="trash-dialog-title">{row.title}</p>
        {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
        <footer className="trash-dialog-foot">
          <button type="button" className="btn" disabled={pending} onClick={onClose}>Annuler</button>
          <button type="button" className="btn trash-confirm" disabled={pending} onClick={() => {
            setPending(true);
            void purgeTrashItem(row.entity, row.id).then((result) => {
              setPending(false);
              if (!result.ok) { setError(result.error); toast.error(result.error); return; }
              toast.success("Élément supprimé définitivement.");
              onDone();
            }).catch(() => { setPending(false); setError("Suppression impossible pour le moment."); });
          }}>{pending ? "Suppression…" : "Supprimer définitivement"}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
