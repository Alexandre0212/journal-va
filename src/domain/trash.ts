export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 86_400_000;

export type TrashKind = "task" | "okr" | "kpi" | "info" | "course";

export type TrashRow = {
  entity: TrashKind;
  id: string;
  title: string;
  project: string | null;
  deletedAt: string;
  deletedDay: string;
  deadlineDay: string;
  author: string | null;
};

export const TRASH_KIND_LABEL: Record<TrashKind, string> = {
  task: "Tâche",
  okr: "OKR",
  kpi: "KPI",
  info: "Info",
  course: "Course",
};

export function retentionDeadline(deletedAt: Date): Date {
  return new Date(deletedAt.getTime() + TRASH_RETENTION_MS);
}

export function isRestorable(deletedAt: Date, now: Date): boolean {
  return deletedAt.getTime() <= now.getTime() && now.getTime() < retentionDeadline(deletedAt).getTime();
}

export function trashHeadline(count: number): string {
  if (count <= 0) return "Rien à restaurer";
  if (count === 1) return "1 élément supprimé";
  return `${count} éléments supprimés`;
}

export function courseTrashTitle(course: {
  date: string;
  fromPlace: string | null;
  toPlace: string | null;
  note: string | null;
}): string {
  const trip = [course.fromPlace?.trim(), course.toPlace?.trim()].filter(Boolean).join(" → ");
  if (trip) return trip;
  const note = course.note?.trim();
  if (note) return note;
  return `Course du ${course.date}`;
}

export function filterTrashRows(
  rows: TrashRow[],
  query: { text: string; entity: TrashKind | "all"; project: string; day: string },
): TrashRow[] {
  const text = query.text.trim().toLocaleLowerCase("fr");
  return rows.filter((row) => {
    if (query.entity !== "all" && row.entity !== query.entity) return false;
    if (query.project === "__none__" && row.project !== null) return false;
    if (query.project !== "all" && query.project !== "__none__" && row.project !== query.project) return false;
    if (query.day !== "all" && row.deletedDay !== query.day) return false;
    if (!text) return true;
    const haystack = `${row.title} ${row.project ?? ""} ${row.author ?? ""}`.toLocaleLowerCase("fr");
    return haystack.includes(text);
  });
}
