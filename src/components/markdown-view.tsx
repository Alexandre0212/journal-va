import { parseMarkdown } from "@/domain/markdown";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, index) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part}</span>,
  );
}

export function MarkdownView({ text }: { text: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="flex max-w-[75ch] flex-col gap-2">
      {blocks.map((block, index) => {
        if (block.type === "h") return <h3 key={index} className="text-h3 mt-2">{block.text}</h3>;
        if (block.type === "p") return <p key={index}>{inline(block.text)}</p>;
        return (
          <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
            {block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}
          </ul>
        );
      })}
    </div>
  );
}
