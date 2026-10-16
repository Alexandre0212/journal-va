"use client";

import { AlertTriangle, Check, Clock, List, Loader2, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { mgmtCounts, type MgmtStatus } from "@/domain/mgmt";
import { TIMEZONE, formatDayLong } from "@/lib/dates";
import { saveMgmt, setMgmtStatus } from "@/server/actions";

export type PilotItem = {
  id: string;
  text: string;
  status: MgmtStatus;
  date: string;
  createdAt: string;
};

const STATUS = {
  done: { label: "Fait", tone: "good" },
  doing: { label: "En cours", tone: "progress" },
  todo: { label: "À traiter", tone: "late" },
} as const;

const SCOPES = [
  { id: "", label: "Tous les projets" },
  { id: "studio", label: "Studio" },
  { id: "safya", label: "SAFYA" },
  { id: "triage", label: "TRIAGE+" },
  { id: "rpm", label: "RacTac" },
] as const;

export function PilotageBoard({ items, today }: { items: PilotItem[]; today: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(items);
  const [synced, setSynced] = useState(items);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<MgmtStatus>("done");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [scope, setScope] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  if (synced !== items) {
    setSynced(items);
    setRows(items);
  }
  const counts = mgmtCounts(rows);
  const dates = [...new Set(rows.map((item) => item.date))].sort((a, b) => b.localeCompare(a));
  const filtering = Boolean(query || statusFilter || dateFilter || scope);
  const visible = rows.filter((item) => matches(item, { query, statusFilter, dateFilter, scope }));
  const groups = dates.filter((day) => visible.some((item) => item.date === day));

  useEffect(() => {
    if (!menuId) return;
    function close(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(".pilot-menu, .pilot-more")) setMenuId(null);
    }
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuId]);

  function focusComposer() {
    document.getElementById("pilot-compose")?.scrollIntoView({ behavior: "smooth", block: "center" });
    document.getElementById("pilot-text")?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) {
      setError("Décrivez le sujet avant de l'ajouter.");
      return;
    }
    setPending(true);
    setError("");
    void saveMgmt({ text: value, status, date: today }).then((result) => {
      setPending(false);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setText("");
      setStatus("done");
      toast.success("Sujet ajouté");
      router.refresh();
    });
  }

  function changeStatus(id: string, next: MgmtStatus) {
    const previous = rows;
    const current = previous.find((item) => item.id === id);
    if (!current || current.status === next) {
      setMenuId(null);
      return;
    }
    setRows(previous.map((item) => item.id === id ? { ...item, status: next } : item));
    setMenuId(null);
    void setMgmtStatus(id, next).then((result) => {
      if (!result.ok) {
        setRows(previous);
        toast.error(result.error);
        return;
      }
      toast.success("Statut enregistré");
      router.refresh();
    });
  }

  return (
    <div className="pilot-page">
      <header className="task-mast">
        <div className="task-mast-copy">
          <p className="text-caption text-accent-text">Studio</p>
          <h1 className="text-h1">Pilotage du studio</h1>
          <p className="text-small text-muted">Suivez et gérez les sujets clés du studio.</p>
          <span className="mast-rule" />
        </div>
        <button type="button" className="btn btn-primary pilot-add" onClick={focusComposer}><Plus size={16} aria-hidden /> Ajouter un sujet</button>
      </header>

      <section className="pilot-stats" aria-label="Synthèse du pilotage">
        <Metric tint="#23358E" wash="#EEF2FF" icon={<List size={16} />} value={counts.total} label="Sujets au total" detail="Tous les sujets de pilotage" pressed={!statusFilter} onClick={() => setStatusFilter("")} />
        <Metric tint="#1F7A45" wash="#E7F6EE" icon={<Check size={16} />} value={counts.done} label="Sujets clos" detail="Traités avec succès" pressed={statusFilter === "done"} onClick={() => setStatusFilter(statusFilter === "done" ? "" : "done")} />
        <Metric tint="#E79409" wash="#FFF6E6" icon={<Clock size={16} />} value={counts.doing} label="Sujets en cours" detail="En cours de traitement" pressed={statusFilter === "doing"} onClick={() => setStatusFilter(statusFilter === "doing" ? "" : "doing")} />
        <Metric tint="#B42318" wash="#FDECEC" icon={<AlertTriangle size={16} />} value={counts.todo} label="Sujets ouverts" detail="Nécessite une action" pressed={statusFilter === "todo"} onClick={() => setStatusFilter(statusFilter === "todo" ? "" : "todo")} />
      </section>

      <form id="pilot-compose" className="pilot-compose" onSubmit={submit}>
        <div>
          <h2>Ajouter un sujet pour aujourd&apos;hui</h2>
          <p>{formatDayLong(today)}</p>
        </div>
        <label className="pilot-grow">
          <span className="sr-only">Description du sujet</span>
          <input id="pilot-text" className="control" maxLength={200} placeholder="Décrivez un sujet à suivre, une action ou un point d'attention..." value={text} onChange={(event) => setText(event.target.value)} />
        </label>
        <label>
          <span className="sr-only">Statut</span>
          <select className="control" aria-label="Statut du nouveau sujet" value={status} onChange={(event) => setStatus(event.target.value as MgmtStatus)}>
            <option value="done">Fait</option>
            <option value="doing">En cours</option>
            <option value="todo">À traiter</option>
          </select>
        </label>
        <button className="btn btn-primary pilot-submit" type="submit" disabled={pending}>{pending ? <Loader2 className="okr-spin" size={16} aria-hidden /> : null}{pending ? "Ajout…" : "Ajouter"}</button>
        {error ? <p className="pilot-error" role="alert">{error}</p> : null}
      </form>

      <div className="pilot-tools">
        <label className="board-search-wrap">
          <Search size={16} aria-hidden />
          <input className="control board-search" placeholder="Rechercher un sujet..." aria-label="Rechercher un sujet" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="control" aria-label="Filtrer par statut" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="done">Fait</option>
          <option value="doing">En cours</option>
          <option value="todo">À traiter</option>
        </select>
        <select className="control" aria-label="Filtrer par date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
          <option value="">Toutes les dates</option>
          {dates.map((day) => <option key={day} value={day}>{formatDayLong(day)}</option>)}
        </select>
        <select className="control" aria-label="Filtrer par projet" value={scope} onChange={(event) => setScope(event.target.value)}>
          {SCOPES.map((item) => <option key={item.id || "all"} value={item.id}>{item.label}</option>)}
        </select>
        {filtering ? <button type="button" className="btn pilot-reset" onClick={() => { setQuery(""); setStatusFilter(""); setDateFilter(""); setScope(""); }}><X size={14} aria-hidden /> Effacer</button> : null}
      </div>

      {rows.length === 0 ? (
        <div className="pilot-blank">
          <span><List size={22} aria-hidden /></span>
          <h2>Aucun sujet de pilotage pour le moment</h2>
          <p>Ajoutez votre premier sujet pour commencer le suivi du studio.</p>
          <button type="button" className="btn btn-primary pilot-add" onClick={focusComposer}><Plus size={16} aria-hidden /> Ajouter un sujet</button>
        </div>
      ) : groups.length === 0 ? (
        <div className="pilot-blank">
          <h2>Aucun sujet ne correspond à votre recherche.</h2>
          <button type="button" className="btn" onClick={() => { setQuery(""); setStatusFilter(""); setDateFilter(""); setScope(""); }}>Effacer les filtres</button>
        </div>
      ) : (
        <div className="pilot-days">
          {groups.map((day) => (
            <section key={day}>
              <h2>{formatDayLong(day)}</h2>
              <div>
                {visible.filter((item) => item.date === day).map((item) => (
                  <article key={item.id} className="pilot-row">
                    <span className="pilot-mark" aria-hidden><List size={16} /></span>
                    <div>
                      <p>{item.text}</p>
                      <span className="pilot-meta"><em>Studio</em><time dateTime={item.date}>{formatListDay(item.date)}</time></span>
                    </div>
                    <span className={`fiche-badge fiche-badge-${STATUS[item.status].tone}`}>{item.status === "done" ? <Check size={12} aria-hidden /> : null}{STATUS[item.status].label}</span>
                    <button type="button" className="icon-btn pilot-more" aria-label={`Actions pour ${item.text}`} aria-expanded={menuId === item.id} onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreHorizontal size={16} /></button>
                    {menuId === item.id ? (
                      <div className="pilot-menu" id="pilot-menu" role="menu">
                        {(["done", "doing", "todo"] as const).map((next) => (
                          <button key={next} type="button" role="menuitem" disabled={item.status === next} onClick={() => changeStatus(item.id, next)}>{STATUS[next].label}</button>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ tint, wash, icon, value, label, detail, pressed, onClick }: { tint: string; wash: string; icon: ReactNode; value: number; label: string; detail: string; pressed: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`pilot-metric ${pressed ? "is-on" : ""}`} style={{ ["--tint" as string]: tint, ["--wash" as string]: wash }} aria-pressed={pressed} onClick={onClick}>
      <span className="pilot-metric-icon">{icon}</span>
      <span className="pilot-metric-copy"><span><strong>{value}</strong> {label}</span><small>{detail}</small></span>
    </button>
  );
}

function matches(item: PilotItem, filters: { query: string; statusFilter: string; dateFilter: string; scope: string }) {
  const needle = filters.query.trim().toLowerCase();
  if (needle && !item.text.toLowerCase().includes(needle)) return false;
  if (filters.statusFilter && item.status !== filters.statusFilter) return false;
  if (filters.dateFilter && item.date !== filters.dateFilter) return false;
  if (filters.scope === "safya" && !/safya/i.test(item.text)) return false;
  if (filters.scope === "triage" && !/triage\+/i.test(item.text)) return false;
  if (filters.scope === "rpm" && !/ractac/i.test(item.text)) return false;
  return true;
}

function formatListDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, day: "numeric", month: "short", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}
