import { RestoreButton } from "@/features/forms";
import { loadTrash } from "@/server/queries";

export default async function TrashPage() {
  const trash = await loadTrash();
  const rows = [
    ...trash.tasks.map((item) => ({ entity: "task" as const, id: item.id, label: item.title })),
    ...trash.okrs.map((item) => ({ entity: "okr" as const, id: item.id, label: item.title })),
    ...trash.kpis.map((item) => ({ entity: "kpi" as const, id: item.id, label: item.label })),
    ...trash.infos.map((item) => ({ entity: "info" as const, id: item.id, label: item.text })),
    ...trash.courses.map((item) => ({ entity: "course" as const, id: item.id, label: item.date })),
  ];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Corbeille</h1>
      {rows.length ? <ul className="flex flex-col gap-2">{rows.map((row) => <li key={`${row.entity}-${row.id}`} className="surface flex items-center justify-between gap-3 p-3 text-small"><span>{row.label}</span><RestoreButton entity={row.entity} id={row.id} /></li>)}</ul> : <p className="text-muted">La corbeille est vide.</p>}
    </div>
  );
}
