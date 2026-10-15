import Link from "next/link";
import { MarkdownView } from "@/components/markdown-view";
import { plainRecap } from "@/domain/markdown";
import { GenerateRecap } from "@/features/forms";
import { formatDayLong, todayISO } from "@/lib/dates";
import { requireUser } from "@/server/auth/session";
import { loadSummaries } from "@/server/queries";

export default async function RecapsPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const summaries = await loadSummaries();
  const today = todayISO();
  const selected = summaries.find((item) => item.id === query.date) ?? summaries[0];
  const label = selected ? formatDayLong(selected.date) : formatDayLong(today);
  const plain = selected ? plainRecap(label, selected.text) : "";
  const subject = `Récap du studio Haskè — ${label}`;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Récapitulatifs</h1>
      <div className="flex flex-wrap gap-2">
        {summaries.map((item) => <Link key={item.id} className={`btn ${selected?.id === item.id ? "btn-primary" : ""}`} href={`/recaps?date=${item.id}`}>{item.date}</Link>)}
      </div>
      {selected ? (
        <article className="surface p-5">
          <p className="text-caption text-muted">{label}{selected.generatedAt ? ` · ${selected.imported ? "importé" : "calculé"}` : ""}</p>
          <div className="mt-3"><MarkdownView text={selected.text} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn" href={`/api/recaps/${selected.id}/markdown`}>Markdown</a>
            <a className="btn" href={`/api/recaps/${selected.id}/pdf`}>PDF</a>
            <a className="btn" target="_blank" rel="noreferrer" href={`https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`}>Outlook</a>
            <a className="btn" target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`}>Gmail</a>
            <a className="btn" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(plain)}`}>WhatsApp</a>
          </div>
        </article>
      ) : <p className="text-muted">Pas de récapitulatif.</p>}
      {user.role === "ADMIN" ? <GenerateRecap day={query.date && query.date <= today ? query.date : today} /> : null}
    </div>
  );
}
