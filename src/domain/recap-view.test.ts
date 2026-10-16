import { describe, expect, it } from "vitest";
import { emptyNotice, parseRecap } from "@/domain/recap-view";

const calculated = [
  "Récap calculé depuis les données du jeudi 15 octobre 2026. Aucune information n'a été ajoutée en dehors de ces enregistrements.",
  "## Tâches du jour",
  "- Aucun élément enregistré.",
  "## Progression des OKR",
  "- **RacTac** (MVP) : 9 % en moyenne sur 3 OKR. « Valider l'appli RacTac » à 26 % (Reste 45 jours) ; « Convention » à 0 %",
  "- Aucun OKR n'a bougé aujourd'hui.",
  "## Points bloquants",
  "Aucun blocage signalé.",
].join("\n");

describe("présentation des récaps", () => {
  it("structure un récap calculé sans recalculer les pourcentages", () => {
    const view = parseRecap(calculated);
    expect(view.lead).toContain("jeudi 15 octobre 2026");
    expect(emptyNotice(view.sections[0].lines)).toBe("Aucun élément enregistré.");
    expect(view.sections[1].projects[0]).toMatchObject({
      project: "RacTac",
      phase: "MVP",
      average: 9,
      items: [
        { title: "Valider l'appli RacTac", percent: 26, detail: "(Reste 45 jours)" },
        { title: "Convention", percent: 0, detail: "" },
      ],
    });
    expect(view.sections[1].lines).toEqual(["Aucun OKR n'a bougé aujourd'hui."]);
    expect(emptyNotice(view.sections[2].lines)).toBe("Aucun blocage signalé.");
  });

  it("conserve une phrase d'OKR qui n'a pas de pourcentage par objectif", () => {
    const view = parseRecap("## Progression des OKR\n- **SAFYA** : phase Validation, avancement moyen 0 % sur 3 OKR. Créés aujourd'hui.");
    expect(view.sections[0].projects[0]).toMatchObject({
      project: "SAFYA",
      phase: "Validation",
      average: 0,
      note: "avancement moyen 0 % sur 3 OKR. Créés aujourd'hui.",
    });
  });
});
