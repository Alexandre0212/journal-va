import { describe, expect, it } from "vitest";
import { canDeleteInfo, canEditNotes, canEditProject, canWriteCollection } from "@/domain/permissions";

describe("permissions", () => {
  it("réserve notes et récaps aux administrateurs", () => {
    expect(canEditNotes("ADMIN")).toBe(true);
    expect(canEditNotes("VENTURE_ARCHITECT")).toBe(false);
    expect(canWriteCollection("VENTURE_ARCHITECT", "tasks")).toBe(true);
    expect(canWriteCollection("VENTURE_ARCHITECT", "summaries")).toBe(false);
  });

  it("interdit à un venture architect de modifier un projet", () => {
    expect(canEditProject("ADMIN")).toBe(true);
    expect(canEditProject("VENTURE_ARCHITECT")).toBe(false);
  });

  it("laisse un venture architect retirer seulement ses infos", () => {
    expect(canDeleteInfo("VENTURE_ARCHITECT", "u_va_test", "u_va_test")).toBe(true);
    expect(canDeleteInfo("VENTURE_ARCHITECT", "u_5MKSBjCyBoc8Pi6hC78kuQ", "u_va_test")).toBe(false);
    expect(canDeleteInfo("ADMIN", "u_va_test", "u_alexandre_sankara")).toBe(true);
  });
});
