export type ProjectSnapshot = {
  name: string;
  phase: number;
  coursesEnabled: boolean;
  anomaliesEnabled: boolean;
  leadId: string | null;
  participantIds: string[];
};

export type ProjectChange = { field: string; before: string | null; after: string | null };

function members(ids: string[]) {
  const value = [...ids].sort().join(",");
  return value || null;
}

export function projectFieldChanges(before: ProjectSnapshot, after: ProjectSnapshot): ProjectChange[] {
  const changes: ProjectChange[] = [];
  if (before.name !== after.name) changes.push({ field: "name", before: before.name, after: after.name });
  if (before.phase !== after.phase) changes.push({ field: "phase", before: String(before.phase), after: String(after.phase) });
  if (before.leadId !== after.leadId) changes.push({ field: "lead", before: before.leadId, after: after.leadId });
  if (before.coursesEnabled !== after.coursesEnabled) changes.push({ field: "coursesEnabled", before: String(before.coursesEnabled), after: String(after.coursesEnabled) });
  if (before.anomaliesEnabled !== after.anomaliesEnabled) changes.push({ field: "anomaliesEnabled", before: String(before.anomaliesEnabled), after: String(after.anomaliesEnabled) });
  const previous = members(before.participantIds);
  const next = members(after.participantIds);
  if (previous !== next) changes.push({ field: "participants", before: previous, after: next });
  return changes;
}
