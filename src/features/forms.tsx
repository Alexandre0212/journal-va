"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { followUpToTask, saveAnomaly, saveCourse, saveInfo, saveKpi, saveNotes, saveTask, setAnomalyStatus, setKeyResultCurrent, setKpiValue, softDelete } from "@/server/actions";

type Option = { id: string; name: string };
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

export function DayActions({ projectId, phase, okrs, caption = "Ce que j'ai fait", captionClassName = "", placeholder, submitLabel = "Ajouter" }: { projectId: string; phase: number; okrs: Option[]; caption?: string; captionClassName?: string; placeholder?: string; submitLabel?: string }) {
  const [status, setStatus] = useState("done");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const blocker = String(data.get("blocker") ?? "");
      if (status === "blocked" && !blocker.trim()) { setError("Indiquez la raison du blocage."); return; }
      setPending(true);
      setError("");
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
      }).then((result) => {
        setPending(false);
        notify(result);
        if (result.ok) form.reset();
        else setError(result.error);
      });
    }}>
      <label className="field"><span className={captionClassName}>{caption}</span><textarea name="title" className="control min-h-24" maxLength={200} required placeholder={placeholder} /></label>
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
      <button className="btn btn-primary w-fit" type="submit" disabled={pending}>{pending ? "Enregistrement…" : submitLabel}</button>
    </form>
  );
}

export function DayActionsBound({ projectId, phase, okrs, date, caption, captionClassName, placeholder, submitLabel }: { projectId: string; phase: number; okrs: Option[]; date: string; caption?: string; captionClassName?: string; placeholder?: string; submitLabel?: string }) {
  return (
    <div onSubmitCapture={(event) => {
      const form = event.currentTarget.querySelector("input[name=date]") as HTMLInputElement | null;
      if (form) form.value = date;
    }}>
      <DayActions projectId={projectId} phase={phase} okrs={okrs} caption={caption} captionClassName={captionClassName} placeholder={placeholder} submitLabel={submitLabel} />
    </div>
  );
}

export function InfoForm({ projectId, date, triggerLabel = "+ Info", triggerClassName = "btn btn-ghost" }: { projectId: string; date: string; triggerLabel?: string; triggerClassName?: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  if (!open) return <button type="button" className={triggerClassName} onClick={() => setOpen(true)}>{triggerLabel}</button>;
  return (
    <form className="flex flex-col gap-3" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      setPending(true);
      void saveInfo({ text: String(data.get("text")), source: String(data.get("source") ?? "") || null, channel: String(data.get("channel")), projectId, date }).then((result) => {
        setPending(false);
        notify(result);
        if (result.ok) setOpen(false);
      });
    }}>
      <label className="field"><span>Information</span><textarea name="text" className="control min-h-20" maxLength={1200} required /></label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field"><span>Source</span><input name="source" className="control" maxLength={120} /></label>
        <label className="field"><span>Canal</span>
          <select name="channel" className="control">{["WhatsApp", "Appel", "Email", "SMS", "Teams (chat)", "En personne", "Autre"].map((item) => <option key={item}>{item}</option>)}</select>
        </label>
      </div>
      <button className="btn btn-primary w-fit" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
    </form>
  );
}

export function KrField({ okrId, krId, current }: { okrId: string; krId: string; current: number }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <input
      className={`control kr-input ${state === "saved" ? "is-saved" : ""} ${state === "error" ? "is-error" : ""}`}
      type="number"
      defaultValue={current}
      aria-label="Valeur actuelle"
      disabled={state === "saving"}
      onBlur={(event) => {
        const next = Number(event.target.value) || 0;
        if (next === current) return;
        setState("saving");
        void setKeyResultCurrent(okrId, krId, next).then((result) => {
          notify(result);
          setState(result.ok ? "saved" : "error");
          window.setTimeout(() => setState("idle"), 900);
        });
      }}
    />
  );
}

export function KpiToday({ kpiId, date, value }: { kpiId: string; date: string; value: number | null }) {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <input
      className={`control kr-input ${state === "saved" ? "is-saved" : ""} ${state === "error" ? "is-error" : ""}`}
      type="number"
      defaultValue={value ?? ""}
      placeholder="—"
      aria-label="Valeur du jour"
      disabled={state === "saving"}
      onBlur={(event) => {
        setState("saving");
        void setKpiValue({ kpiId, date, value: event.target.value === "" ? null : Number(event.target.value) }).then((result) => {
          notify(result);
          setState(result.ok ? "saved" : "error");
          window.setTimeout(() => setState("idle"), 900);
        });
      }}
    />
  );
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

export function ResolveButton({ id, status }: { id: string; status: "open" | "progress" | "resolved" }) {
  const [pending, setPending] = useState(false);
  const next = status === "resolved" ? "open" : "resolved";
  return <button type="button" className="btn" disabled={pending} onClick={() => { setPending(true); void setAnomalyStatus(id, next).then((result) => { notify(result); setPending(false); }); }}>{pending ? "Enregistrement…" : status === "resolved" ? "Rouvrir" : "Marquer résolue"}</button>;
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

export function FollowUp({ meetingId, text, projects }: { meetingId: string; text: string; projects: Array<Option & { phase: number }> }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const phase = projects.find((project) => project.id === projectId)?.phase ?? 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className="control w-auto" value={projectId} aria-label="Projet de la tâche" onChange={(event) => setProjectId(event.target.value)}>
        {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select>
      <button type="button" className="btn" onClick={() => void followUpToTask(meetingId, text, projectId, phase).then((result) => { notify(result); if (result.ok) router.refresh(); })}>Créer une tâche</button>
    </div>
  );
}
