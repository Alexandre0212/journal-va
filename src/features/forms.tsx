"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { followUpToTask, generateSummary, restoreItem, saveAnomaly, saveCourse, saveInfo, saveKpi, saveMeeting, saveMgmt, saveNotes, saveOkr, saveProject, saveTask, setAnomalyStatus, setKeyResultCurrent, setKpiValue, setMgmtStatus, softDelete } from "@/server/actions";
import { PHASES } from "@/domain/phases";

type Option = { id: string; name: string };
type UserOption = { id: string; name: string };
type Result = { ok: true } | { ok: false; error: string };

function notify(result: Result) {
  if (result.ok) toast.success("Enregistré");
  else toast.error(result.error);
}

export function DeleteButton({ entity, id, label = "Supprimer" }: { entity: "task" | "okr" | "kpi" | "info" | "course"; id: string; label?: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <button type="button" className="btn btn-ghost btn-danger" onClick={() => {
      if (!armed) { setArmed(true); return; }
      void softDelete(entity, id).then(notify);
    }}>{armed ? "Confirmer" : label}</button>
  );
}

export function RestoreButton({ entity, id }: { entity: "task" | "okr" | "kpi" | "info" | "course"; id: string }) {
  return <button type="button" className="btn" onClick={() => void restoreItem(entity, id).then(notify)}>Restaurer</button>;
}

export function DayActions({ projectId, phase, okrs }: { projectId: string; phase: number; okrs: Option[] }) {
  const [status, setStatus] = useState("done");
  const [error, setError] = useState("");
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const blocker = String(data.get("blocker") ?? "");
      if (status === "blocked" && !blocker.trim()) { setError("Indiquez la raison du blocage."); return; }
      void saveTask({
        title: String(data.get("title") ?? ""),
        projectId,
        phase,
        okrId: String(data.get("okrId") ?? "") || null,
        assigneeId: null,
        due: null,
        date: String(data.get("date") ?? ""),
        status: status as "todo" | "doing" | "blocked" | "done",
        priority: null,
        blocker: status === "blocked" ? blocker : null,
      }).then((result) => { notify(result); if (result.ok) (event.target as HTMLFormElement).reset(); else setError(result.error); });
    }}>
      <label className="field"><span>Ce que j'ai fait</span><textarea name="title" className="control min-h-20" maxLength={200} required /></label>
      <input type="hidden" name="date" value="" id="day-hidden" />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field"><span>OKR lié</span>
          <select name="okrId" className="control"><option value="">Sans OKR</option>{okrs.map((okr) => <option key={okr.id} value={okr.id}>{okr.name}</option>)}</select>
        </label>
        <label className="field"><span>Statut</span>
          <select className="control" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="done">Fait</option><option value="doing">En cours</option><option value="blocked">Bloqué</option><option value="todo">À faire</option>
          </select>
        </label>
      </div>
      {status === "blocked" ? <label className="field"><span>Raison du blocage</span><input name="blocker" className="control" maxLength={300} /></label> : null}
      {error ? <p className="text-small text-crit">{error}</p> : null}
      <button className="btn btn-primary w-fit" type="submit">Ajouter</button>
    </form>
  );
}

export function DayActionsBound({ projectId, phase, okrs, date }: { projectId: string; phase: number; okrs: Option[]; date: string }) {
  return (
    <div onSubmitCapture={(event) => {
      const form = event.currentTarget.querySelector("input[name=date]") as HTMLInputElement | null;
      if (form) form.value = date;
    }}>
      <DayActions projectId={projectId} phase={phase} okrs={okrs} />
    </div>
  );
}

