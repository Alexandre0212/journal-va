import { describe, expect, it } from "vitest";
import { courseTrashTitle, filterTrashRows, isRestorable, retentionDeadline, trashHeadline, TRASH_RETENTION_MS, type TrashRow } from "@/domain/trash";

const deleted = new Date("2026-10-16T12:00:00.000Z");

function row(partial: Partial<TrashRow> = {}): TrashRow {
  return {
    entity: "task",
    id: "t1",
    title: "Préparer le dossier SAFYA",
    project: "SAFYA",
    deletedAt: deleted.toISOString(),
    deletedDay: "2026-10-16",
    deadlineDay: "2026-11-15",
    author: "Guy Alexandre SANKARA",
    ...partial,
  };
}

describe("corbeille", () => {
  it("garde un élément restaurable pendant 30 jours exactement", () => {
    expect(retentionDeadline(deleted).getTime() - deleted.getTime()).toBe(TRASH_RETENTION_MS);
    expect(isRestorable(deleted, new Date(deleted.getTime() + TRASH_RETENTION_MS - 1))).toBe(true);
    expect(isRestorable(deleted, new Date(deleted.getTime() + TRASH_RETENTION_MS))).toBe(false);
    expect(isRestorable(deleted, new Date(deleted.getTime() - 1))).toBe(false);
  });

  it("formule le sous-titre selon le nombre réel", () => {
    expect(trashHeadline(0)).toBe("Rien à restaurer");
    expect(trashHeadline(1)).toBe("1 élément supprimé");
    expect(trashHeadline(3)).toBe("3 éléments supprimés");
  });

  it("nomme une course à partir de ses lieux", () => {
    expect(courseTrashTitle({ date: "2026-10-16", fromPlace: "Dakar", toPlace: "Thiès", note: null })).toBe("Dakar → Thiès");
    expect(courseTrashTitle({ date: "2026-10-16", fromPlace: null, toPlace: null, note: "Course client" })).toBe("Course client");
    expect(courseTrashTitle({ date: "2026-10-16", fromPlace: " ", toPlace: null, note: null })).toBe("Course du 2026-10-16");
  });

  it("filtre par texte, type, projet et jour", () => {
    const rows = [
      row(),
      row({ id: "k1", entity: "kpi", title: "Patients actifs", project: "TRIAGE+", deletedDay: "2026-10-15", author: null }),
      row({ id: "i1", entity: "info", title: "Note libre", project: null, deletedDay: "2026-10-16" }),
    ];
    expect(filterTrashRows(rows, { text: "safya", entity: "all", project: "all", day: "all" }).map((item) => item.id)).toEqual(["t1"]);
    expect(filterTrashRows(rows, { text: "", entity: "kpi", project: "all", day: "all" }).map((item) => item.id)).toEqual(["k1"]);
    expect(filterTrashRows(rows, { text: "", entity: "all", project: "__none__", day: "all" }).map((item) => item.id)).toEqual(["i1"]);
    expect(filterTrashRows(rows, { text: "", entity: "all", project: "all", day: "2026-10-15" }).map((item) => item.id)).toEqual(["k1"]);
  });
});
