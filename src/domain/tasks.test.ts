import { describe, expect, it } from "vitest";
import { inLast7, onDay, stamp } from "@/domain/tasks";

describe("tâches", () => {
  it("rattache une action au jour par date, création ou historique", () => {
    expect(onDay({ date: "2026-10-14" }, "2026-10-14")).toBe(true);
    expect(onDay({ createdAt: "2026-10-14T18:00:00Z" }, "2026-10-14")).toBe(true);
    expect(onDay({ date: "2026-10-13", history: [{ at: "2026-10-14T18:00:00Z", status: "done" }] }, "2026-10-14")).toBe(true);
    expect(onDay({ date: "2026-10-13" }, "2026-10-14")).toBe(false);
  });

  it("compte les 7 derniers jours à partir de J-6", () => {
    expect(inLast7({ date: "2026-10-09" }, "2026-10-15")).toBe(true);
    expect(inLast7({ date: "2026-10-08" }, "2026-10-15")).toBe(false);
  });

  it("plafonne l'historique à 20 entrées et efface la raison hors blocage", () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      at: `2026-10-01T00:00:${String(i).padStart(2, "0")}Z`,
      status: "todo",
    }));
    const next = stamp({ status: "todo", history, blocker: "raison" }, "doing", "u_va_test", new Date("2026-10-15T12:00:00Z"));
    expect(next.history).toHaveLength(20);
    expect(next.blocker).toBeNull();
    expect(next.history?.at(-1)?.status).toBe("doing");
  });
});