export function InfoForm({ projectId, date }: { projectId: string; date: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>+ Info</button>;
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void saveInfo({ text: String(data.get("text")), source: String(data.get("source") ?? "") || null, channel: String(data.get("channel")), projectId, date }).then((result) => { notify(result); if (result.ok) setOpen(false); });
    }}>
      <label className="field"><span>Information</span><textarea name="text" className="control min-h-20" maxLength={1200} required /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field"><span>Source</span><input name="source" className="control" maxLength={120} /></label>
        <label className="field"><span>Canal</span>
          <select name="channel" className="control">{["WhatsApp", "Appel", "Email", "SMS", "Teams (chat)", "En personne", "Autre"].map((item) => <option key={item}>{item}</option>)}</select>
        </label>
      </div>
      <button className="btn btn-primary w-fit" type="submit">Enregistrer</button>
    </form>
  );
}

export function KrField({ okrId, krId, current }: { okrId: string; krId: string; current: number }) {
  return <input className="control w-20 text-right" type="number" defaultValue={current} aria-label="Valeur actuelle" onBlur={(event) => void setKeyResultCurrent(okrId, krId, Number(event.target.value) || 0).then(notify)} />;
}

export function KpiToday({ kpiId, date, value }: { kpiId: string; date: string; value: number | null }) {
  return <input className="control w-24 text-right" type="number" defaultValue={value ?? ""} placeholder="—" aria-label="Valeur du jour" onBlur={(event) => void setKpiValue({ kpiId, date, value: event.target.value === "" ? null : Number(event.target.value) }).then(notify)} />;
}

export function KpiCreate({ projects }: { projects: Option[] }) {
  return (
    <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const target = String(data.get("target") ?? "");
      void saveKpi({ projectId: String(data.get("projectId")), label: String(data.get("label")), unit: String(data.get("unit") ?? ""), target: target === "" ? null : Number(target) }).then((result) => { notify(result); if (result.ok) (event.target as HTMLFormElement).reset(); });
    }}>
      <select name="projectId" className="control">{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <input name="label" className="control" placeholder="Indicateur" required maxLength={120} />
      <input name="target" className="control" type="number" placeholder="Objectif" />
      <input name="unit" className="control" placeholder="Unité" maxLength={30} />
      <button className="btn btn-primary" type="submit">Ajouter le KPI</button>
    </form>
  );
}

export function CourseForm({ projectId }: { projectId: string }) {
  return (
    <form className="grid gap-3 md:grid-cols-3" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const n = (key: string) => { const value = String(data.get(key) ?? ""); return value === "" ? null : Number(value); };
      void saveCourse({
        projectId, date: String(data.get("date")), fromPlace: String(data.get("from") ?? "") || null, toPlace: String(data.get("to") ?? "") || null,
        km: n("km"), app: n("app"), yango: n("yango"), liv: n("liv"), driver: String(data.get("driver") ?? "") || null, note: String(data.get("note") ?? "") || null,
      }).then((result) => { notify(result); if (result.ok) (event.target as HTMLFormElement).reset(); });
    }}>
      <input type="date" name="date" className="control" required />
      <input name="from" className="control" placeholder="Départ" maxLength={80} />
      <input name="to" className="control" placeholder="Arrivée" maxLength={80} />
      <input name="km" className="control" type="number" step="0.1" placeholder="Km" />
      <input name="app" className="control" type="number" placeholder="Prix RacTac" />
      <input name="yango" className="control" type="number" placeholder="Prix Yango" />
      <input name="liv" className="control" type="number" placeholder="Prix livreur" />
      <input name="driver" className="control" placeholder="Livreur" />
      <input name="note" className="control md:col-span-2" placeholder="Note" />
      <button className="btn btn-primary" type="submit">Ajouter la course</button>
    </form>
  );
}

export function AnomalyForm({ projectId }: { projectId: string }) {
  return (
    <form className="grid gap-3" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      data.set("projectId", projectId);
      void saveAnomaly(data).then((result) => { notify(result); if (result.ok) (event.target as HTMLFormElement).reset(); });
    }}>
      <div className="grid gap-3 md:grid-cols-3">
        <input type="date" name="date" className="control" required />
        <select name="severity" className="control" defaultValue="major"><option value="minor">Mineure</option><option value="major">Majeure</option><option value="blocking">Bloquante</option></select>
        <input type="file" name="file" className="control" accept="image/*,application/pdf,video/mp4" />
      </div>
      <input name="text" className="control" maxLength={300} required placeholder="Anomalie constatée" />
      <button className="btn btn-primary w-fit" type="submit">Ajouter</button>
    </form>
  );
}

