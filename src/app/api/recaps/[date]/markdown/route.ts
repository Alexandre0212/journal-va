import { requireUser } from "@/server/auth/session";
import { loadSummary } from "@/server/queries";

export async function GET(_request: Request, context: { params: Promise<{ date: string }> }) {
  await requireUser();
  const { date } = await context.params;
  const summary = await loadSummary(date);
  if (!summary) return new Response("Introuvable", { status: 404 });
  return new Response(summary.text, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="recap-${date}.md"`,
    },
  });
}
