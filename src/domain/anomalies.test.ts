import { describe, expect, it } from "vitest";
import { anomalyBoardCounts, anomalyFieldChanges } from "@/domain/anomalies";

describe("anomalies", () => {
  it("sépare les anomalies ouvertes, en cours et résolues", () => {
    expect(anomalyBoardCounts([
      { status: "open" },
      { status: "progress" },
      { status: "progress" },
      { status: "resolved" },
    ])).toEqual({ open: 1, progress: 2, resolved: 1 });
  });

  it("ne retient que les champs réellement modifiés", () => {
    const before = { projectId: "rpm", text: "Connexion", severity: "major" as const, status: "open" as const, assigneeId: null };
    expect(anomalyFieldChanges(before, before)).toEqual([]);
    expect(anomalyFieldChanges(before, { ...before, status: "progress", severity: "blocking" })).toEqual([
      { field: "severity", before: "major", after: "blocking" },
      { field: "status", before: "open", after: "progress" },
    ]);
  });
});
