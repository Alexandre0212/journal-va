export type MemberRole = "ADMIN" | "VENTURE_ARCHITECT";

export function assignableMembers<T extends { isTest: boolean }>(members: readonly T[]): T[] {
  return members.filter((member) => !member.isTest);
}

const PREFERRED_INITIALS: Record<string, string> = {
  "ben diop": "BD",
  "fatoumata bintou sonko": "FS",
  "michael goudiaby": "MG",
  "guy alexandre sankara": "AS",
  "ndeye amy sam": "NAS",
  "elias ba": "EB",
};

export function memberInitials(name: string) {
  const key = name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  const preferred = PREFERRED_INITIALS[key];
  if (preferred) return preferred;
  const parts = key.split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : parts[0]?.[1] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "•";
}

export function teamHeadline(active: number, inactive: number) {
  const members = `${active} membre${active > 1 ? "s" : ""}`;
  if (inactive === 0) return `${members} · Haskè Ventures`;
  return `${members} actif${active > 1 ? "s" : ""} · ${inactive} inactif${inactive > 1 ? "s" : ""}`;
}

export function memberRoleChangeError(input: {
  actorId: string;
  memberId: string;
  nextActive: boolean;
  nextRole: MemberRole;
  admins: Array<{ id: string; active: boolean }>;
}) {
  if (input.actorId === input.memberId && !input.nextActive) return "Vous ne pouvez pas désactiver votre propre compte.";
  const demotesLastAdmin = input.nextRole !== "ADMIN" || !input.nextActive;
  const otherActiveAdmin = input.admins.some((admin) => admin.id !== input.memberId && admin.active);
  if (demotesLastAdmin && !otherActiveAdmin) return "Le studio doit conserver un administrateur actif.";
  return null;
}
