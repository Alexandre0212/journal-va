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
