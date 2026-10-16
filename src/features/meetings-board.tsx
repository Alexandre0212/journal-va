"use client";

import { ArrowRight, Calendar, Clock, Folder, ListChecks, Loader2, Pencil, Plus, Save, Search, Users, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { MarkdownView } from "@/components/markdown-view";
import { parseMarkdown } from "@/domain/markdown";
import { meetingTiming } from "@/domain/meetings";
import { FollowUp } from "@/features/forms";
import { formatDayLong, TIMEZONE } from "@/lib/dates";
import { saveMeeting } from "@/server/actions";

export type MeetingTask = {
  id: string;
  title: string;
  status: "todo" | "doing" | "blocked" | "done";
  due: string | null;
  assignee: string | null;
  projectName: string;
  deleted: boolean;
};

export type MeetingCard = {
  id: string;
  title: string;
  date: string;
  start: string | null;
  participants: string[];
  cr: string;
  projectIds: string[];
  actions: Array<{ id: string; text: string; taskId: string | null }>;
};

type ProjectOption = { id: string; name: string; phase: number };
type Person = { id: string; name: string };
type ViewTab = "overview" | "people" | "report" | "actions";
type EditTab = "info" | "people" | "report" | "tasks";

const TIMING = {
  upcoming: { label: "À venir", tone: "idle" },
  today: { label: "Aujourd'hui", tone: "progress" },
  past: { label: "Passée", tone: "idle" },
} as const;

const TASK = {
  todo: { label: "À faire", tone: "idle" },
  doing: { label: "En cours", tone: "progress" },
  blocked: { label: "Bloqué", tone: "late" },
  done: { label: "Fait", tone: "good" },
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function tint(name: string) {
  const palette = ["#23358E", "#1F5F4D", "#3148b8", "#9A5800"];
  let hash = 0;
  for (const char of name) hash = (hash + char.charCodeAt(0)) % palette.length;
  return palette[hash] ?? palette[0];
}

function plain(text: string) {
  return text.replace(/\*\*/g, "").trim();
}

function linesOf(cr: string) {
  return parseMarkdown(cr).flatMap((block) => block.type === "ul" ? block.items : []);
}

function dateStamp(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  const label = new Intl.DateTimeFormat("fr-FR", { timeZone: TIMEZONE, day: "2-digit", month: "short" }).format(date);
  const [dayText, monthText] = label.split(" ");
  return { day: dayText ?? "", month: (monthText ?? "").replace(".", "") };
}

export function MeetingsBoard({
  meetings, projects, people, tasks, today, minutesNow, canWrite,
}: {
  meetings: MeetingCard[];
  projects: ProjectOption[];
  people: Person[];
  tasks: MeetingTask[];
  today: string;
  minutesNow: number;
  canWrite: boolean;
}) {
  const [query, setQuery] = useState("");
  const [projectId, setProjectId] = useState("");
  const [period, setPeriod] = useState("");
  const [follow, setFollow] = useState("");
  const [person, setPerson] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<ViewTab>("overview");
  const names = [...new Set(meetings.flatMap((meeting) => meeting.participants))].sort((a, b) => a.localeCompare(b, "fr"));
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const visible = meetings.filter((meeting) => {
    const needle = query.trim().toLowerCase();
    const timing = meetingTiming(meeting.date, meeting.start, today, minutesNow);
    const haystack = `${meeting.title} ${meeting.participants.join(" ")} ${meeting.cr}`.toLowerCase();
    if (needle && !haystack.includes(needle)) return false;
    if (projectId && !meeting.projectIds.includes(projectId)) return false;
    if (period && timing !== period) return false;
    if (follow === "linked" && meeting.actions.length === 0) return false;
    if (follow === "none" && meeting.actions.length > 0) return false;
    if (person && !meeting.participants.includes(person)) return false;
    return true;
  });
  const upcoming = meetings.filter((meeting) => meetingTiming(meeting.date, meeting.start, today, minutesNow) === "upcoming").length;
  const openActions = meetings.reduce((sum, meeting) => sum + meeting.actions.filter((action) => {
    const task = action.taskId ? taskById.get(action.taskId) : undefined;
    return Boolean(task && !task.deleted && task.status !== "done");
  }).length, 0);
  const selected = meetings.find((meeting) => meeting.id === openId) ?? null;

  function open(id: string, next: ViewTab) {
    setCreating(false);
    setEditing(false);
    setTab(next);
    setOpenId(id);
  }

  return (
    <div className="meet-page">
      <header className="task-mast">
        <div className="task-mast-copy">
          <p className="text-caption text-accent-text">Mesure</p>
          <h1 className="text-h1">Réunions et décisions</h1>
          <p className="text-small text-muted">Centralisez vos échanges, vos décisions et les prochaines actions de votre équipe.</p>
          <span className="mast-rule" />
        </div>
        {canWrite ? <button type="button" className="btn btn-primary task-create" onClick={() => { setCreating(true); setEditing(true); setOpenId(null); }}><Plus size={16} aria-hidden /> Nouvelle réunion</button> : null}
      </header>
      {canWrite ? null : <p className="text-small text-muted">La rédaction des comptes rendus est réservée aux administrateurs. Vous pouvez transformer une ligne en tâche.</p>}

      <section className="meet-stats" aria-label="Synthèse des réunions">
        <Stat tint="#23358E" icon={<Calendar size={18} />} label="Réunions enregistrées" value={meetings.length} detail={meetings.length > 1 ? "Comptes rendus conservés" : "Compte rendu conservé"} />
        <Stat tint="#E79409" icon={<Clock size={18} />} label="Réunions à venir" value={upcoming} detail="À partir d'aujourd'hui, heure de Dakar" />
        <Stat tint="#1F5F4D" icon={<ListChecks size={18} />} label="Actions à suivre" value={openActions} detail="Actions ouvertes à traiter" />
      </section>

      <div className="meet-tools">
        <label className="board-search-wrap">
          <Search size={16} aria-hidden />
          <input className="control board-search" placeholder="Rechercher une réunion, un participant ou une décision…" value={query} aria-label="Rechercher une réunion, un participant ou une décision" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="control" aria-label="Filtrer par projet" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Tous les projets</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <select className="control" aria-label="Filtrer par date" value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="">Toutes les dates</option>
          <option value="upcoming">À venir</option>
          <option value="today">Aujourd&apos;hui</option>
          <option value="past">Passées</option>
        </select>
        <select className="control" aria-label="Filtrer par suivi" value={follow} onChange={(event) => setFollow(event.target.value)}>
          <option value="">Toutes les réunions</option>
          <option value="linked">Avec tâches de suivi</option>
          <option value="none">Sans tâche de suivi</option>
        </select>
        <select className="control" aria-label="Filtrer par participant" value={person} onChange={(event) => setPerson(event.target.value)}>
          <option value="">Tous les participants</option>
          {names.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {visible.length ? (
        <div className="meet-list">
          {visible.map((meeting) => (
            <MeetingTile key={meeting.id} meeting={meeting} projects={projects} today={today} minutesNow={minutesNow} canWrite={canWrite} onOpen={(next) => open(meeting.id, next)} onEdit={() => { setCreating(false); setEditing(true); setOpenId(meeting.id); }} />
          ))}
        </div>
      ) : (
        <p className="meet-empty">{meetings.length ? "Aucune réunion ne correspond à cette recherche." : "Aucune réunion enregistrée."}</p>
      )}

      {creating || selected ? (
        <MeetingPanel
          meeting={selected}
          projects={projects}
          people={people}
          tasks={taskById}
          today={today}
          minutesNow={minutesNow}
          canWrite={canWrite}
          editing={editing}
          tab={tab}
          onTab={setTab}
          onEdit={() => setEditing(true)}
          onBack={() => setEditing(false)}
          onClose={() => { setCreating(false); setEditing(false); setOpenId(null); }}
        />
      ) : null}
    </div>
  );
}

function Stat({ tint, icon, label, value, detail }: { tint: string; icon: ReactNode; label: string; value: number; detail: string }) {
  return (
    <article className="kpi-stat" style={{ ["--tint" as string]: tint }}>
      <span className="dash-ico">{icon}</span>
      <p className="kpi-stat-label">{label}</p>
      <p className="kpi-stat-value">{value}</p>
      <p className="kpi-stat-context">{detail}</p>
    </article>
  );
}

function MeetingTile({ meeting, projects, today, minutesNow, canWrite, onOpen, onEdit }: {
  meeting: MeetingCard;
  projects: ProjectOption[];
  today: string;
  minutesNow: number;
  canWrite: boolean;
  onOpen: (tab: ViewTab) => void;
  onEdit: () => void;
}) {
  const stamp = dateStamp(meeting.date);
  const timing = TIMING[meetingTiming(meeting.date, meeting.start, today, minutesNow)];
  const points = linesOf(meeting.cr).slice(0, 3);
  const linked = projects.filter((project) => meeting.projectIds.includes(project.id));
  return (
    <article id={`meet-card-${meeting.id}`} className="meet-card">
      <button type="button" className="meet-card-main" onClick={() => onOpen("overview")}>
        <span className="meet-when">
          <strong className="num">{stamp.day}</strong>
          <em>{stamp.month}</em>
          <span>{meeting.start ?? "Horaire libre"}</span>
        </span>
        <span className="meet-card-copy">
          <span className="meet-card-title">
            <span className="text-h2">{meeting.title}</span>
            <ArrowRight className="meet-go" size={18} aria-hidden />
          </span>
          <span className="meet-people">
            {meeting.participants.length ? meeting.participants.map((name) => (
              <span key={name} className="meet-chip" title={name}>
                <span className="meet-avatar" style={{ background: tint(name) }}>{initials(name)}</span>
                {name}
              </span>
            )) : <span className="text-small text-muted">Participants non renseignés</span>}
          </span>
        </span>
        <span className={`fiche-badge fiche-badge-${timing.tone}`}>{timing.label}</span>
      </button>
      <div className="meet-excerpt">
        <p className="meet-kicker">L&apos;essentiel de la réunion</p>
        {points.length ? <ul>{points.map((item) => <li key={item}>{plain(item)}</li>)}</ul> : <p className="text-small text-muted">Aucun point n&apos;est rédigé dans ce compte rendu.</p>}
        {linked.length ? <p className="text-small text-muted">{linked.map((project) => project.name).join(", ")}</p> : null}
        {meeting.actions.length ? <p className="text-small text-muted">{meeting.actions.length} tâche{meeting.actions.length > 1 ? "s" : ""} issue{meeting.actions.length > 1 ? "s" : ""} du compte rendu</p> : null}
      </div>
      <footer className="meet-card-foot">
        <button type="button" className="btn" onClick={() => onOpen("report")}>Voir le compte rendu</button>
        {canWrite ? <button type="button" className="btn btn-primary" onClick={onEdit}><Pencil size={15} aria-hidden /> Modifier</button> : null}
      </footer>
    </article>
  );
}

function MeetingPanel({ meeting, projects, people, tasks, today, minutesNow, canWrite, editing, tab, onTab, onEdit, onBack, onClose }: {
  meeting: MeetingCard | null;
  projects: ProjectOption[];
  people: Person[];
  tasks: Map<string, MeetingTask>;
  today: string;
  minutesNow: number;
  canWrite: boolean;
  editing: boolean;
  tab: ViewTab;
  onTab: (tab: ViewTab) => void;
  onEdit: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const cancelEdit = useRef<() => void>(onClose);
  const meetingId = meeting?.id ?? "";
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = panel.current;
    root?.querySelector<HTMLButtonElement>(".okr-x")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (document.querySelector(".meet-edit")) { cancelEdit.current(); return; }
        if (meetingId) document.getElementById(`meet-card-${meetingId}`)?.focus();
        else document.querySelector<HTMLButtonElement>(".meet-page .task-create")?.focus();
        closeRef.current();
        return;
      }
      if (event.key !== "Tab" || !root) return;
      const list = [...root.querySelectorAll<HTMLElement>("button, input, select, textarea, [role='tab']")].filter((item) => !item.hasAttribute("disabled"));
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [meetingId, editing]);

  function close() {
    if (meeting) document.getElementById(`meet-card-${meeting.id}`)?.focus();
    else document.querySelector<HTMLButtonElement>(".meet-page .task-create")?.focus();
    closeRef.current();
  }

  const timing = meeting ? TIMING[meetingTiming(meeting.date, meeting.start, today, minutesNow)] : null;
  const linked = meeting ? projects.filter((project) => meeting.projectIds.includes(project.id)) : [];

  return createPortal(
    <div className="drawer-back" onMouseDown={(event) => { if (event.target === event.currentTarget) { if (document.querySelector(".meet-edit")) cancelEdit.current(); else close(); } }}>
      <motion.aside
        ref={panel}
        className="drawer meet-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meet-detail-title"
        initial={reduced ? false : { x: 36 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <button type="button" className="okr-x okr-detail-x" aria-label="Fermer" onClick={() => { if (editing) cancelEdit.current(); else close(); }}><X size={18} aria-hidden /></button>
        {editing ? (
          <EditForm key={meeting?.id ?? "new"} meeting={meeting} projects={projects} people={people} tasks={tasks} onCancel={() => { if (meeting) onBack(); else close(); }} onBindCancel={(handler) => { cancelEdit.current = handler; }} onSaved={close} />
        ) : meeting && timing ? (
          <>
            <header className="meet-head">
              <h2 id="meet-detail-title" className="text-h2">{meeting.title}</h2>
              <p className="text-small text-muted">{formatDayLong(meeting.date)}{meeting.start ? ` · ${meeting.start}` : " · horaire libre"}</p>
              <div className="meet-head-row">
                <span className={`fiche-badge fiche-badge-${timing.tone}`}>{timing.label}</span>
                <span className="text-small text-muted">{linked.length ? linked.map((project) => project.name).join(", ") : "Aucun projet associé"}</span>
              </div>
            </header>
            <Tabs
              label="Sections de la réunion"
              value={tab}
              onChange={onTab}
              items={[
                { id: "overview", label: "Aperçu", icon: <Folder size={15} /> },
                { id: "people", label: "Participants", icon: <Users size={15} /> },
                { id: "report", label: "Compte rendu", icon: <Calendar size={15} /> },
                { id: "actions", label: "Actions", icon: <ListChecks size={15} /> },
              ]}
            />
            <div className="meet-scroll">
              {tab === "overview" ? <Overview meeting={meeting} projects={linked} /> : null}
              {tab === "people" ? <People names={meeting.participants} /> : null}
              {tab === "report" ? <section className="meet-block"><MarkdownView text={meeting.cr || "Compte rendu vide."} /></section> : null}
              {tab === "actions" ? <Actions meeting={meeting} projects={projects} tasks={tasks} /> : null}
            </div>
            {canWrite ? (
              <footer className="okr-detail-foot">
                <button type="button" className="btn btn-primary" onClick={onEdit}><Pencil size={16} aria-hidden /> Modifier la réunion</button>
              </footer>
            ) : null}
          </>
        ) : null}
      </motion.aside>
    </div>,
    document.body,
  );
}

function Overview({ meeting, projects }: { meeting: MeetingCard; projects: ProjectOption[] }) {
  const blocks = parseMarkdown(meeting.cr);
  const groups: Array<{ title: string; items: string[] }> = [];
  let current = { title: "Compte rendu", items: [] as string[] };
  for (const block of blocks) {
    if (block.type === "h") {
      if (current.items.length || groups.length) groups.push(current);
      current = { title: block.text, items: [] };
    } else if (block.type === "ul") current.items.push(...block.items.map(plain));
    else current.items.push(plain(block.text));
  }
  if (current.items.length || !groups.length) groups.push(current);
  return (
    <div className="meet-stack">
      <section className="meet-facts">
        <Fact icon={<Calendar size={15} />} label="Date" value={formatDayLong(meeting.date)} />
        <Fact icon={<Clock size={15} />} label="Heure" value={meeting.start ?? "Horaire libre"} />
        <Fact icon={<Folder size={15} />} label="Projet" value={projects.length ? projects.map((project) => project.name).join(", ") : "Aucun projet"} />
        <Fact icon={<Users size={15} />} label="Participants" value={String(meeting.participants.length)} />
      </section>
      {meeting.cr.trim() ? groups.filter((group) => group.items.length).map((group) => (
        <section key={group.title} className="meet-block">
          <h3>{group.title}</h3>
          <ul className="meet-points">{group.items.map((item, index) => <li key={`${group.title}-${index}`}>{item}</li>)}</ul>
        </section>
      )) : <p className="meet-empty">Aucun compte rendu enregistré.</p>}
    </div>
  );
}

function People({ names }: { names: string[] }) {
  if (!names.length) return <p className="meet-empty">Aucun participant enregistré.</p>;
  return (
    <ul className="meet-people-grid">
      {names.map((name) => (
        <li key={name} className="meet-person">
          <span className="meet-avatar meet-avatar-lg" style={{ background: tint(name) }}>{initials(name)}</span>
          <span>
            <strong>{name}</strong>
            <em>Nom cité dans le compte rendu</em>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Actions({ meeting, projects, tasks }: { meeting: MeetingCard; projects: ProjectOption[]; tasks: Map<string, MeetingTask> }) {
  const points = linesOf(meeting.cr);
  const linked = new Map(meeting.actions.map((action) => [action.text, action]));
  return (
    <div className="meet-stack">
      {meeting.actions.length ? meeting.actions.map((action) => {
        const task = action.taskId ? tasks.get(action.taskId) : undefined;
        const status = task && !task.deleted ? TASK[task.status] : null;
        return (
          <article key={action.id} className="meet-task">
            <div>
              <strong>{action.text}</strong>
              <p className="text-small text-muted">{task && !task.deleted ? `${task.assignee ?? "Non assignée"} · ${task.projectName}${task.due ? ` · ${formatDayLong(task.due)}` : ""}` : "Tâche introuvable"}</p>
            </div>
            {status ? <span className={`fiche-badge fiche-badge-${status.tone}`}>{status.label}</span> : <span className="fiche-badge fiche-badge-late">Retirée</span>}
          </article>
        );
      }) : <p className="text-small text-muted">Aucune tâche n&apos;a encore été créée depuis ce compte rendu.</p>}
      {points.length ? (
        <section className="meet-block">
          <h3 className="meet-kicker">Transformer une ligne en tâche</h3>
          {points.map((item) => {
            const action = linked.get(plain(item));
            return (
              <div key={item} className="meet-line">
                <p>{plain(item)}</p>
                {action ? <span className="fiche-badge fiche-badge-good">Tâche créée</span> : <FollowUp meetingId={meeting.id} text={item} projects={projects} />}
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

function EditForm({ meeting, projects, people, tasks, onCancel, onBindCancel, onSaved }: {
  meeting: MeetingCard | null;
  projects: ProjectOption[];
  people: Person[];
  tasks: Map<string, MeetingTask>;
  onCancel: () => void;
  onBindCancel: (handler: () => void) => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<EditTab>("info");
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [date, setDate] = useState(meeting?.date ?? "");
  const [start, setStart] = useState(meeting?.start ?? "");
  const [participants, setParticipants] = useState(meeting?.participants ?? []);
  const [cr, setCr] = useState(meeting?.cr ?? "");
  const [projectIds, setProjectIds] = useState(meeting?.projectIds ?? []);
  const [extra, setExtra] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [leave, setLeave] = useState(false);
  const sameList = (left: string[], right: string[]) => left.length === right.length && left.every((item, index) => item === right[index]);
  const dirty = title !== (meeting?.title ?? "") || date !== (meeting?.date ?? "") || start !== (meeting?.start ?? "") || cr !== (meeting?.cr ?? "") || !sameList(participants, meeting?.participants ?? []) || !sameList(projectIds, meeting?.projectIds ?? []);
  function requestClose() {
    if (dirty) { setLeave(true); return; }
    onCancel();
  }
  useEffect(() => { onBindCancel(requestClose); });

  function addName(name: string) {
    const next = name.trim();
    if (!next || participants.includes(next) || next.length > 80) return;
    setParticipants([...participants, next]);
    setExtra("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = "Indiquez le titre de la réunion.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) nextErrors.date = "Indiquez une date.";
    if (start && !/^\d{2}:\d{2}$/.test(start)) nextErrors.start = "L'heure doit suivre le format hh:mm.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setTab("info"); return; }
    setPending(true);
    setError("");
    void saveMeeting({
      id: meeting?.id,
      title: title.trim(),
      date,
      start: start || null,
      participants,
      cr,
      projectIds,
    }).then((result) => {
      setPending(false);
      if (!result.ok) { setError(result.error); toast.error(result.error); return; }
      toast.success(meeting ? "Modifications enregistrées" : "Réunion créée");
      router.refresh();
      onSaved();
    }).catch(() => {
      setPending(false);
      setError("Enregistrement impossible.");
      toast.error("Enregistrement impossible.");
    });
  }

  const draft: MeetingCard = {
    id: meeting?.id ?? "brouillon",
    title, date, start: start || null, participants, cr, projectIds,
    actions: meeting?.actions ?? [],
  };

  return (
    <form className="meet-edit" onSubmit={submit}>
      <header className="meet-head">
        <h2 id="meet-detail-title" className="text-h2">{meeting ? "Modifier la réunion" : "Nouvelle réunion"}</h2>
        <p className="text-small text-muted">{meeting ? "Mettez à jour les informations, le résumé et les actions de la réunion." : "Préparez votre réunion et centralisez les informations essentielles."}</p>
      </header>
      <Tabs
        label="Sections du formulaire"
        value={tab}
        onChange={setTab}
        items={[
          { id: "info", label: "Informations", icon: <Folder size={15} /> },
          { id: "people", label: "Participants", icon: <Users size={15} /> },
          { id: "report", label: "Compte rendu", icon: <Calendar size={15} /> },
          { id: "tasks", label: "Tâches", icon: <ListChecks size={15} /> },
        ]}
      />
      <div className="meet-scroll">
        {tab === "info" ? (
          <div className="meet-stack">
            <section className="meet-block">
              <h3><span className="meet-mark"><Folder size={16} aria-hidden /></span> Informations générales</h3>
              <p className="text-small text-muted">Titre, date, heure et projet de la réunion.</p>
              <label className="field"><span>Titre de la réunion *</span>
                <input className="control" value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} />
                {errors.title ? <em className="meet-error">{errors.title}</em> : null}
              </label>
              <div className="meet-grid-2">
                <label className="field"><span>Date *</span>
                  <input className="control" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                  {errors.date ? <em className="meet-error">{errors.date}</em> : null}
                </label>
                <label className="field"><span>Heure de début</span>
                  <input className="control" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
                  {errors.start ? <em className="meet-error">{errors.start}</em> : null}
                </label>
              </div>
              <div className="field">
                <span>Projet associé</span>
                <ProjectPicker projects={projects} selected={projectIds} onChange={setProjectIds} />
              </div>
            </section>
            <PeopleEditor people={people} participants={participants} extra={extra} onExtra={setExtra} onAdd={addName} onRemove={(name) => setParticipants(participants.filter((item) => item !== name))} />
          </div>
        ) : null}
        {tab === "people" ? <PeopleEditor people={people} participants={participants} extra={extra} onExtra={setExtra} onAdd={addName} onRemove={(name) => setParticipants(participants.filter((item) => item !== name))} /> : null}
        {tab === "report" ? (
          <div className="meet-stack">
            <section className="meet-block">
              <h3>Compte rendu</h3>
              <p className="text-small text-muted">Le texte est conservé en Markdown, avec ses titres et ses listes.</p>
              <label className="field"><span>Texte</span>
                <textarea className="control meet-cr" value={cr} maxLength={20000} onChange={(event) => setCr(event.target.value)} />
              </label>
            </section>
            <section className="meet-block">
              <h3>Aperçu</h3>
              {cr.trim() ? <MarkdownView text={cr} /> : <p className="text-small text-muted">L&apos;aperçu apparaîtra dès que le compte rendu contient du texte.</p>}
            </section>
          </div>
        ) : null}
        {tab === "tasks" ? meeting ? <Actions meeting={draft} projects={projects} tasks={tasks} /> : <p className="meet-empty">Les tâches se créent une fois la réunion enregistrée.</p> : null}
        {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
      </div>
      {leave ? (
        <div className="okr-leave" role="alertdialog" aria-labelledby="meet-leave-title">
          <p id="meet-leave-title">Abandonner les modifications non enregistrées ?</p>
          <button type="button" className="btn" onClick={() => setLeave(false)}>Continuer</button>
          <button type="button" className="btn btn-primary" onClick={onCancel}>Abandonner</button>
        </div>
      ) : null}
      <footer className="okr-detail-foot">
        <button type="button" className="btn okr-cancel" disabled={pending} onClick={requestClose}>Annuler</button>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? <><Loader2 className="okr-spin" size={16} aria-hidden /> Enregistrement…</> : <><Save size={16} aria-hidden /> {meeting ? "Enregistrer les modifications" : "Créer la réunion"}</>}</button>
      </footer>
    </form>
  );
}

function PeopleEditor({ people, participants, extra, onExtra, onAdd, onRemove }: {
  people: Person[];
  participants: string[];
  extra: string;
  onExtra: (value: string) => void;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const available = people.filter((person) => !participants.includes(person.name));
  return (
    <section className="meet-block">
      <h3><span className="meet-mark meet-mark-warm"><Users size={16} aria-hidden /></span> Participants</h3>
      <p className="text-small text-muted">Personnes citées dans la réunion. Un nom peut être ajouté même s&apos;il n&apos;a pas de compte.</p>
      {participants.length ? (
        <ul className="meet-people">
          {participants.map((name) => (
            <li key={name} className="meet-chip">
              <span className="meet-avatar" style={{ background: tint(name) }}>{initials(name)}</span>
              {name}
              <button type="button" aria-label={`Retirer ${name}`} onClick={() => onRemove(name)}><X size={14} aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-small text-muted">Aucun participant pour le moment.</p>}
      <label className="field"><span>Ajouter un participant</span>
        <select className="control" value="" onChange={(event) => { if (event.target.value) onAdd(event.target.value); }}>
          <option value="">Choisir une personne enregistrée</option>
          {available.map((person) => <option key={person.id} value={person.name}>{person.name}</option>)}
        </select>
      </label>
      <div className="meet-add-name">
        <label className="field"><span>Autre nom</span>
          <input className="control" value={extra} maxLength={80} placeholder="Nom cité, sans compte" onChange={(event) => onExtra(event.target.value)} />
        </label>
        <button type="button" className="btn btn-primary" onClick={() => onAdd(extra)}><Plus size={15} aria-hidden /> Ajouter</button>
      </div>
    </section>
  );
}

function ProjectPicker({ projects, selected, onChange }: { projects: ProjectOption[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const chosen = projects.filter((project) => selected.includes(project.id));
  const available = projects.filter((project) => !selected.includes(project.id));
  return (
    <>
      {chosen.length ? (
        <ul className="meet-people">
          {chosen.map((project) => (
            <li key={project.id} className="meet-chip">
              {project.name}
              <button type="button" aria-label={`Retirer ${project.name}`} onClick={() => onChange(selected.filter((id) => id !== project.id))}><X size={14} aria-hidden /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-small text-muted">Aucun projet associé.</p>}
      <select className="control" value="" aria-label="Associer un projet" onChange={(event) => { if (event.target.value) onChange([...selected, event.target.value]); }}>
        <option value="">Associer un projet</option>
        {available.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
    </>
  );
}

function Tabs<T extends string>({ label, value, onChange, items }: { label: string; value: T; onChange: (value: T) => void; items: Array<{ id: T; label: string; icon: ReactNode }> }) {
  return (
    <div className="okr-tabs" role="tablist" aria-label={label} onKeyDown={(event) => {
      const index = items.findIndex((item) => item.id === value);
      const next = event.key === "ArrowRight" ? (index + 1) % items.length : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length : -1;
      if (next < 0) return;
      event.preventDefault();
      onChange(items[next].id);
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }}>
      {items.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={value === item.id} tabIndex={value === item.id ? 0 : -1} onClick={() => onChange(item.id)}>{item.icon} {item.label}</button>
      ))}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <p className="okr-fact">{icon}<span>{label}</span><strong>{value}</strong></p>;
}
