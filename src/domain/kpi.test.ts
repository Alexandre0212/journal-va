import { describe, expect, it } from "vitest";
import { averageLast7, kpiPace, kpiSeries, shareRatio, targetReached, weekDelta } from "@/domain/kpi";
import { courseGap, coursesSummary } from "@/domain/courses";

describe("kpi et courses", () => {
  it("ignore les jours sans saisie dans la moyenne 7 jours", () => {
    expect(averageLast7({ "2026-10-15": 10, "2026-10-13": 0 }, "2026-10-15")).toBe(5);
    expect(averageLast7({}, "2026-10-15")).toBeNull();
    expect(targetReached(5, 10)).toBe(false);
    expect(targetReached(null, 10)).toBeNull();
    expect(kpiPace(12, 10)).toBe("reached");
    expect(kpiPace(4, 10)).toBe("under");
    expect(kpiPace(4, null)).toBe("open");
    expect(kpiPace(null, 10)).toBe("empty");
    expect(weekDelta({ "2026-10-16": 10, "2026-10-09": 5 }, "2026-10-16")).toBeCloseTo(1);
    expect(weekDelta({ "2026-10-16": 10 }, "2026-10-16")).toBeNull();
    expect(shareRatio(1, 3)).toBeCloseTo(1 / 3);
    expect(shareRatio(4, 3)).toBe(1);
    expect(shareRatio(1, 0)).toBeNull();
    expect(kpiSeries({ "2026-10-16": 1, "2026-10-13": 0 })).toEqual([
      { date: "2026-10-13", value: 0 },
      { date: "2026-10-16", value: 1 },
    ]);
  });

  it("calcule l'écart RacTac vs Yango de la course importée", () => {
    const gap = courseGap({ app: 2400, yango: 1500, liv: 1500 });
    expect(gap).toBeCloseTo(60);
    const summary = coursesSummary([{ app: 2400, yango: 1500, liv: 1500 }]);
    expect(summary.avgLiv).toBe(1500);
    expect(summary.gap).toBeCloseTo(60);
  });
});