export function ResolveButton({ id, status }: { id: string; status: "open" | "resolved" }) {
  const next = status === "resolved" ? "open" : "resolved";
  return <button type="button" className="btn" onClick={() => void setAnomalyStatus(id, next).then(notify)}>{status === "resolved" ? "Rouvrir" : "Marquer résolue"}</button>;
}

export function ProjectEditor(props: { project: { id: string; name: string; phase: number; coursesEnabled: boolean; anomaliesEnabled: boolean; leadId: string | null; participantIds: string[] }; users: UserOption[]; admin: boolean }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="btn" onClick={() => setOpen(true)}>Modifier le projet</button>;
  return (
    <form className="surface grid gap-3 p-4" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void saveProject({
        id: props.project.id,
        name: String(data.get("name")),
        phase: Number(data.get("phase")),
        coursesEnabled: data.get("courses") === "on",
        anomaliesEnabled: data.get("anomalies") === "on",
        leadId: String(data.get("leadId") ?? "") || null,
        participantIds: data.getAll("participant").map(String),
      }).then((result) => { notify(result); if (result.ok) setOpen(false); });
    }}>
      <label className="field"><span>Nom</span><input name="name" className="control" defaultValue={props.project.name} maxLength={80} required /></label>
      <label className="field"><span>Phase actuelle</span>
        <select name="phase" className="control" defaultValue={props.project.phase}>{PHASES.map((phase) => <option key={phase.index} value={phase.index}>{phase.index + 1} · {phase.name}</option>)}</select>
      </label>
      <label className="field"><span>Responsable</span>
        <select name="leadId" className="control" defaultValue={props.project.leadId ?? ""}><option value="">Non renseigné</option>{props.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
      </label>
      <fieldset className="flex flex-col gap-2"><legend className="text-caption">Participants</legend>
        {props.users.map((user) => <label key={user.id} className="text-small"><input type="checkbox" name="participant" value={user.id} defaultChecked={props.project.participantIds.includes(user.id)} /> {user.name}</label>)}
      </fieldset>
      {props.admin ? <label className="text-small"><input type="checkbox" name="courses" defaultChecked={props.project.coursesEnabled} /> Activer les courses</label> : null}
      {props.admin ? <label className="text-small"><input type="checkbox" name="anomalies" defaultChecked={props.project.anomaliesEnabled} /> Activer les anomalies</label> : null}
      <p className="text-small text-muted">Passer à la phase suivante conserve les OKR et les tâches des phases précédentes.</p>
      <button className="btn btn-primary w-fit" type="submit">Enregistrer</button>
    </form>
  );
}

export function NotesEditor({ projectId, hot, sofar, keep }: { projectId: string; hot: string | null; sofar: string | null; keep: string | null }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>Point chaud · So far · Keep in mind</button>;
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const empty = (key: string) => String(data.get(key) ?? "").trim() || null;
      void saveNotes({ projectId, hot: empty("hot"), sofar: empty("sofar"), keep: empty("keep") }).then((result) => { notify(result); if (result.ok) setOpen(false); });
    }}>
      <label className="field"><span>Point chaud</span><textarea name="hot" className="control" maxLength={400} defaultValue={hot ?? ""} /></label>
      <label className="field"><span>So far</span><textarea name="sofar" className="control" maxLength={400} defaultValue={sofar ?? ""} /></label>
      <label className="field"><span>Keep in mind</span><textarea name="keep" className="control" maxLength={400} defaultValue={keep ?? ""} /></label>
      <button className="btn btn-primary w-fit" type="submit">Enregistrer</button>
    </form>
  );
}

