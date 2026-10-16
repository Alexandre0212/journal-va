import { describe, expect, it } from "vitest";
import { projectFieldChanges } from "@/domain/projects";

const current = {
  name: "SAFYA",
  phase: 2,
  coursesEnabled: false,
  anomaliesEnabled: false,
  leadId: "u_lead",
  participantIds: ["u_b", "u_a"],
};

describe("projectFieldChanges", () => {
  it("n'enregistre rien si le projet est inchangé", () => {
    expect(projectFieldChanges(current, { ...current, participantIds: ["u_a", "u_b"] })).toEqual([]);
  });

  it("décrit le nom, le responsable, les participants et les modules", () => {
    expect(projectFieldChanges(current, {
      ...current,
      name: "SAFYA Santé",
      leadId: null,
      coursesEnabled: true,
      participantIds: ["u_a"],
    })).toEqual([
      { field: "name", before: "SAFYA", after: "SAFYA Santé" },
      { field: "lead", before: "u_lead", after: null },
      { field: "coursesEnabled", before: "false", after: "true" },
      { field: "participants", before: "u_a,u_b", after: "u_a" },
    ]);
  });
});
