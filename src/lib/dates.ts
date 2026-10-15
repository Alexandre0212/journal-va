export const TIMEZONE = "Africa/Dakar";

export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftDay(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days, 12));
  return todayISO(utc);
}

export function dayOfInstant(isoInstant: string | null | undefined): string | null {
  if (!isoInstant) return null;
  const date = new Date(isoInstant);
  if (Number.isNaN(date.getTime())) return null;
  return todayISO(date);
}

export function formatDay(iso: string, withWeekday = false): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    weekday: withWeekday ? "long" : undefined,
    day: "numeric",
    month: withWeekday ? "long" : "short",
    year: withWeekday ? "numeric" : undefined,
  }).format(date);
}

export function formatDayLong(iso: string): string {
  return formatDay(iso, true);
}

export function formatTime(isoInstant: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoInstant));
}

export function daysSince(isoInstant: string | null | undefined, now: Date = new Date()): number {
  if (!isoInstant) return 0;
  const then = Date.parse(isoInstant);
  if (Number.isNaN(then)) return 0;
  return Math.floor((now.getTime() - then) / 86_400_000);
}
