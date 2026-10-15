export type CoursePrices = {
  app: number | null;
  yango: number | null;
  liv: number | null;
};

export function mean(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function courseGap(course: CoursePrices): number | null {
  if (typeof course.app !== "number" || typeof course.yango !== "number" || course.yango <= 0) {
    return null;
  }
  return ((course.app - course.yango) / course.yango) * 100;
}

export function coursesSummary(courses: CoursePrices[]) {
  const gaps = courses.map(courseGap).filter((value): value is number => value != null);
  return {
    avgApp: mean(courses.map((course) => course.app)),
    avgYango: mean(courses.map((course) => course.yango)),
    avgLiv: mean(courses.map((course) => course.liv)),
    gap: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
  };
}

export function formatFcfa(value: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(value))} F`;
}

export function formatGap(value: number | null): string {
  if (value == null) return "—";
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(value)} %`;
}
