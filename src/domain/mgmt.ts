export type MgmtStatus = "todo" | "doing" | "done";

export function mgmtCounts(items: Array<{ status: MgmtStatus }>) {
  const done = items.filter((item) => item.status === "done").length;
  const doing = items.filter((item) => item.status === "doing").length;
  const todo = items.filter((item) => item.status === "todo").length;
  return { total: items.length, done, doing, todo };
}
