import { describe, expect, it } from "vitest";
import { formatPercent, krRatio, okrPace, okrRatio, paceText } from "@/domain/okr";

const safya = {
  keyResults: [
    { current: 0, target: 95 },
    { current: 0, target: 100 },
    { current: 0, target: 1 },
    { current: 0, target: 100 },
    { current: 4, target: 20 },
  ],
};

describe("okr", () => {
  it("borne un résultat clé entre 0 et 1", () => {
    expect(krRatio({ current: 4, target: 20 })).toBeCloseTo(0.2);
    expect(krRatio({ current: 120, target: 100 })).toBe(1);
    expect(krRatio({ current: -3, target: 10 })).toBe(0);
    expect(krRatio({ current: 5, target: 0 })).toBe(0);
  });

  it("reproduit les 4 % de SAFYA « Prouver que SAFYA fonctionne »", () => {
    expect(formatPercent(okrRatio(safya))).toBe("4 %");
  });

  it("signale une échéance dépassée", () => {
    const text = paceText("2020-01-01", { current: 1, target: 10, unit: "cas" }, new Date("2026-10-15T12:00:00Z"));
    expect(text).toContain("Échéance dépassée");
    expect(text).toContain("9");
  });

  it("classe un objectif selon la progression et l'échéance", () => {
    const open = { due: "2026-10-20", keyResults: [{ current: 4, target: 20 }] };
    expect(okrPace(open, "2026-10-16")).toBe("active");
    expect(okrPace({ due: "2026-10-01", keyResults: [{ current: 0, target: 10 }] }, "2026-10-16")).toBe("late");
    expect(okrPace({ due: "2026-10-01", keyResults: [{ current: 10, target: 10 }] }, "2026-10-16")).toBe("done");
    expect(okrPace({ due: null, keyResults: [{ current: 0, target: 10 }] }, "2026-10-16")).toBe("idle");
  });

  it("calcule le rythme hebdomadaire", () => {
    const text = paceText("2026-10-29", { current: 0, target: 14, unit: "cas" }, new Date("2026-10-15T12:00:00Z"));
    expect(text).toContain("semaine");
    expect(text).toContain("cas");
  });
});
