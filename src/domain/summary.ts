import { formatDayLong } from "@/lib/dates";
import { formatPercent, okrRatio, paceText, type OkrInput } from "@/domain/okr";
import { PHASES } from "@/domain/phases";

export type SummaryFacts = {
  day: string;
  done: string[];
  started: string[];
  blocked: Array<{ title: string; project: string; reason: string | null }>;
  infos: Array<{ project: string; text: string; source: string | null; channel: string }>;
  okrs: Array<{ project: string; phase: number; title: string; okr: OkrInput }>;
  upcoming: string[];
};

function bullets(lines: string[]): string {
  if (!lines.length) return "- Aucun élément enregistré.";
  return lines.map((line) => `- ${line}`).join("\n");
}

export function buildSummary(facts: SummaryFacts, now: Date = new Date()): string {
  const byProject = new Map<string, SummaryFacts["okrs"]>();
  for (const row of facts.okrs) {
    const list = byProject.get(row.project) ?? [];
    list.push(row);
    byProject.set(row.project, list);
  }
  const okrLines: string[] = [];
  for (const [project, rows] of byProject) {
    const ratios = rows.map((row) => okrRatio(row.okr));
    const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const phase = PHASES[rows[0]?.phase ?? 0]?.name ?? "";
    const details = rows
      .map((row) => {
        const pace = row.okr.due ? paceText(row.okr.due, row.okr.keyResults[0] ?? { target: 0, current: 0 }, now) : null;
        return `« ${row.title} » à ${formatPercent(okrRatio(row.okr))}${pace ? ` (${pace})` : ""}`;
      })
      .join(" ; ");
    okrLines.push(`**${project}** (${phase}) : ${formatPercent(avg)} en moyenne sur ${rows.length} OKR. ${details}`);
  }

  return [
    `Récap calculé depuis les données du ${formatDayLong(facts.day)}. Aucune information n'a été ajoutée en dehors de ces enregistrements.`,
    "## Tâches du jour",
    bullets([
      ...facts.done.map((title) => `Fait : ${title}`),
      ...facts.started.map((title) => `En cours : ${title}`),
    ]),
    "## Infos reçues",
    bullets(
      facts.infos.map(
        (info) => `**${info.project}** : ${info.text}${info.source ? ` (${info.source}, ${info.channel})` : ` (${info.channel})`}`,
      ),
    ),
    "## Progression des OKR",
    bullets(okrLines),
    "## Points bloquants",
    bullets(
      facts.blocked.map(
        (item) => `${item.project} — ${item.title}${item.reason ? ` : ${item.reason}` : ""}`,
      ),
    ),
    "## À venir",
    bullets(facts.upcoming),
  ].join("\n");
}
