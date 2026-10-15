export type MdBlock =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export function parseMarkdown(source: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  let list: string[] | null = null;
  const flush = () => {
    if (list) {
      blocks.push({ type: "ul", items: list });
      list = null;
    }
  };
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("- ")) {
      if (!list) list = [];
      list.push(line.slice(2));
      continue;
    }
    flush();
    if (line.startsWith("## ")) blocks.push({ type: "h", text: line.slice(3) });
    else blocks.push({ type: "p", text: line });
  }
  flush();
  return blocks;
}

export function plainRecap(dayLabel: string, text: string): string {
  const body = text.replace(/\*\*/g, "").replace(/^## (.*)$/gm, (_m, title: string) => title.toUpperCase());
  return `Récap du studio Haskè — ${dayLabel}\n\n${body}`;
}
