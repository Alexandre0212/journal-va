"use client";

import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, TraversalOrder, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { TaskFiltersToolbar } from "@/features/task-filters-toolbar";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { PHASES, PROJECT_LOGOS } from "@/domain/phases";
import { shiftDay } from "@/lib/dates";
import { moveTask, saveTask, softDelete } from "@/server/actions";

export type BoardTask = {
  id: string;
  title: string;
  status: "todo" | "doing" | "blocked" | "done";
  projectId: string;
  projectName: string;
  phase: number;
  okrId: string | null;
  okrTitle: string | null;
  assigneeId: string | null;
  assignee: string | null;
  due: string | null;
  date: string | null;
  priority: "low" | "normal" | "high" | null;
  blocker: string | null;
  late: boolean;
};

export type BoardMeta = {
  projects: Array<{ id: string; name: string; phase: number }>;
  okrs: Array<{ id: string; title: string; projectId: string; phase: number }>;
  users: Array<{ id: string; name: string }>;
};

const COLS = [
  { id: "todo", label: "À faire" },
  { id: "doing", label: "En cours" },
  { id: "blocked", label: "Bloqué" },
  { id: "done", label: "Fait" },
] as const;

const PRIORITY: Record<string, string> = { low: "Basse", normal: "Normale", high: "Haute" };

