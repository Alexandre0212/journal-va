"use client";

import { AlertTriangle, BarChart3, Calendar, ChevronRight, Clock, FileText, Info, ListChecks, Loader2, Mail, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { emptyNotice, parseRecap, type RecapProject, type RecapSection } from "@/domain/recap-view";
import { plainRecap } from "@/domain/markdown";
import { TIMEZONE, dayOfInstant, formatDayLong, formatTime } from "@/lib/dates";
import { generateSummary } from "@/server/actions";

export type RecapRecord = {
  id: string;
  date: string;
  text: string;
  imported: boolean;
  generatedAt: string | null;
};

const TONE: Record<string, string> = {
  "Tâches du jour": "info",
  "Infos reçues": "info",
  "Progression des OKR": "okr",
  "Points bloquants": "alert",
  "À venir": "soon",
};

export function RecapsBoard({ summaries, initialId, today, canGenerate }: { summaries: RecapRecord[]; initialId: string; today: string; canGenerate: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState(summaries);
  const [synced, setSynced] = useState(summaries);
  const [selectedId, setSelectedId] = useState(initialId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (synced !== summaries) {
    setSynced(summaries);
    setRows(summaries);
  }
  const selected = rows.find((item) => item.id === selectedId) ?? rows[0] ?? null;
  const view = selected ? parseRecap(selected.text) : null;
  const label = selected ? formatDayLong(selected.date) : formatDayLong(today);
  const plain = selected ? plainRecap(label, selected.text) : "";
  const subject = `Récap du studio Haskè — ${label}`;
  const banner = view ? bannerLines(view.lead) : [];

  function choose(id: string) {
    setSelectedId(id);
    setError("");
    const url = new URL(window.location.href);
    url.searchParams.set("date", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  function calculate() {
    if (!selected || pending) return;
    const day = selected.date <= today ? selected.date : today;
    setPending(true);
    setError("");
    void generateSummary(day).then((result) => {
      setPending(false);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success("Récapitulatif calculé");
      router.refresh();
    });
  }

  return (
    <div className="recap-page">
      <header className="task-mast">
        <div className="task-mast-copy">
          <p className="text-caption text-accent-text">Mesure</p>
          <h1 className="text-h1">Récapitulatifs</h1>
          <p className="text-small text-muted">Consultez et générez des récapitulatifs basés sur vos données de projet.</p>
          <span className="mast-rule" />
        </div>
      </header>

      <div className="recap-layout">
        <aside className="recap-library">
          <header>
            <span className="recap-ico"><Calendar size={16} aria-hidden /></span>
            <div>
              <h2>Rapports disponibles</h2>
              <p>{rows.length > 1 ? `${rows.length} rapports conservés` : `${rows.length} rapport conservé`}</p>
            </div>
          </header>
          {rows.length ? (
            <div className="recap-dates" role="listbox" aria-label="Dates des récaps">
              {rows.map((item) => {
                const on = item.id === selected?.id;
                return (
                  <button key={item.id} type="button" role="option" aria-selected={on} className={on ? "is-on" : ""} onClick={() => choose(item.id)}>
                    <Calendar size={15} aria-hidden />
                    <span>{formatListDay(item.date)}</span>
                    <ChevronRight size={16} aria-hidden />
                  </button>
                );
              })}
            </div>
          ) : <p className="recap-empty">Pas de récapitulatif.</p>}
        </aside>

        <article className="recap-report" key={selected?.id ?? "vide"}>
          {selected && view ? (
            <>
              <header className="recap-report-head">
                <div>
                  <p>Rapport du studio</p>
                  <h2>{label}</h2>
                  <span>{selected.imported ? "Texte importé, conservé tel quel." : "Calculé depuis les données de vos projets."}</span>
                </div>
                <div className="recap-meta">
                  <p><Calendar size={15} aria-hidden /><span>Date du rapport</span><strong>{label}</strong></p>
                  {selected.generatedAt ? <p><Clock size={15} aria-hidden /><span>Généré le</span><strong>{formatGenerated(selected.generatedAt)}</strong></p> : null}
                </div>
              </header>
              {banner.length ? (
                <div className="recap-banner">
                  <Info size={16} aria-hidden />
                  <div>{banner.map((line) => <p key={line}>{line}</p>)}</div>
                </div>
              ) : null}
              {view.sections.map((section) => <Section key={section.title} section={section} />)}
              <footer className="recap-actions">
                <div>
                  <span>Exporter le rapport</span>
                  <a className="recap-export" href={`/api/recaps/${selected.id}/markdown`}><FileText size={15} aria-hidden /> Markdown</a>
                  <a className="recap-export" href={`/api/recaps/${selected.id}/pdf`}><FileText size={15} aria-hidden /> PDF</a>
                  <a className="recap-export" target="_blank" rel="noreferrer" href={`https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`}><Mail size={15} aria-hidden /> Outlook</a>
                  <a className="recap-export" target="_blank" rel="noreferrer" href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`}><Mail size={15} aria-hidden /> Gmail</a>
                </div>
                {canGenerate ? <button type="button" className="btn btn-primary recap-calc" disabled={pending} onClick={calculate}>{pending ? <Loader2 className="okr-spin" size={16} aria-hidden /> : <BarChart3 size={16} aria-hidden />}{pending ? "Calcul…" : "Calculer le récap depuis les données"}</button> : null}
              </footer>
              {error ? <p className="recap-error" role="alert">{error}</p> : null}
            </>
          ) : (
            <p className="recap-empty">Pas de récapitulatif enregistré.</p>
          )}
          {!selected && canGenerate ? <button type="button" className="btn btn-primary recap-calc" disabled={pending} onClick={() => { setPending(true); void generateSummary(today).then((result) => { setPending(false); if (!result.ok) { setError(result.error); toast.error(result.error); return; } toast.success("Récapitulatif calculé"); router.refresh(); }); }}><BarChart3 size={16} aria-hidden /> Calculer le récap depuis les données</button> : null}
        </article>
      </div>
    </div>
  );
}

function Section({ section }: { section: RecapSection }) {
  const tone = TONE[section.title] ?? "extra";
  const notice = section.projects.length ? null : emptyNotice(section.lines);
  return (
    <section className={`recap-block recap-block-${tone}`}>
      <h3>{iconFor(section.title)} {section.title}</h3>
      {notice ? <p className="recap-muted">{notice}</p> : null}
      {section.projects.map((project) => <ProjectBlock key={`${project.project}-${project.phase ?? ""}`} project={project} />)}
      {!notice && section.lines.length ? (
        <ul>{section.lines.map((line, index) => <li key={`${line}-${index}`}><Rich text={line} /></li>)}</ul>
      ) : null}
    </section>
  );
}

function ProjectBlock({ project }: { project: RecapProject }) {
  return (
    <article className="recap-okr">
      <header>
        <strong>{project.project}</strong>
        {project.phase ? <span>{project.phase}</span> : null}
        {project.average != null ? <em>{project.average} %</em> : null}
      </header>
      {project.average != null ? <Bar value={project.average} /> : null}
      {project.items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="recap-kr">
          <p><strong>{item.title}</strong>{item.percent != null ? <em>{item.percent} %</em> : null}</p>
          {item.percent != null ? <Bar value={item.percent} /> : null}
          {item.detail ? <span><Rich text={item.detail} /></span> : null}
        </div>
      ))}
      {project.note ? <p><Rich text={project.note} /></p> : null}
    </article>
  );
}

function Bar({ value }: { value: number }) {
  return <span className="recap-bar" aria-hidden><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>;
}

function Rich({ text }: { text: string }) {
  const parts = text.split("**");
  return parts.map((part, index) => index % 2 === 1 ? <strong key={index}>{part}</strong> : <span key={index}>{part}</span>);
}

function iconFor(title: string): ReactNode {
  if (title === "Tâches du jour") return <ListChecks size={16} aria-hidden />;
  if (title === "Infos reçues") return <FileText size={16} aria-hidden />;
  if (title === "Progression des OKR") return <Target size={16} aria-hidden />;
  if (title === "Points bloquants") return <AlertTriangle size={16} aria-hidden />;
  if (title === "À venir") return <Clock size={16} aria-hidden />;
  return <FileText size={16} aria-hidden />;
}

function bannerLines(lead: string): string[] {
  if (!lead) return [];
  if (lead.startsWith("Récap calculé")) {
    const index = lead.indexOf(". ");
    if (index > 0) return [lead.slice(0, index + 1), lead.slice(index + 2)];
  }
  return [lead];
}

function formatListDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatGenerated(iso: string): string {
  const day = dayOfInstant(iso);
  if (!day) return formatTime(iso);
  const [year, month, date] = day.split("-").map(Number);
  const written = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, day: "numeric", month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, date, 12)));
  return `${written} · ${formatTime(iso)}`;
}
