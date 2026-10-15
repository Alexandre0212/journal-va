/** Réécrit une entrée de pilotage à l'import. Le fichier source n'est pas modifié. */
export function normalizeMgmtText(id: string, text: string): { text: string; changed: boolean } {
  if (id !== "m-1013-06") return { text, changed: false };
  const next = "GitHub haskeventures branché au récap du soir (SAFYA, TRIAGE+)";
  return { text: next, changed: text !== next };
}