export function TaskBoard({ tasks, meta, today, createPhase, heading }: { tasks: BoardTask[]; meta: BoardMeta; today: string; createPhase?: number; heading?: ReactNode }) {
  const [items, setItems] = useState(tasks);
  const [pending, setPending] = useState<BoardTask | null>(null);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("");
  const [horizon, setHorizon] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<BoardTask | null>(null);
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<BoardTask | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const mutation = useMutation({ mutationFn: moveTask });
  const soon = shiftDay(today, 7);
  const visible = items.filter((task) => {
    if (query.trim() && !task.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (projectId && task.projectId !== projectId) return false;
    if (assigneeId === "none" && task.assigneeId) return false;
    if (assigneeId && assigneeId !== "none" && task.assigneeId !== assigneeId) return false;
    if (priority === "none" && task.priority) return false;
    if (priority && priority !== "none" && task.priority !== priority) return false;
    if (horizon === "soon" && !(task.due && task.status !== "done" && task.due >= today && task.due <= soon)) return false;
    if (horizon === "late" && !task.late) return false;
    if (horizon === "none" && task.due) return false;
    return true;
  });

  function closeDrawer() {
    if (dirty && !window.confirm("Des modifications ne sont pas enregistrées. Fermer quand même ?")) return;
    setCreating(false);
    setSelected(null);
    setEditing(false);
    setDirty(false);
    setError("");
  }

  async function commit(task: BoardTask, status: BoardTask["status"], blocker: string | null, previous: BoardTask[]) {
    try {
      const result = await mutation.mutateAsync({ id: task.id, status, blocker });
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Tâche déplacée", {
        action: { label: "Annuler", onClick: () => void commit(task, task.status, task.blocker, items) },
      });
    } catch {
      setItems(previous);
      toast.error("Enregistrement impossible.");
    }
  }

  function onDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function onDragCancel() {
    setDraggingId(null);
  }

  function onDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const status = event.over?.id;
    const id = String(event.active.id);
    if (status !== "todo" && status !== "doing" && status !== "blocked" && status !== "done") return;
    const current = items.find((task) => task.id === id);
    if (!current || current.status === status) return;
    if (status === "blocked") {
      setPending(current);
      setReason(current.blocker ?? "");
      return;
    }
    const previous = items;
    setItems(items.map((task) => (task.id === id ? { ...task, status, blocker: null, late: false } : task)));
    void commit(current, status, null, previous);
  }

  async function remove(task: BoardTask) {
    setSaving(true);
    const result = await softDelete("task", task.id);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setItems(items.filter((item) => item.id !== task.id));
    setConfirming(null);
    setSelected(null);
    toast.success("Tâche envoyée dans la corbeille");
  }

  return (
    <div className="task-board flex flex-col gap-4">
      <div className="task-mast">
        {heading ? <div className="task-mast-copy">{heading}</div> : <span />}
        <button type="button" className="btn btn-primary task-create" onClick={() => { setCreating(true); setSelected(null); setDirty(false); setError(""); }}><Plus size={16} aria-hidden /> Nouvelle tâche</button>
      </div>
      <TaskFiltersToolbar
        query={query}
        onQueryChange={setQuery}
        projects={meta.projects}
        projectId={projectId}
        onProjectChange={setProjectId}
        users={meta.users}
        assigneeId={assigneeId}
        onAssigneeChange={setAssigneeId}
        priority={priority}
        onPriorityChange={setPriority}
        horizon={horizon}
        onHorizonChange={setHorizon}
      />
      <DndContext id="taches" sensors={sensors} autoScroll={{ order: TraversalOrder.ReversedTreeOrder }} onDragStart={onDragStart} onDragCancel={onDragCancel} onDragEnd={onDragEnd}>
        <div className="kanban-bounded grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} tasks={visible.filter((task) => task.status === col.id)} menu={menu} onMenu={setMenu} onOpen={(task, edit) => { setSelected(task); setEditing(edit); setCreating(false); setDirty(false); setError(""); setMenu(null); }} onDelete={setConfirming} />
          ))}
        </div>
        <DragOverlay dropAnimation={null} zIndex={80}>
          {draggingId ? <TaskPreview task={items.find((task) => task.id === draggingId) ?? visible.find((task) => task.id === draggingId) ?? null} /> : null}
        </DragOverlay>
      </DndContext>
      {creating ? <TaskDrawer title="Nouvelle tâche" onClose={closeDrawer}><TaskForm meta={meta} createPhase={createPhase} saving={saving} error={error} onDirty={() => setDirty(true)} onSubmit={(payload) => void (async () => {
        setSaving(true);
        setError("");
        const result = await saveTask(payload);
        setSaving(false);
        if (!result.ok) { setError(result.error); toast.error(result.error); return; }
        toast.success("Enregistré");
        setCreating(false);
        setDirty(false);
      })()} /></TaskDrawer> : null}
      {selected ? (
        <TaskDrawer title={editing ? "Modifier la tâche" : selected.title} onClose={closeDrawer}>
          {editing ? (
            <TaskForm meta={meta} task={selected} saving={saving} error={error} onDirty={() => setDirty(true)} onSubmit={(payload) => void (async () => {
              setSaving(true);
              setError("");
              const result = await saveTask({ ...payload, id: selected.id });
              setSaving(false);
              if (!result.ok) { setError(result.error); toast.error(result.error); return; }
              const assignee = meta.users.find((user) => user.id === payload.assigneeId)?.name ?? null;
              const okrTitle = meta.okrs.find((okr) => okr.id === payload.okrId)?.title ?? null;
              const projectName = meta.projects.find((project) => project.id === payload.projectId)?.name ?? selected.projectName;
              setItems(items.map((item) => item.id === selected.id ? { ...item, ...payload, assignee, okrTitle, projectName, late: Boolean(payload.due && payload.due < today && payload.status !== "done") } : item));
              toast.success("Enregistré");
              setSelected(null);
              setEditing(false);
              setDirty(false);
            })()} />
          ) : (
            <TaskDetail task={selected} onEdit={() => setEditing(true)} onDelete={() => setConfirming(selected)} />
          )}
        </TaskDrawer>
      ) : null}
      {confirming ? (
        <div className="modal-back" onClick={() => setConfirming(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-h3">Envoyer dans la corbeille ?</h2>
            <p className="text-small">{confirming.title}</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setConfirming(null)}>Annuler</button>
              <button type="button" className="btn btn-danger" disabled={saving} onClick={() => void remove(confirming)}>{saving ? "Suppression…" : "Confirmer"}</button>
            </div>
          </div>
        </div>
      ) : null}
      {pending ? (
        <div className="modal-back" onClick={() => setPending(null)}>
          <form className="sheet" onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault();
            if (!reason.trim()) return;
            const previous = items;
            const task = pending;
            setItems(items.map((item) => (item.id === task.id ? { ...item, status: "blocked", blocker: reason.trim() } : item)));
            setPending(null);
            void commit(task, "blocked", reason.trim(), previous);
          }}>
            <h2 className="text-h3">Raison du blocage</h2>
            <textarea className="control min-h-24" value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={600} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setPending(null)}>Annuler</button>
              <button type="submit" className="btn btn-primary">Bloquer</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Column({ id, label, tasks, menu, onMenu, onOpen, onDelete }: { id: string; label: string; tasks: BoardTask[]; menu: string | null; onMenu: (id: string | null) => void; onOpen: (task: BoardTask, edit: boolean) => void; onDelete: (task: BoardTask) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section className={`kanban-col kanban-${id} ${isOver ? "is-over" : ""}`}>
      <header>
        <h2 className="text-caption">{label}</h2>
        <span className="num text-small">{tasks.length}</span>
      </header>
      <div className="kanban-scroll">
        <div ref={setNodeRef} className="kanban-drop">
          {tasks.length ? tasks.map((task) => <Card key={task.id} task={task} open={menu === task.id} onMenu={() => onMenu(menu === task.id ? null : task.id)} onOpen={() => onOpen(task, false)} onEdit={() => onOpen(task, true)} onDelete={() => onDelete(task)} />) : <p className="kanban-empty">Aucune tâche</p>}
        </div>
      </div>
    </section>
  );
}

