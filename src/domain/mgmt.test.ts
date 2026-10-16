import { describe, expect, it } from "vitest";
import { mgmtCounts } from "@/domain/mgmt";

describe("pilotage", () => {
  it("compte les sept sujets clos du 13 octobre sans les compter deux fois", () => {
    const counts = mgmtCounts(Array.from({ length: 7 }, () => ({ status: "done" as const })));
    expect(counts).toEqual({ total: 7, done: 7, doing: 0, todo: 0 });
    expect(counts.done + counts.doing + counts.todo).toBe(counts.total);
  });

  it("sépare clos, en cours et à traiter", () => {
    const counts = mgmtCounts([
      { status: "done" },
      { status: "doing" },
      { status: "todo" },
      { status: "todo" },
    ]);
    expect(counts).toEqual({ total: 4, done: 1, doing: 1, todo: 2 });
  });
});
