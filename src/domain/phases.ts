export const PHASES = [
  {
    index: 0,
    name: "Challenge",
    tip: "Identifier un problème de marché et décider s'il mérite d'être exploré.",
    color: "#23358E",
    on: "#FFFFFF",
  },
  {
    index: 1,
    name: "Discovery",
    tip: "Comprendre les utilisateurs, le marché et la concurrence.",
    color: "#5B4BC4",
    on: "#FFFFFF",
  },
  {
    index: 2,
    name: "Validation",
    tip: "Prouver la demande et la volonté de payer avec de vrais clients.",
    color: "#0B7A80",
    on: "#FFFFFF",
  },
  {
    index: 3,
    name: "MVP",
    tip: "Construire la première version utilisable du produit.",
    color: "#2E7D32",
    on: "#FFFFFF",
  },
  {
    index: 4,
    name: "Launch",
    tip: "Mettre le produit sur le marché et signer les premiers clients.",
    color: "#E79409",
    on: "#18243A",
  },
  {
    index: 5,
    name: "Grow",
    tip: "Trouver la traction et un modèle d'acquisition répétable.",
    color: "#C0400F",
    on: "#FFFFFF",
  },
  {
    index: 6,
    name: "Scale",
    tip: "Industrialiser, lever des fonds et étendre à de nouveaux marchés.",
    color: "#A3195B",
    on: "#FFFFFF",
  },
] as const;

export const MISSION =
  "Transformer des opportunités de marché en entreprises à fort potentiel, en réunissant stratégie, entrepreneuriat, capital et exécution.";

export const PROJECT_ACCENTS: Record<string, string> = {
  safya: "#1F5F4D",
  triage: "#F87000",
  rpm: "#F0B030",
};

export const PROJECT_LOGOS: Record<string, string> = {
  safya: "/logos/safya.png",
  triage: "/logos/triage-plus.png",
  rpm: "/logos/ractac.png",
};

export function phaseByIndex(index: number) {
  return PHASES[index] ?? PHASES[0];
}
