"use client";

import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { moveTask } from "@/server/actions";

export type BoardTask = {
  id: string;
  title: string;
  status: "todo" | "doing" | "blocked" | "done";
  projectName: string;
  okrTitle: string | null;
  assignee: string | null;
  due: string | null;
  blocker: string | null;
  late: boolean;
};

const COLS = [
  { id: "todo", label: "À faire" },
  { id: "doing", label: "En cours" },
  { id: "blocked", label: "Bloqué" },
  { id: "done", label: "Fait" },
] as const;

export function TaskBoard({ tasks }: { tasks: BoardTask[] }) {
  const [items, setItems] = useState(tasks);
  const [pending, setPending] = useState<BoardTask | null>(null);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const mutation = useMutation({
    mutationFn: moveTask,
    onError: () => toast.error("Enregistrement impossible."),
  });
  const visible = items.filter((task) => task.title.toLowerCase().includes(query.trim().toLowerCase()));

  async function commit(task: BoardTask, status: BoardTask["status"], blocker: string | null, previous: BoardTask[]) {
    const result = await mutation.mutateAsync({ id: task.id, status, blocker });
    if (!result.ok) {
      setItems(previous);
      toast.error(result.error);
      return;
    }
    toast.success("Tâche déplacée", {
      action: { label: "Annuler", onClick: () => void commit(task, task.status, task.blocker, items) },
    });
  }

  function onDragEnd(event: DragEndEvent) {
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
    setItems(items.map((task) => (task.id === id ? { ...task, status, blocker: null } : task)));
    void commit(current, status, null, previous);
  }

  return (
    <div className="flex flex-col gap-4">
      <input className="control max-w-sm" placeholder="Rechercher une tâche" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Rechercher une tâche" />
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {COLS.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} tasks={visible.filter((task) => task.status === col.id)} />
          ))}
        </div>
      </DndContext>
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

function Column({ id, label, tasks }: { id: string; label: string; tasks: BoardTask[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section ref={setNodeRef} className={`flex flex-col gap-2 rounded-[12px] bg-sunken p-3 ${isOver ? "ring-2 ring-primary-fg" : ""} ${id === "blocked" ? "ring-1 ring-crit/40" : ""}`}>
      <header className="flex items-center justify-between px-1">
        <h2 className="text-caption">{label}</h2>
        <span className="num text-small">{tasks.length}</span>
      </header>
      {tasks.length ? tasks.map((task) => <Card key={task.id} task={task} />) : <p className="text-small text-muted px-1">—</p>}
    </section>
  );
}

function Card({ task }: { task: BoardTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  return (
    <article ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform) }} className={`surface flex flex-col gap-2 p-3 ${isDragging ? "rotate-1 shadow-[var(--shadow-3)]" : ""} ${task.status === "blocked" ? "border-l-4 border-l-crit" : ""}`} {...listeners} {...attributes}>
      <p className="text-body font-medium">{task.title}</p>
      {task.blocker ? <p className="rounded-[8px] bg-crit-soft px-2 py-1 text-small text-crit">{task.blocker}</p> : null}
      <p className="text-small text-muted">{task.projectName}{task.assignee ? ` · ${task.assignee}` : " · Non attribuée"}{task.due ? ` · ${task.late ? "En retard · " : ""}${task.due}` : ""}</p>
      {task.okrTitle ? <p className="text-small">{task.okrTitle}</p> : null}
    </article>
  );
}
