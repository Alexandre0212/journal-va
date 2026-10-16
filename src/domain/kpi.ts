import { shiftDay } from "@/lib/dates";

export function averageLast7(
  values: Record<string, number>,
  today: string,
): number | null {
  const nums: number[] = [];
  for (let i = 0; i < 7; i += 1) {
    const value = values[shiftDay(today, -i)];
    if (typeof value === "number" && !Number.isNaN(value)) nums.push(value);
  }
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function sparkPoints(
  values: Record<string, number>,
  today: string,
): Array<{ index: number; date: string; value: number }> {
  const points: Array<{ index: number; date: string; value: number }> = [];
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDay(today, i - 13);
    const value = values[date];
    if (typeof value === "number" && !Number.isNaN(value)) {
      points.push({ index: i, date, value });
    }
  }
  return points;
}

export function targetReached(average: number | null, target: number | null): boolean | null {
  if (average == null || target == null || Number.isNaN(target)) return null;
  return average >= target;
}

export type KpiPace = "reached" | "under" | "open" | "empty";

export function kpiPace(average: number | null, target: number | null): KpiPace {
  const reached = targetReached(average, target);
  if (reached === true) return "reached";
  if (reached === false) return "under";
  if (average == null) return "empty";
  return "open";
}

export function weekDelta(values: Record<string, number>, today: string): number | null {
  const current = averageLast7(values, today);
  const previous = averageLast7(values, shiftDay(today, -7));
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / previous;
}

export function shareRatio(part: number, total: number): number | null {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0 || part < 0) return null;
  return Math.min(1, part / total);
}

export function kpiSeries(values: Record<string, number>): Array<{ date: string; value: number }> {
  return Object.entries(values)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && !Number.isNaN(entry[1]))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({ date, value }));
}
