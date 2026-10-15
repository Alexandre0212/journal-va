import { dayOfInstant, shiftDay } from "@/lib/dates";

export type HistoryEntry = { at: string; status: string; by?: string | null };

export type DayTask = {
  date?: string | null;
  createdAt?: string | null;
  history?: HistoryEntry[];
};

export function onDay(task: DayTask, day: string): boolean {
  if (task.date === day) return true;
  if (!task.date && dayOfInstant(task.createdAt) === day) return true;
  return (task.history ?? []).some((entry) => dayOfInstant(entry.at) === day);
}

export function inLast7(task: DayTask, today: string): boolean {
  const from = shiftDay(today, -6);
  const hit = (value: string | null | undefined) => Boolean(value && value >= from);
  return hit(task.date) || hit(dayOfInstant(task.createdAt)) || (task.history ?? []).some((entry) => hit(dayOfInstant(entry.at)));
}

export type StampInput = {
  status: string;
  history?: HistoryEntry[];
  blocker?: string | null;
};

export type StampResult = {
  status: string;
  updatedAt: string;
  updatedBy: string | null;
  history?: HistoryEntry[];
  doneAt?: string;
  blockedAt?: string;
  blocker: string | null;
};

export function stamp(prev: StampInput, status: string, actorId: string | null, now: Date = new Date()): StampResult {
  const at = now.toISOString();
  const out: StampResult = {
    status,
    updatedAt: at,
    updatedBy: actorId,
    blocker: status === "blocked" ? (prev.blocker ?? null) : null,
  };
  if (status !== prev.status) {
    const hist = (prev.history ?? []).slice(-19);
    hist.push({ at, status, by: actorId });
    out.history = hist;
    if (status === "done") out.doneAt = at;
    if (status === "blocked") out.blockedAt = at;
  }
  return out;
}

export function isLate(due: string | null | undefined, status: string, today: string): boolean {
  return Boolean(due && status !== "done" && due < today);
}
