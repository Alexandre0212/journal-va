export type AnomalySeverity = "minor" | "major" | "blocking";
export type AnomalyStatus = "open" | "progress" | "resolved";

export function anomalyFieldChanges(
  before: { projectId: string; text: string; severity: AnomalySeverity; status: AnomalyStatus; assigneeId: string | null },
  after: { projectId: string; text: string; severity: AnomalySeverity; status: AnomalyStatus; assigneeId: string | null },
) {
  const fields = ["projectId", "text", "severity", "status", "assigneeId"] as const;
  return fields.flatMap((field) => (
    before[field] === after[field] ? [] : [{ field, before: before[field], after: after[field] }]
  ));
}

export function anomalyBoardCounts(items: Array<{ status: AnomalyStatus }>) {
  return {
    open: items.filter((item) => item.status === "open").length,
    progress: items.filter((item) => item.status === "progress").length,
    resolved: items.filter((item) => item.status === "resolved").length,
  };
}
