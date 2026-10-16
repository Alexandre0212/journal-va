import { parseMarkdown } from "@/domain/markdown";

export type RecapOkrItem = { title: string; percent: number | null; detail: string };
export type RecapProject = {
  project: string;
  phase: string | null;
  average: number | null;
  items: RecapOkrItem[];
  note: string | null;
};
export type RecapSection = { title: string; lines: string[]; projects: RecapProject[] };
export type RecapView = { lead: string; sections: RecapSection[] };

export function parseRecap(source: string): RecapView {
  const lead: string[] = [];
  const sections: RecapSection[] = [];
  let current: RecapSection | null = null;
  for (const block of parseMarkdown(source)) {
    if (block.type === "h") {
      current = { title: block.text, lines: [], projects: [] };
      sections.push(current);
      continue;
    }
    const lines = block.type === "ul" ? block.items : [block.text];
    if (!current) {
      lead.push(...lines);
      continue;
    }
    for (const line of lines) {
      if (current.title !== "Progression des OKR") {
        current.lines.push(line);
        continue;
      }
      const project = parseOkrBullet(line);
      if (project) current.projects.push(project);
      else current.lines.push(line);
    }
  }
  return { lead: lead.join("\n"), sections };
}

export function emptyNotice(lines: string[]): string | null {
  if (lines.length !== 1) return null;
  const line = lines[0].replace(/\*\*/g, "").trim();
  return /^aucun|^aucune/i.test(line) ? line : null;
}

function parseOkrBullet(raw: string): RecapProject | null {
  const text = raw.replace(/\*\*/g, "").trim();
  const head = text.match(/^([^:(]+?)(?: \(([^)]+)\))?\s*:/);
  if (!head) return null;
  const phaseInline = text.match(/phase\s+([^,]+)/i);
  const averageMatch = text.match(/(\d+)\s*%\s+en moyenne/i) ?? text.match(/avancement moyen\s+(\d+)\s*%/i);
  const note = text.slice(head[0].length).trim().replace(/^phase\s+[^,]+,\s*/i, "");
  const items: RecapOkrItem[] = [];
  for (const match of text.matchAll(/« ([^»]+) »([^«]*)/g)) {
    const chunk = match[2].replace(/\s*;\s*$/, "").trim();
    const explicit = chunk.match(/à\s*(\d+)\s*%/);
    const percents = [...chunk.matchAll(/(\d+)\s*%/g)];
    const percent = explicit ? Number(explicit[1]) : percents.length === 1 ? Number(percents[0][1]) : null;
    const detail = chunk.replace(/^à\s*\d+\s*%\s*/, "").replace(/^[,:]\s*/, "").replace(/^et$/i, "").trim();
    items.push({ title: match[1].trim(), percent, detail });
  }
  return {
    project: head[1].trim(),
    phase: head[2]?.trim() ?? phaseInline?.[1]?.trim() ?? null,
    average: averageMatch ? Number(averageMatch[1]) : null,
    items,
    note: items.length ? null : note,
  };
}