export function MgmtForm({ date }: { date: string }) {
  return (
    <form className="flex flex-wrap gap-2" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void saveMgmt({ text: String(data.get("text")), status: String(data.get("status")) as "todo" | "doing" | "done", date }).then((result) => { notify(result); if (result.ok) (event.target as HTMLFormElement).reset(); });
    }}>
      <input name="text" className="control min-w-64 flex-1" maxLength={200} required placeholder="Travail de management" />
      <select name="status" className="control w-auto"><option value="done">Fait</option><option value="doing">En cours</option><option value="todo">À faire</option></select>
      <button className="btn btn-primary" type="submit">Ajouter</button>
    </form>
  );
}

export function MgmtStatus({ id, status }: { id: string; status: "todo" | "doing" | "done" }) {
  return <select className="control w-auto" defaultValue={status} aria-label="Statut" onChange={(event) => void setMgmtStatus(id, event.target.value as "todo" | "doing" | "done").then(notify)}>
    <option value="done">Fait</option><option value="doing">En cours</option><option value="todo">À faire</option>
  </select>;
}

export function MeetingForm({ projects }: { projects: Option[] }) {
  const router = useRouter();
  return (
    <form className="surface grid gap-3 p-4" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void saveMeeting({
        title: String(data.get("title")),
        date: String(data.get("date")),
        start: String(data.get("start") ?? "") || null,
        participants: String(data.get("participants") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
        cr: String(data.get("cr") ?? ""),
        projectIds: data.getAll("project").map(String),
      }).then((result) => { notify(result); if (result.ok) router.refresh(); });
    }}>
      <input name="title" className="control" required placeholder="Titre" maxLength={160} />
      <div className="grid gap-3 md:grid-cols-2">
        <input type="date" name="date" className="control" required />
        <input name="start" className="control" placeholder="14:00" pattern="\d{2}:\d{2}" />
      </div>
      <input name="participants" className="control" placeholder="Participants, séparés par des virgules" />
      <textarea name="cr" className="control min-h-32" placeholder="Compte rendu en Markdown" />
      <fieldset className="flex flex-wrap gap-3">{projects.map((project) => <label key={project.id} className="text-small"><input type="checkbox" name="project" value={project.id} /> {project.name}</label>)}</fieldset>
      <button className="btn btn-primary w-fit" type="submit">Enregistrer la réunion</button>
    </form>
  );
}

export function FollowUp({ meetingId, text, projects }: { meetingId: string; text: string; projects: Array<Option & { phase: number }> }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const phase = projects.find((project) => project.id === projectId)?.phase ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="control w-auto" value={projectId} aria-label="Projet de la tâche" onChange={(event) => setProjectId(event.target.value)}>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <button type="button" className="btn" onClick={() => void followUpToTask(meetingId, text, projectId, phase).then(notify)}>Créer une tâche</button>
    </div>
  );
}

export function GenerateRecap({ day }: { day: string }) {
  return <button type="button" className="btn btn-primary" onClick={() => void generateSummary(day).then(notify)}>Calculer le récap depuis les données</button>;
}

