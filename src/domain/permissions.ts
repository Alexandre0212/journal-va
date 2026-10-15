export type AppRole = "ADMIN" | "VENTURE_ARCHITECT";

const MEMBER_COLLECTIONS = new Set(["projects", "okrs", "tasks", "kpis", "infos", "courses", "anomalies"]);

export function isAdmin(role: AppRole): boolean {
  return role === "ADMIN";
}

export function canWriteCollection(role: AppRole, collection: string): boolean {
  if (isAdmin(role)) return true;
  return MEMBER_COLLECTIONS.has(collection);
}

export function canEditNotes(role: AppRole): boolean {
  return isAdmin(role);
}

export function canDeleteInfo(role: AppRole, authorId: string | null, actorId: string): boolean {
  if (isAdmin(role)) return true;
  return authorId != null && authorId === actorId;
}

export function canToggleProjectModules(role: AppRole): boolean {
  return isAdmin(role);
}
