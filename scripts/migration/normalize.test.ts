import { describe, expect, it } from "vitest";
import { normalizeMgmtText } from "./normalize";

describe("normalizeMgmtText", () => {
  it("remplace uniquement l'entrée m-1013-06", () => {
    const result = normalizeMgmtText("m-1013-06", "texte source");
    expect(result.changed).toBe(true);
    expect(result.text).toBe("GitHub haskeventures branché au récap du soir (SAFYA, TRIAGE+)");
    expect(normalizeMgmtText("m-1013-01", "inchangé").changed).toBe(false);
  });
});
