"use client";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TraversalOrder, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { AlertTriangle, ArrowRight, Calendar, Check, Clock, Download, Eye, FileText, FolderKanban, LayoutGrid, List, MessageSquare, MoreHorizontal, Paperclip, Pencil, Plus, Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { anomalyBoardCounts, type AnomalySeverity, type AnomalyStatus } from "@/domain/anomalies";
import { PROJECT_LOGOS } from "@/domain/phases";
import { formatDay, formatTime } from "@/lib/dates";
import { addAnomalyComment, assignAnomaly, saveAnomaly, setAnomalyStatus, updateAnomaly } from "@/server/actions";

export type AnomalyItem = {
  id: string;
  projectId: string;
  date: string;
  createdAt: string;
  text: string;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  author: string | null;
  assigneeId: string | null;
  assignee: string | null;
  file: { name: string | null; mimeType: string | null; unavailable: boolean } | null;
  comments: Array<{ id: string; body: string; at: string; author: string }>;
  revisedAt: string | null;
};

type Person = { id: string; name: string };
type ProjectOption = { id: string; name: string; enabled: boolean };

const SEVERITY = {
  minor: { label: "Mineure", tone: "idle" },
  major: { label: "Majeure", tone: "progress" },
  blocking: { label: "Critique", tone: "late" },
} as const;

const STATUS = {
  open: { label: "Ouverte", tone: "late" },
  progress: { label: "En cours", tone: "progress" },
  resolved: { label: "Résolue", tone: "good" },
} as const;

const COLUMNS: Array<{ id: AnomalyStatus; label: string }> = [
  { id: "open", label: "Ouvertes" },
  { id: "progress", label: "En cours" },
  { id: "resolved", label: "Résolues" },
];

const STATUS_NOTE = {
  open: "Anomalie ouverte",
  progress: "Anomalie marquée en cours",
  resolved: "Anomalie marquée résolue",
} as const;

export function AnomaliesBoard({
  anomalies, projects, users, actor, today,
}: {
  anomalies: AnomalyItem[];
  projects: ProjectOption[];
  users: Person[];
  actor: Person;
  today: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState(anomalies);
  const [synced, setSynced] = useState(anomalies);
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"list" | "kanban">("list");
  const [selectedId, setSelectedId] = useState(anomalies[0]?.id ?? "");
  const [narrow, setNarrow] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const names = new Map(projects.map((project) => [project.id, project.name]));
  const counts = anomalyBoardCounts(items);
  const filtered = items.filter((item) => matches(item, { query, projectId, severity, status, names }));
  const selected = items.find((item) => item.id === selectedId) ?? null;
  const selectedVisible = Boolean(selected && filtered.some((item) => item.id === selected.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  if (synced !== anomalies) {
    const fresh = anomalies.find((item) => !synced.some((old) => old.id === item.id));
    setSynced(anomalies);
    setItems(anomalies);
    if (fresh) setSelectedId(fresh.id);
  }

  function choose(id: string) {
    setSelectedId(id);
    if (narrow) setSheet(true);
  }

  function changeStatus(id: string, next: AnomalyStatus) {
    const previous = items;
    const current = previous.find((item) => item.id === id);
    if (!current || current.status === next) return;
    setItems(previous.map((item) => item.id === id ? { ...item, status: next } : item));
    void setAnomalyStatus(id, next).then((result) => {
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
        return;
      }
      toast.success(STATUS_NOTE[next]);
      router.refresh();
    });
  }

  function onDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const next = event.over?.id;
    if (next === "open" || next === "progress" || next === "resolved") changeStatus(String(event.active.id), next);
  }

  const dragging = items.find((item) => item.id === draggingId) ?? null;
  const editing = items.find((item) => item.id === editingId) ?? null;

  return (
    <div className="anom-page">
      <header className="task-mast">
        <div className="task-mast-copy">
          <p className="text-caption text-accent-text">Mesure</p>
          <h1 className="text-h1">Anomalies</h1>
          <p className="text-small text-muted">Priorisez et résolvez les incidents signalés sur vos projets.</p>
          <span className="mast-rule" />
        </div>
        <button type="button" className="btn anom-create" onClick={() => setCreating(true)}><Plus size={16} aria-hidden /> Signaler une anomalie</button>
      </header>

      <section className="anom-stats" aria-label="Synthèse des anomalies">
        <Metric tint="#B42318" wash="#FDECEC" icon={<AlertTriangle size={18} />} label="Ouvertes" value={counts.open} detail="Incidents en attente de traitement" pressed={status === "open"} onClick={() => setStatus(status === "open" ? "" : "open")} />
        <Metric tint="#E79409" wash="#FFF6E6" icon={<Clock size={18} />} label="En cours" value={counts.progress} detail="En cours d'analyse ou de résolution" pressed={status === "progress"} onClick={() => setStatus(status === "progress" ? "" : "progress")} />
        <Metric tint="#1F7A45" wash="#E7F6EE" icon={<Check size={18} />} label="Résolues" value={counts.resolved} detail="Incidents traités avec succès" pressed={status === "resolved"} onClick={() => setStatus(status === "resolved" ? "" : "resolved")} />
      </section>

      <div className="anom-tools">
        <label className="board-search-wrap">
          <Search size={16} aria-hidden />
          <input className="control board-search" placeholder="Rechercher une anomalie..." value={query} aria-label="Rechercher une anomalie" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="control" aria-label="Filtrer par projet" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Tous les projets</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select className="control" aria-label="Filtrer par sévérité" value={severity} onChange={(event) => setSeverity(event.target.value)}>
          <option value="">Toutes</option>
          <option value="blocking">Critique</option>
          <option value="major">Majeure</option>
          <option value="minor">Mineure</option>
        </select>
        <select className="control" aria-label="Filtrer par statut" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Tous</option>
          <option value="open">Ouverte</option>
          <option value="progress">En cours</option>
          <option value="resolved">Résolue</option>
        </select>
        <div className="anom-views" role="group" aria-label="Mode d'affichage">
          <button type="button" className={`anom-view ${view === "list" ? "is-on" : ""}`} aria-pressed={view === "list"} onClick={() => setView("list")}><List size={15} aria-hidden /> Liste</button>
          <button type="button" className={`anom-view ${view === "kanban" ? "is-on" : ""}`} aria-pressed={view === "kanban"} onClick={() => setView("kanban")}><LayoutGrid size={15} aria-hidden /> Kanban</button>
        </div>
      </div>

      <div className={`anom-stage ${view === "kanban" ? "is-kanban" : ""}`}>
        <div className="anom-rail" aria-label={view === "list" ? "Liste des anomalies" : "Tableau des anomalies"}>
          {filtered.length === 0 ? (
            <p className="anom-empty">{items.length ? "Aucune anomalie ne correspond à ces critères." : "Aucune anomalie notée."}</p>
          ) : view === "list" ? (
            filtered.map((item) => (
              <IncidentRow key={item.id} item={item} projectName={names.get(item.projectId) ?? item.projectId} selected={item.id === selected?.id} onOpen={() => choose(item.id)} />
            ))
          ) : (
            <DndContext id="anomalies" sensors={sensors} autoScroll={{ order: TraversalOrder.ReversedTreeOrder }} onDragStart={onDragStart} onDragCancel={() => setDraggingId(null)} onDragEnd={onDragEnd}>
              <div className="anom-kanban">
                {COLUMNS.map((column) => (
                  <KanbanColumn key={column.id} id={column.id} label={column.label}>
                    {filtered.filter((item) => item.status === column.id).map((item) => (
                      <KanbanCard key={item.id} item={item} projectName={names.get(item.projectId) ?? item.projectId} selected={item.id === selected?.id} onOpen={() => choose(item.id)} />
                    ))}
                  </KanbanColumn>
                ))}
              </div>
              <DragOverlay dropAnimation={null} zIndex={80}>
                {dragging ? <KanbanFace item={dragging} projectName={names.get(dragging.projectId) ?? dragging.projectId} overlay /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
        {selected && !narrow ? (
          <Detail
            key={selected.id}
            item={selected}
            projectName={names.get(selected.projectId) ?? selected.projectId}
            users={users}
            actor={actor}
            hidden={!selectedVisible}
            onEdit={() => setEditingId(selected.id)}
            onStatus={(next) => changeStatus(selected.id, next)}
            onAssigned={(assigneeId, assignee) => {
              const previous = items;
              setItems(previous.map((item) => item.id === selected.id ? { ...item, assigneeId, assignee } : item));
              void assignAnomaly(selected.id, assigneeId).then((result) => {
                if (!result.ok) { setItems(previous); toast.error(result.error); return; }
                toast.success(assigneeId ? "Responsable enregistré" : "Assignation retirée");
                router.refresh();
              });
            }}
            onComment={(body) => addAnomalyComment(selected.id, body).then((result) => {
              if (!result.ok) { toast.error(result.error); return false; }
              setItems(items.map((item) => item.id === selected.id ? { ...item, comments: [...item.comments, { id: `local-${Date.now()}`, body, at: new Date().toISOString(), author: actor.name }] } : item));
              toast.success("Commentaire ajouté");
              router.refresh();
              return true;
            })}
          />
        ) : !narrow ? <p className="anom-empty anom-detail">Sélectionnez une anomalie pour afficher son détail.</p> : null}
      </div>

      {selected && narrow && sheet ? (
        <DetailSheet key={selected.id} item={selected} projectName={names.get(selected.projectId) ?? selected.projectId} users={users} actor={actor} hidden={!selectedVisible} onClose={() => setSheet(false)} onEdit={() => setEditingId(selected.id)} onStatus={(next) => changeStatus(selected.id, next)} onAssigned={(assigneeId, assignee) => {
          const previous = items;
          setItems(previous.map((item) => item.id === selected.id ? { ...item, assigneeId, assignee } : item));
          void assignAnomaly(selected.id, assigneeId).then((result) => {
            if (!result.ok) { setItems(previous); toast.error(result.error); return; }
            toast.success(assigneeId ? "Responsable enregistré" : "Assignation retirée");
            router.refresh();
          });
        }} onComment={(body) => addAnomalyComment(selected.id, body).then((result) => {
          if (!result.ok) { toast.error(result.error); return false; }
          setItems(items.map((item) => item.id === selected.id ? { ...item, comments: [...item.comments, { id: `local-${Date.now()}`, body, at: new Date().toISOString(), author: actor.name }] } : item));
          toast.success("Commentaire ajouté");
          router.refresh();
          return true;
        })} />
      ) : null}
      {creating ? <CreateDrawer projects={projects.filter((project) => project.enabled)} today={today} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); router.refresh(); }} /> : null}
      {editing ? (
        <EditDrawer
          key={editing.id}
          item={editing}
          projects={projects}
          users={users}
          onClose={() => setEditingId(null)}
          onSaved={(next) => {
            const following = items.map((item) => item.id === next.id ? next : item);
            setItems(following);
            setEditingId(null);
            toast.success("Anomalie modifiée avec succès.");
            if (!matches(next, { query, projectId, severity, status, names })) toast.message("Cette anomalie ne correspond plus aux filtres actifs.");
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function matches(item: AnomalyItem, filters: { query: string; projectId: string; severity: string; status: string; names: Map<string, string> }) {
  const needle = filters.query.trim().toLowerCase();
  const name = filters.names.get(item.projectId) ?? item.projectId;
  if (needle && !`${item.text} ${name} ${item.author ?? ""} ${item.assignee ?? ""}`.toLowerCase().includes(needle)) return false;
  if (filters.projectId && item.projectId !== filters.projectId) return false;
  if (filters.severity && item.severity !== filters.severity) return false;
  if (filters.status && item.status !== filters.status) return false;
  return true;
}

function Metric({ tint, wash, icon, label, value, detail, pressed, onClick }: { tint: string; wash: string; icon: ReactNode; label: string; value: number; detail: string; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`anom-metric ${pressed ? "is-on" : ""}`} style={{ ["--tint" as string]: tint, ["--wash" as string]: wash }} aria-pressed={pressed} onClick={onClick}>
      <span className="anom-metric-icon">{icon}</span>
      <span className="anom-metric-copy">
        <span className="anom-metric-line"><strong>{value}</strong> {label}</span>
        <span>{detail}</span>
      </span>
    </button>
  );
}

function IncidentRow({ item, projectName, selected, onOpen }: { item: AnomalyItem; projectName: string; selected: boolean; onOpen: () => void }) {
  return (
    <button type="button" className={`anom-row ${selected ? "is-on" : ""}`} aria-pressed={selected} onClick={onOpen}>
      <ProjectMark projectId={item.projectId} projectName={projectName} />
      <span className="anom-row-copy">
        <span className="anom-row-text">{item.text}</span>
        <span className="anom-row-meta">
          <span>{item.author ?? "Auteur non renseigné"}</span>
          <span>{formatDay(item.date)}</span>
          {item.file ? <span>1 pièce jointe</span> : null}
        </span>
      </span>
      <Badges item={item} />
      <ArrowRight size={16} aria-hidden />
    </button>
  );
}

function KanbanColumn({ id, label, children }: { id: AnomalyStatus; label: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={`anom-col ${isOver ? "is-over" : ""}`} aria-label={label}>
      <h2>{label}</h2>
      <div className="anom-col-list">{children}</div>
    </section>
  );
}

function KanbanCard({ item, projectName, selected, onOpen }: { item: AnomalyItem; projectName: string; selected: boolean; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <button ref={setNodeRef} type="button" className={`anom-kcard ${selected ? "is-on" : ""} ${isDragging ? "is-drag" : ""}`} onClick={onOpen} {...listeners} {...attributes}>
      <KanbanFace item={item} projectName={projectName} />
    </button>
  );
}

function KanbanFace({ item, projectName, overlay = false }: { item: AnomalyItem; projectName: string; overlay?: boolean }) {
  return (
    <span className={`anom-kface ${overlay ? "is-overlay" : ""}`}>
      <ProjectMark projectId={item.projectId} projectName={projectName} />
      <span className="anom-row-text">{item.text}</span>
      <Badges item={item} />
      <span className="anom-row-meta">
        {item.assignee ? <span>{item.assignee}</span> : null}
        <span>{formatDay(item.date)}</span>
        {item.file ? <span>1 pièce jointe</span> : null}
      </span>
    </span>
  );
}

function Detail({
  item, projectName, users, actor, hidden, onEdit, onStatus, onAssigned, onComment,
}: {
  item: AnomalyItem;
  projectName: string;
  users: Person[];
  actor: Person;
  hidden: boolean;
  onEdit: () => void;
  onStatus: (status: AnomalyStatus) => void;
  onAssigned: (assigneeId: string | null, assignee: string | null) => void;
  onComment: (body: string) => Promise<boolean>;
}) {
  const [menu, setMenu] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const commentRef = useRef<HTMLTextAreaElement>(null);

  function openComposer() {
    setComposing(true);
    setMenu(false);
    requestAnimationFrame(() => commentRef.current?.focus());
  }

  return (
    <aside className="anom-detail" aria-live="polite">
      <div className="anom-detail-body" key={item.id}>
        {hidden ? <p className="anom-note">Cette anomalie ne correspond plus aux filtres actifs. Son détail reste ouvert.</p> : null}
        <header className="anom-detail-head">
          <ProjectMark projectId={item.projectId} projectName={projectName} />
          <Badges item={item} />
          <button type="button" className="icon-btn anom-more" aria-label="Actions secondaires" aria-expanded={menu} onClick={() => setMenu((open) => !open)}><MoreHorizontal size={18} /></button>
          {menu ? (
            <div className="anom-menu" role="menu">
              {item.status !== "progress" ? <button type="button" role="menuitem" onClick={() => { setMenu(false); onStatus("progress"); }}>Marquer en cours</button> : null}
              {item.status !== "open" ? <button type="button" role="menuitem" onClick={() => { setMenu(false); onStatus("open"); }}>Remettre ouverte</button> : null}
              {item.status !== "resolved" ? <button type="button" role="menuitem" onClick={() => { setMenu(false); onStatus("resolved"); }}>Marquer résolue</button> : null}
            </div>
          ) : null}
        </header>
        <h2>{item.text}</h2>
        <div className="anom-facts">
          <p><Calendar size={15} aria-hidden /><span>Signalée le</span><strong>{formatDay(item.date, true)} · {formatTime(item.createdAt)}</strong></p>
          <p><UserRound size={15} aria-hidden /><span>Auteur</span><strong>{item.author ?? "Non renseigné"}</strong></p>
          <p><FolderKanban size={15} aria-hidden /><span>Projet</span><strong>{projectName}</strong></p>
          {item.assignee ? <p><UserRound size={15} aria-hidden /><span>Responsable</span><strong>{item.assignee}</strong></p> : null}
        </div>
        {item.revisedAt ? <p className="anom-revised">Dernière modification : {formatDay(item.revisedAt.slice(0, 10), true)} · {formatTime(item.revisedAt)}</p> : null}
        <section>
          <h3><FileText size={15} aria-hidden /> Description</h3>
          <p className="anom-prose">{item.text}</p>
        </section>
        <section>
          <h3><Paperclip size={15} aria-hidden /> Pièces jointes{item.file ? " (1)" : ""}</h3>
          {item.file ? <FileRow item={item} /> : <p className="text-small text-muted">Aucune pièce jointe.</p>}
        </section>
        <section>
          <h3><MessageSquare size={15} aria-hidden /> Commentaires{item.comments.length ? ` (${item.comments.length})` : ""}</h3>
          {item.comments.length ? (
            <ul className="anom-comments">
              {item.comments.map((comment) => (
                <li key={comment.id}>
                  <span className="anom-avatar" aria-hidden>{initials(comment.author)}</span>
                  <div>
                    <strong>{comment.author}</strong>
                    <em>{formatDay(comment.at.slice(0, 10))} · {formatTime(comment.at)}</em>
                    <p>{comment.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : <p className="text-small text-muted">Aucun commentaire.</p>}
          {composing ? (
            <form className="anom-composer" onSubmit={(event) => {
              event.preventDefault();
              const body = draft.trim();
              if (!body) return;
              setPending(true);
              void onComment(body).then((ok) => {
                setPending(false);
                if (ok) { setDraft(""); setComposing(false); }
              });
            }}>
              <label className="field">
                <span>Commentaire de {actor.name}</span>
                <textarea ref={commentRef} className="control" maxLength={1000} value={draft} onChange={(event) => setDraft(event.target.value)} />
              </label>
              <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Publier"}</button>
            </form>
          ) : null}
        </section>
      </div>
      <footer className="anom-actions">
        <button type="button" className="btn anom-quiet" onClick={() => { setAssigning(true); setMenu(false); }}><UserRound size={15} aria-hidden /> Assigner</button>
        <button type="button" className="btn anom-quiet" onClick={openComposer}><MessageSquare size={15} aria-hidden /> Ajouter un commentaire</button>
        <span className="anom-action-main">
          <button type="button" className="btn anom-edit" onClick={onEdit}><Pencil size={15} aria-hidden /> Modifier l&apos;anomalie</button>
          <button type="button" className="btn btn-primary anom-resolve" onClick={() => onStatus(item.status === "resolved" ? "open" : "resolved")}>
            <Check size={16} aria-hidden />
            {item.status === "resolved" ? "Rouvrir" : "Marquer comme résolue"}
          </button>
        </span>
      </footer>
      {assigning ? (
        <div className="anom-assign" role="dialog" aria-label="Assigner un responsable">
          <header>
            <strong>Assigner</strong>
            <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => setAssigning(false)}><X size={16} /></button>
          </header>
          {users.length ? (
            <ul>
              {users.map((member) => (
                <li key={member.id}>
                  <button type="button" aria-pressed={item.assigneeId === member.id} onClick={() => { onAssigned(member.id, member.name); setAssigning(false); }}>
                    <span className="anom-avatar" aria-hidden>{initials(member.name)}</span>
                    {member.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : <p>Aucun membre enregistré.</p>}
          {item.assigneeId ? <button type="button" className="btn anom-quiet" onClick={() => { onAssigned(null, null); setAssigning(false); }}>Retirer l&apos;assignation</button> : null}
        </div>
      ) : null}
    </aside>
  );
}

function FileRow({ item }: { item: AnomalyItem }) {
  const file = item.file;
  if (!file) return null;
  return (
    <div className="anom-file">
      <Paperclip size={16} aria-hidden />
      <div>
        <strong>{file.name ?? "Fichier"}</strong>
        <p>{fileKind(file.mimeType)}</p>
        {file.unavailable ? <p>Fichier indisponible — référence conservée.</p> : null}
      </div>
      {file.unavailable ? null : (
        <span className="anom-file-actions">
          <a className="icon-btn" href={`/api/anomalies/${item.id}/fichier`} target="_blank" rel="noreferrer" aria-label="Aperçu"><Eye size={16} /></a>
          <a className="icon-btn" href={`/api/anomalies/${item.id}/fichier`} download={file.name ?? "fichier"} aria-label="Télécharger"><Download size={16} /></a>
        </span>
      )}
    </div>
  );
}

function DetailSheet(props: { item: AnomalyItem; projectName: string; users: Person[]; actor: Person; hidden: boolean; onClose: () => void; onEdit: () => void; onStatus: (status: AnomalyStatus) => void; onAssigned: (assigneeId: string | null, assignee: string | null) => void; onComment: (body: string) => Promise<boolean> }) {
  const { onClose } = props;
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return createPortal(
    <div className="drawer-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="drawer anom-sheet" role="dialog" aria-modal="true" aria-label={props.item.text}>
        <button type="button" className="okr-x" aria-label="Retour" onClick={onClose}><X size={18} aria-hidden /></button>
        <Detail {...props} />
      </div>
    </div>,
    document.body,
  );
}

function EditDrawer({
  item, projects, users, onClose, onSaved,
}: {
  item: AnomalyItem;
  projects: ProjectOption[];
  users: Person[];
  onClose: () => void;
  onSaved: (next: AnomalyItem) => void;
}) {
  const projectName = projects.find((project) => project.id === item.projectId)?.name ?? item.projectId;
  const [projectId, setProjectId] = useState(item.projectId);
  const [text, setText] = useState(item.text);
  const [severity, setSeverity] = useState<AnomalySeverity>(item.severity);
  const [status, setStatus] = useState<AnomalyStatus>(item.status);
  const [assigneeId, setAssigneeId] = useState(item.assigneeId ?? "");
  const [removeFile, setRemoveFile] = useState(false);
  const [nextFile, setNextFile] = useState<File | null>(null);
  const [askRemove, setAskRemove] = useState(false);
  const [askReplace, setAskReplace] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [leave, setLeave] = useState(false);
  const dirty = projectId !== item.projectId || text !== item.text || severity !== item.severity || status !== item.status || assigneeId !== (item.assigneeId ?? "") || removeFile || nextFile != null;
  const dirtyRef = useRef(dirty);
  const chosenProject = projects.find((project) => project.id === projectId);
  function requestClose() {
    if (dirtyRef.current) setLeave(true);
    else onClose();
  }
  const requestRef = useRef(requestClose);
  useEffect(() => {
    dirtyRef.current = dirty;
    requestRef.current = requestClose;
  });
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) { onClose(); return; }
    const description = text.trim();
    if (!description) { setError("Décrivez l'anomalie."); return; }
    if (description.length > 300) { setError("La description ne peut pas dépasser 300 caractères."); return; }
    if (!chosenProject?.enabled) { setError("Les anomalies ne sont pas activées sur ce projet."); return; }
    const fileAction = nextFile ? "replace" : removeFile ? "remove" : "keep";
    const data = new FormData();
    data.set("id", item.id);
    data.set("projectId", projectId);
    data.set("text", description);
    data.set("severity", severity);
    data.set("status", status);
    data.set("assigneeId", assigneeId);
    data.set("fileAction", fileAction);
    if (nextFile) data.set("file", nextFile);
    setPending(true);
    setError("");
    void updateAnomaly(data).then((result) => {
      setPending(false);
      if (!result.ok) { setError(result.error); toast.error(result.error); return; }
      const assignee = users.find((member) => member.id === assigneeId)?.name ?? null;
      onSaved({
        ...item,
        projectId,
        text: description,
        severity,
        status,
        assigneeId: assigneeId || null,
        assignee,
        file: nextFile
          ? { name: nextFile.name, mimeType: nextFile.type || null, unavailable: false }
          : removeFile ? null : item.file,
        revisedAt: new Date().toISOString(),
      });
    }).catch(() => { setPending(false); setError("Enregistrement impossible."); });
  }
  return createPortal(
    <div className="drawer-back" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <form className="drawer anom-edit-drawer" role="dialog" aria-modal="true" aria-labelledby="anom-edit-title" onSubmit={submit}>
        <button type="button" className="okr-x okr-detail-x" aria-label="Fermer" onClick={requestClose}><X size={18} aria-hidden /></button>
        <header className="meet-head">
          <p className="text-caption text-accent-text">{chosenProject?.name ?? projectName}</p>
          <h2 id="anom-edit-title" className="text-h2">Modifier l&apos;anomalie</h2>
        </header>
        <div className="meet-scroll">
          <div className="meet-stack">
            <div className="anom-locked">
              <p><span>Identifiant</span><strong>{item.id}</strong></p>
              <p><span>Signalée le</span><strong>{formatDay(item.date, true)} · {formatTime(item.createdAt)}</strong></p>
              <p><span>Auteur</span><strong>{item.author ?? "Non renseigné"}</strong></p>
            </div>
            <label className="field"><span>Projet concerné</span>
              <select className="control" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
            <label className="field"><span>Description</span>
              <textarea className="control anom-edit-text" maxLength={300} value={text} onChange={(event) => setText(event.target.value)} />
            </label>
            <fieldset className="anom-choice-set">
              <legend>Sévérité</legend>
              <div className="anom-choices" role="radiogroup" aria-label="Sévérité">
                {(["minor", "major", "blocking"] as const).map((value) => (
                  <button key={value} type="button" role="radio" aria-checked={severity === value} data-tone={SEVERITY[value].tone} className={`anom-choice ${severity === value ? "is-on" : ""}`} onClick={() => setSeverity(value)}>{SEVERITY[value].label}</button>
                ))}
              </div>
            </fieldset>
            <fieldset className="anom-choice-set">
              <legend>Statut</legend>
              <div className="anom-choices" role="radiogroup" aria-label="Statut">
                {(["open", "progress", "resolved"] as const).map((value) => (
                  <button key={value} type="button" role="radio" aria-checked={status === value} data-tone={STATUS[value].tone} className={`anom-choice ${status === value ? "is-on" : ""}`} onClick={() => setStatus(value)}>{STATUS[value].label}</button>
                ))}
              </div>
            </fieldset>
            <label className="field"><span>Personne assignée</span>
              <select className="control" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">Non assignée</option>
                {users.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>
            <div className="field">
              <span>Pièces jointes</span>
              {item.file && !removeFile && !nextFile ? (
                <div className="anom-file">
                  <Paperclip size={16} aria-hidden />
                  <div>
                    <strong>{item.file.name ?? "Fichier"}</strong>
                    <p>{item.file.unavailable ? "Fichier indisponible — référence conservée." : fileKind(item.file.mimeType)}</p>
                  </div>
                  {item.file.unavailable ? null : (
                    <a className="icon-btn" href={`/api/anomalies/${item.id}/fichier`} target="_blank" rel="noreferrer" aria-label="Consulter la pièce jointe"><Eye size={16} /></a>
                  )}
                  <button type="button" className="btn anom-quiet" onClick={() => setAskRemove(true)}>Retirer</button>
                </div>
              ) : (
                <p className="text-small text-muted">{removeFile ? "La pièce jointe sera retirée à l'enregistrement." : "Aucune pièce jointe."}</p>
              )}
              {askRemove ? (
                <div className="okr-leave" role="alertdialog" aria-labelledby="anom-file-remove">
                  <p id="anom-file-remove">Retirer la pièce jointe {item.file?.name ? `« ${item.file.name} »` : ""} ?</p>
                  <button type="button" className="btn" onClick={() => setAskRemove(false)}>Continuer</button>
                  <button type="button" className="btn btn-primary" onClick={() => { setRemoveFile(true); setNextFile(null); setAskRemove(false); }}>Retirer</button>
                </div>
              ) : null}
              {removeFile ? <button type="button" className="btn anom-quiet" onClick={() => setRemoveFile(false)}>Conserver la pièce jointe</button> : null}
              <label className="field">
                <span>{item.file && !removeFile ? "Remplacer la pièce jointe" : "Ajouter une pièce jointe"}</span>
                <input className="anom-file-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  if (!picked) return;
                  if (item.file && !removeFile) setAskReplace(picked);
                  else setNextFile(picked);
                }} />
                <span className="anom-file-pick">{nextFile ? nextFile.name : "Choisir un fichier"}</span>
              </label>
              {askReplace ? (
                <div className="okr-leave" role="alertdialog" aria-labelledby="anom-file-replace">
                  <p id="anom-file-replace">Remplacer « {item.file?.name ?? "le fichier actuel"} » par « {askReplace.name} » à l&apos;enregistrement ?</p>
                  <button type="button" className="btn" onClick={() => setAskReplace(null)}>Continuer</button>
                  <button type="button" className="btn btn-primary" onClick={() => { setNextFile(askReplace); setRemoveFile(false); setAskReplace(null); }}>Remplacer</button>
                </div>
              ) : null}
            </div>
          </div>
          {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
        </div>
        {leave ? (
          <div className="okr-leave" role="alertdialog" aria-labelledby="anom-edit-leave">
            <p id="anom-edit-leave">Des modifications ne sont pas enregistrées. Les abandonner ?</p>
            <button type="button" className="btn" onClick={() => setLeave(false)}>Continuer</button>
            <button type="button" className="btn btn-primary" onClick={onClose}>Abandonner</button>
          </div>
        ) : null}
        <footer className="okr-detail-foot">
          <button type="button" className="btn okr-cancel" disabled={pending} onClick={requestClose}>Annuler</button>
          <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer les modifications"}</button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function CreateDrawer({ projects, today, onClose, onSaved }: { projects: Array<{ id: string; name: string }>; today: string; onClose: () => void; onSaved: () => void }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [date, setDate] = useState(today);
  const [severity, setSeverity] = useState<AnomalySeverity>("major");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [leave, setLeave] = useState(false);
  const dirty = text.trim() !== "" || date !== today || severity !== "major" || file != null;
  function requestClose() { if (dirty) setLeave(true); else onClose(); }
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") requestClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!projectId) next.projectId = "Choisissez un projet.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today) next.date = "La date ne peut pas être dans le futur.";
    if (!text.trim()) next.text = "Décrivez l'anomalie.";
    setErrors(next);
    if (Object.keys(next).length) return;
    const data = new FormData();
    data.set("projectId", projectId);
    data.set("date", date);
    data.set("severity", severity);
    data.set("text", text.trim());
    if (file) data.set("file", file);
    setPending(true);
    setError("");
    void saveAnomaly(data).then((result) => {
      setPending(false);
      if (!result.ok) { setError(result.error); toast.error(result.error); return; }
      toast.success("Anomalie enregistrée");
      onSaved();
    }).catch(() => { setPending(false); setError("Enregistrement impossible."); });
  }
  return createPortal(
    <div className="drawer-back" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <form className="drawer anom-create-drawer" role="dialog" aria-modal="true" aria-labelledby="anom-create-title" onSubmit={submit}>
        <button type="button" className="okr-x okr-detail-x" aria-label="Fermer" onClick={requestClose}><X size={18} aria-hidden /></button>
        <header className="meet-head">
          <h2 id="anom-create-title" className="text-h2">Signaler une anomalie</h2>
          <p className="text-small text-muted">Décrivez le problème rencontré afin de faciliter son suivi et sa résolution.</p>
        </header>
        <div className="meet-scroll">
          {projects.length ? (
            <div className="meet-stack">
              <label className="field"><span>Projet concerné</span>
                <select className="control" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
                {errors.projectId ? <em className="meet-error">{errors.projectId}</em> : null}
              </label>
              <div className="meet-grid-2">
                <label className="field"><span>Date *</span>
                  <input className="control" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} />
                  {errors.date ? <em className="meet-error">{errors.date}</em> : null}
                </label>
                <label className="field"><span>Sévérité</span>
                  <select className="control" value={severity} onChange={(event) => setSeverity(event.target.value as AnomalySeverity)}>
                    <option value="minor">Mineure</option>
                    <option value="major">Majeure</option>
                    <option value="blocking">Critique</option>
                  </select>
                </label>
              </div>
              <label className="field"><span>Description *</span>
                <textarea className="control meet-cr" maxLength={300} value={text} onChange={(event) => setText(event.target.value)} />
                {errors.text ? <em className="meet-error">{errors.text}</em> : null}
              </label>
              <label className="field"><span>Pièce jointe</span>
                <input className="anom-file-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                <span className="anom-file-pick">{file ? file.name : "Choisir un fichier"}</span>
              </label>
            </div>
          ) : <p className="anom-empty">Aucun projet n&apos;a le module anomalies activé.</p>}
          {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
        </div>
        {leave ? (
          <div className="okr-leave" role="alertdialog" aria-labelledby="anom-leave">
            <p id="anom-leave">Abandonner ce signalement ?</p>
            <button type="button" className="btn" onClick={() => setLeave(false)}>Continuer</button>
            <button type="button" className="btn btn-primary" onClick={onClose}>Abandonner</button>
          </div>
        ) : null}
        <footer className="okr-detail-foot">
          <button type="button" className="btn okr-cancel" disabled={pending} onClick={requestClose}>Annuler</button>
          <button className="btn btn-primary" type="submit" disabled={pending || !projects.length}>{pending ? "Enregistrement…" : "Enregistrer l'anomalie"}</button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function Badges({ item }: { item: AnomalyItem }) {
  const severity = SEVERITY[item.severity];
  const status = STATUS[item.status];
  return (
    <span className="anom-badges">
      <span className={`fiche-badge fiche-badge-${severity.tone}`}>{severity.label}</span>
      <span className={`fiche-badge fiche-badge-${status.tone} anom-status-badge`}>{status.label}</span>
    </span>
  );
}

function ProjectMark({ projectId, projectName }: { projectId: string; projectName: string }) {
  const logo = PROJECT_LOGOS[projectId];
  if (!logo) return <strong>{projectName}</strong>;
  const height = projectId === "rpm" ? 28 : projectId === "triage" ? 16 : 22;
  return <Logo src={logo} alt={projectName} height={height} />;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function fileKind(mime: string | null) {
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/webp") return "WebP";
  if (mime === "application/pdf") return "PDF";
  if (mime === "video/mp4") return "MP4";
  return mime ? "Fichier" : "Référence";
}