export function OkrEditor({ projects, initial }: { projects: Option[]; initial?: { id: string; projectId: string; phase: number; title: string; due: string | null; keyResults: Array<{ id: string; label: string; target: number; current: number; unit: string }> } }) {
  const [krs, setKrs] = useState(initial?.keyResults ?? [{ id: "kr-nouveau", label: "", target: 100, current: 0, unit: "%" }]);
  return (
    <form className="surface grid gap-3 p-4" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void saveOkr({
        id: initial?.id,
        projectId: String(data.get("projectId")),
        phase: Number(data.get("phase")),
        title: String(data.get("title")),
        due: String(data.get("due") ?? "") || null,
        keyResults: krs.filter((kr) => kr.label.trim()),
      }).then(notify);
    }}>
      <input name="title" className="control" required maxLength={160} defaultValue={initial?.title} placeholder="Objectif" />
      <div className="grid gap-3 md:grid-cols-3">
        <select name="projectId" className="control" defaultValue={initial?.projectId}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select name="phase" className="control" defaultValue={initial?.phase ?? 0}>{PHASES.map((phase) => <option key={phase.index} value={phase.index}>{phase.name}</option>)}</select>
        <input type="date" name="due" className="control" defaultValue={initial?.due ?? ""} />
      </div>
      {krs.map((kr, index) => (
        <div key={kr.id} className="grid gap-2 md:grid-cols-4">
          <input className="control md:col-span-2" value={kr.label} placeholder="Ce qu'on mesure" onChange={(event) => setKrs(krs.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} />
          <input className="control" type="number" value={kr.target} aria-label="Cible" onChange={(event) => setKrs(krs.map((item, i) => i === index ? { ...item, target: Number(event.target.value) || 0 } : item))} />
          <input className="control" value={kr.unit} placeholder="Unité" onChange={(event) => setKrs(krs.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} />
        </div>
      ))}
      <button type="button" className="btn btn-ghost w-fit" onClick={() => setKrs([...krs, { id: `kr${Date.now().toString(36)}`, label: "", target: 100, current: 0, unit: "%" }])}>+ Résultat clé</button>
      <button className="btn btn-primary w-fit" type="submit">{initial ? "Enregistrer" : "Ajouter l'OKR"}</button>
    </form>
  );
}

export function TaskCreator({ projects, okrs, users }: { projects: Array<Option & { phase: number }>; okrs: Array<{ id: string; title: string; projectId: string; phase: number }>; users: UserOption[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [phase, setPhase] = useState(projects[0]?.phase ?? 0);
  const [status, setStatus] = useState("todo");
  const choices = okrs.filter((okr) => okr.projectId === projectId && okr.phase === phase);
  return (
    <form className="surface grid gap-3 p-4" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      void saveTask({
        title: String(data.get("title")),
        projectId,
        phase,
        okrId: String(data.get("okrId") ?? "") || null,
        assigneeId: String(data.get("assigneeId") ?? "") || null,
        due: String(data.get("due") ?? "") || null,
        date: null,
        status: status as "todo" | "doing" | "blocked" | "done",
        priority: (String(data.get("priority") ?? "") || null) as "low" | "normal" | "high" | null,
        blocker: status === "blocked" ? String(data.get("blocker") ?? "") : null,
      }).then((result) => { notify(result); if (result.ok) (event.target as HTMLFormElement).reset(); });
    }}>
      <input name="title" className="control" required maxLength={200} placeholder="Tâche" />
      <div className="grid gap-3 md:grid-cols-2">
        <select className="control" value={projectId} onChange={(event) => { setProjectId(event.target.value); setPhase(projects.find((project) => project.id === event.target.value)?.phase ?? 0); }}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select className="control" value={phase} onChange={(event) => setPhase(Number(event.target.value))}>{PHASES.map((item) => <option key={item.index} value={item.index}>{item.name}</option>)}</select>
        <select name="okrId" className="control"><option value="">Aucun OKR</option>{choices.map((okr) => <option key={okr.id} value={okr.id}>{okr.title}</option>)}</select>
        <select name="assigneeId" className="control"><option value="">Non attribuée</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
        <input type="date" name="due" className="control" />
        <select name="priority" className="control" defaultValue=""><option value="">Priorité non renseignée</option><option value="low">Basse</option><option value="normal">Normale</option><option value="high">Haute</option></select>
        <select className="control" value={status} onChange={(event) => setStatus(event.target.value)}><option value="todo">À faire</option><option value="doing">En cours</option><option value="blocked">Bloqué</option><option value="done">Fait</option></select>
      </div>
      {status === "blocked" ? <input name="blocker" className="control" placeholder="Raison du blocage" required /> : null}
      <button className="btn btn-primary w-fit" type="submit">Ajouter la tâche</button>
    </form>
  );
}
