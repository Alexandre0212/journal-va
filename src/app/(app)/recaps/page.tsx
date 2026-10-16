import { RecapsBoard } from "@/features/recaps-board";
import { todayISO } from "@/lib/dates";
import { requireUser } from "@/server/auth/session";
import { loadSummaries } from "@/server/queries";

export default async function RecapsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const summaries = await loadSummaries();
  return (
    <div className="page">
      <RecapsBoard
        today={todayISO()}
        canGenerate={user.role === "ADMIN"}
        initialId={query.date ?? summaries[0]?.id ?? ""}
        summaries={summaries.map((item) => ({
          id: item.id,
          date: item.date,
          text: item.text,
          imported: item.imported,
          generatedAt: item.generatedAt?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