function Card({ task, open, onMenu, onOpen, onEdit, onDelete }: { task: BoardTask; open: boolean; onMenu: () => void; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const menuRef = useRef<HTMLButtonElement>(null);
  const logo = PROJECT_LOGOS[task.projectId];
  return (
    <article ref={setNodeRef} style={isDragging ? undefined : { transform: CSS.Translate.toString(transform) }} className={`task-card ${isDragging ? "is-dragging" : ""} ${task.status === "blocked" ? "is-blocked" : ""}`}>
      <div className="task-card-top">
        <button type="button" className="task-open" onClick={onOpen}>{task.title}</button>
        <button type="button" className="icon-btn" aria-label={`Actions pour ${task.title}`} aria-expanded={open} aria-haspopup="menu" ref={menuRef} onClick={onMenu}>···</button>
        <button type="button" className="drag-handle" ref={setActivatorNodeRef} aria-label={`Déplacer ${task.title}`} {...listeners} {...attributes} />
      </div>
      {open ? <TaskMenu anchorRef={menuRef} onOpen={onOpen} onEdit={onEdit} onDelete={onDelete} onClose={onMenu} /> : null}
      {task.blocker ? <p className="rounded-[8px] bg-crit-soft px-2 py-1 text-small text-crit">{task.blocker}</p> : null}
      <p className="task-meta">
        {logo ? <span className="logo-plate"><Logo src={logo} alt={task.projectName} height={task.projectId === "rpm" ? 22 : 14} /></span> : <span>{task.projectName}</span>}
      </p>
      <p className="text-small text-muted">
        {task.priority ? PRIORITY[task.priority] : "Priorité non renseignée"}
        {task.assignee ? ` · ${task.assignee}` : " · Non attribuée"}
        {task.due ? ` · ${task.late ? "En retard · " : ""}${task.due}` : ""}
      </p>
      {task.okrTitle ? <p className="text-small">{task.okrTitle}</p> : null}
    </article>
  );
}

function TaskMenu({ anchorRef, onOpen, onEdit, onDelete, onClose }: { anchorRef: RefObject<HTMLButtonElement | null>; onOpen: () => void; onEdit: () => void; onDelete: () => void; onClose: () => void }) {
  const [box, setBox] = useState<{ top: number; right: number } | null>(null);
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const menuHeight = 132;
    const below = rect.bottom + 6;
    const top = below + menuHeight > window.innerHeight - 8 ? Math.max(8, rect.top - menuHeight - 6) : below;
    setBox({ top, right: Math.max(8, window.innerWidth - rect.right) });
    const scroller = anchor.closest(".kanban-scroll");
    const start = scroller instanceof HTMLElement ? scroller.scrollTop : 0;
    const page = window.scrollY;
    const closeIfMoved = () => {
      const next = scroller instanceof HTMLElement ? scroller.scrollTop : 0;
      if (next !== start || window.scrollY !== page) onClose();
    };
    window.addEventListener("scroll", closeIfMoved, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("scroll", closeIfMoved, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchorRef, onClose]);
  if (!box) return null;
  return createPortal(
    <div className="task-menu" role="menu" style={{ position: "fixed", top: box.top, right: box.right, zIndex: 30 }}>
      <button type="button" role="menuitem" onClick={onOpen}>Voir</button>
      <button type="button" role="menuitem" onClick={onEdit}>Modifier</button>
      <button type="button" role="menuitem" onClick={onDelete}>Supprimer</button>
    </div>,
    document.body,
  );
}

function TaskPreview({ task }: { task: BoardTask | null }) {
  if (!task) return null;
  const logo = PROJECT_LOGOS[task.projectId];
  return (
    <article className="task-card task-drag-preview">
      <p className="task-open">{task.title}</p>
      {task.blocker ? <p className="rounded-[8px] bg-crit-soft px-2 py-1 text-small text-crit">{task.blocker}</p> : null}
      <p className="task-meta">
        {logo ? <span className="logo-plate"><Logo src={logo} alt="" height={task.projectId === "rpm" ? 22 : 14} /></span> : <span>{task.projectName}</span>}
      </p>
      <p className="text-small text-muted">
        {task.priority ? PRIORITY[task.priority] : "Priorité non renseignée"}
        {task.assignee ? ` · ${task.assignee}` : " · Non attribuée"}
        {task.due ? ` · ${task.late ? "En retard · " : ""}${task.due}` : ""}
      </p>
      {task.okrTitle ? <p className="text-small">{task.okrTitle}</p> : null}
    </article>
  );
}

function TaskDrawer({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="drawer-back" onClick={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header className="flex items-start justify-between gap-3">
          <h2 className="text-h2">{title}</h2>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>×</button>
        </header>
        {children}
      </aside>
    </div>
  );
}

function TaskDetail({ task, onEdit, onDelete }: { task: BoardTask; onEdit: () => void; onDelete: () => void }) {
  const phase = PHASES[task.phase];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-muted">{task.projectName} · {phase?.name ?? "Phase"}</p>
      <dl className="detail-list">
        <div><dt>Responsable</dt><dd>{task.assignee ?? "Non attribuée"}</dd></div>
        <div><dt>Priorité</dt><dd>{task.priority ? PRIORITY[task.priority] : "Non renseignée"}</dd></div>
        <div><dt>Échéance</dt><dd>{task.due ? `${task.due}${task.late ? " · en retard" : ""}` : "Non renseignée"}</dd></div>
        <div><dt>Statut</dt><dd>{COLS.find((col) => col.id === task.status)?.label}</dd></div>
        <div><dt>OKR lié</dt><dd>{task.okrTitle ?? "Aucun"}</dd></div>
      </dl>
      {task.blocker ? <p className="rounded-[8px] bg-crit-soft px-3 py-2 text-small text-crit">{task.blocker}</p> : null}
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary" onClick={onEdit}>Modifier</button>
        <button type="button" className="btn btn-danger" onClick={onDelete}>Supprimer</button>
      </div>
    </div>
  );
}

function TaskForm({ meta, task, createPhase, saving, error, onDirty, onSubmit }: { meta: BoardMeta; task?: BoardTask; createPhase?: number; saving: boolean; error: string; onDirty: () => void; onSubmit: (payload: { title: string; projectId: string; phase: number; okrId: string | null; assigneeId: string | null; due: string | null; date: string | null; status: BoardTask["status"]; priority: BoardTask["priority"]; blocker: string | null }) => void }) {
  const [projectId, setProjectId] = useState(task?.projectId ?? meta.projects[0]?.id ?? "");
  const [phase, setPhase] = useState(task?.phase ?? createPhase ?? meta.projects[0]?.phase ?? 0);
  const [status, setStatus] = useState<BoardTask["status"]>(task?.status ?? "todo");
  const choices = meta.okrs.filter((okr) => okr.projectId === projectId && okr.phase === phase);
  return (
    <form className="flex flex-col gap-3" onChange={onDirty} onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const blocker = String(data.get("blocker") ?? "").trim();
      if (status === "blocked" && !blocker) return;
      onSubmit({
        title: String(data.get("title") ?? ""),
        projectId,
        phase,
        okrId: String(data.get("okrId") ?? "") || null,
        assigneeId: String(data.get("assigneeId") ?? "") || null,
        due: String(data.get("due") ?? "") || null,
        date: task?.date ?? null,
        status,
        priority: (String(data.get("priority") ?? "") || null) as BoardTask["priority"],
        blocker: status === "blocked" ? blocker : null,
      });
    }}>
      <label className="field"><span>Tâche</span><input name="title" className="control" required maxLength={200} defaultValue={task?.title} /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field"><span>Projet</span>
          <select className="control" value={projectId} onChange={(event) => { setProjectId(event.target.value); setPhase(meta.projects.find((project) => project.id === event.target.value)?.phase ?? 0); }}>
            {meta.projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Phase cible</span>
          <select className="control" value={phase} onChange={(event) => setPhase(Number(event.target.value))}>{PHASES.map((item) => <option key={item.index} value={item.index}>{item.name}</option>)}</select>
        </label>
        <label className="field"><span>OKR lié</span>
          <select name="okrId" className="control" defaultValue={task?.okrId ?? ""}><option value="">Aucun OKR</option>{choices.map((okr) => <option key={okr.id} value={okr.id}>{okr.title}</option>)}</select>
        </label>
        <label className="field"><span>Responsable</span>
          <select name="assigneeId" className="control" defaultValue={task?.assigneeId ?? ""}><option value="">Non attribuée</option>{meta.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        </label>
        <label className="field"><span>Échéance</span><input type="date" name="due" className="control" defaultValue={task?.due ?? ""} /></label>
        <label className="field"><span>Priorité</span>
          <select name="priority" className="control" defaultValue={task?.priority ?? ""}><option value="">Non renseignée</option><option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option></select>
        </label>
        <label className="field"><span>Statut</span>
          <select className="control" value={status} onChange={(event) => setStatus(event.target.value as BoardTask["status"])}><option value="todo">À faire</option><option value="doing">En cours</option><option value="blocked">Bloqué</option><option value="done">Fait</option></select>
        </label>
      </div>
      {createPhase != null ? <p className="text-small text-muted">Phase cible : {PHASES[phase]?.name ?? "Phase"}. Enregistrer cette tâche ne modifie pas la phase officielle du projet.</p> : null}
      {status === "blocked" ? <label className="field"><span>Raison du blocage</span><input name="blocker" className="control" required maxLength={600} defaultValue={task?.blocker ?? ""} /></label> : null}
      {error ? <p className="text-small text-crit">{error}</p> : null}
      <button className="btn btn-primary w-fit" type="submit" disabled={saving}>{saving ? "Enregistrement…" : task ? "Enregistrer" : "Ajouter la tâche"}</button>
    </form>
  );
}
