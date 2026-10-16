import { describe, expect, it } from "vitest";
import { assignableMembers, memberInitials, memberRoleChangeError, teamHeadline } from "@/domain/team";

describe("équipe", () => {
  it("retire le compte de test des responsables proposés", () => {
    const members = assignableMembers([
      { id: "u_ben", name: "Ben Diop", isTest: false },
      { id: "u_va_test", name: "VA Test", isTest: true },
      { id: "u_elias", name: "Elias Bâ", isTest: false },
    ]);
    expect(members.map((member) => member.id)).toEqual(["u_ben", "u_elias"]);
  });

  it("calcule des initiales stables", () => {
    expect(memberInitials("Ben Diop")).toBe("BD");
    expect(memberInitials("Fatoumata Bintou Sonko")).toBe("FS");
    expect(memberInitials("Michael Goudiaby")).toBe("MG");
    expect(memberInitials("Guy Alexandre Sankara")).toBe("AS");
    expect(memberInitials("Ndeye Amy Sam")).toBe("NAS");
    expect(memberInitials("Elias Bâ")).toBe("EB");
    expect(memberInitials("Awa Ndiaye")).toBe("AN");
  });

  it("résume les membres sans compter les administrateurs", () => {
    expect(teamHeadline(6, 0)).toBe("6 membres · Haskè Ventures");
    expect(teamHeadline(5, 1)).toBe("5 membres actifs · 1 inactif");
  });

  it("protège le dernier administrateur et le compte courant", () => {
    const admins = [{ id: "u_alexandre_sankara", active: true }];
    expect(memberRoleChangeError({
      actorId: "u_alexandre_sankara",
      memberId: "u_alexandre_sankara",
      nextActive: false,
      nextRole: "ADMIN",
      admins,
    })).toBe("Vous ne pouvez pas désactiver votre propre compte.");
    expect(memberRoleChangeError({
      actorId: "u_ben_diop",
      memberId: "u_alexandre_sankara",
      nextActive: true,
      nextRole: "VENTURE_ARCHITECT",
      admins,
    })).toBe("Le studio doit conserver un administrateur actif.");
  });
});
