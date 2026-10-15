import { describe, expect, it } from "vitest";
import { averageLast7, targetReached } from "@/domain/kpi";
import { courseGap, coursesSummary } from "@/domain/courses";

describe("kpi et courses", () => {
  it("ignore les jours sans saisie dans la moyenne 7 jours", () => {
    expect(averageLast7({ "2026-10-15": 10, "2026-10-13": 0 }, "2026-10-15")).toBe(5);
    expect(averageLast7({}, "2026-10-15")).toBeNull();
    expect(targetReached(5, 10)).toBe(false);
    expect(targetReached(null, 10)).toBeNull();
  });

  it("calcule l'écart RacTac vs Yango de la course importée", () => {
    const gap = courseGap({ app: 2400, yango: 1500, liv: 1500 });
    expect(gap).toBeCloseTo(60);
    const summary = coursesSummary([{ app: 2400, yango: 1500, liv: 1500 }]);
    expect(summary.avgLiv).toBe(1500);
    expect(summary.gap).toBeCloseTo(60);
  });
});
