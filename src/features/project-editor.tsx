"use client";

import { Pencil, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProject } from "@/server/actions";

const EASE = [0.22, 1, 0.36, 1] as const;

type UserOption = { id: string; name: string };

type ProjectDraft = {
  id: string;
  name: string;
  phase: number;
  coursesEnabled: boolean;
  anomaliesEnabled: boolean;
  leadId: string | null;
  participantIds: string[];
};

export function ProjectEditor({ project, users }: { project: ProjectDraft; users: UserOption[] }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const pendingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { pendingRef.current = pending; }, [pending]);

  useEffect(() => {
    if (!open) return;
    const button = trigger.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = panel.current;
    node?.querySelector<HTMLElement>("input, select, button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingRef.current) {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !node) return;
      const list = [...node.querySelectorAll<HTMLElement>("button, input, select, textarea")].filter((item) => !item.hasAttribute("disabled"));
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      button?.focus();
    };
  }, [open]);

  function close() {
    if (!pending) setOpen(false);
  }

  return (
    <>
      <button ref={trigger} type="button" className="fiche-edit" onClick={() => { setError(""); setOpen(true); }}>
        <Pencil size={16} aria-hidden />
        Modifier le projet
      </button>
      {open ? createPortal(
        <motion.div
          className="drawer-back"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0.12 : 0.2 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}
        >
          <motion.aside
            ref={panel}
            className="drawer project-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-edit-title"
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduce ? { duration: 0.12 } : { duration: 0.28, ease: EASE }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="text-caption text-accent-text">Fiche projet</p>
                <h2 id="project-edit-title" className="text-h2">Modifier le projet</h2>
              </div>
              <button type="button" className="icon-btn" aria-label="Fermer" disabled={pending} onClick={close}><X size={18} /></button>
            </header>
            <form className="flex flex-col gap-4" onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const name = String(data.get("name") ?? "").trim();
              if (!name) { setError("Indiquez le nom du projet."); return; }
              setPending(true);
              setError("");
              void saveProject({
                id: project.id,
                name,
                phase: project.phase,
                coursesEnabled: data.get("courses") === "on",
                anomaliesEnabled: data.get("anomalies") === "on",
                leadId: String(data.get("leadId") ?? "") || null,
                participantIds: data.getAll("participant").map(String),
              }).then((result) => {
                setPending(false);
                if (!result.ok) { setError(result.error); toast.error(result.error); return; }
                toast.success("Projet mis à jour.");
                setOpen(false);
                router.refresh();
              }).catch(() => {
                setPending(false);
                setError("Enregistrement impossible pour le moment. Réessayez dans un instant.");
                toast.error("Enregistrement impossible pour le moment. Réessayez dans un instant.");
              });
            }}>
              <label className="field"><span>Nom</span><input name="name" className="control" defaultValue={project.name} maxLength={80} required disabled={pending} /></label>
              <label className="field"><span>Responsable</span>
                <select name="leadId" className="control" defaultValue={project.leadId ?? ""} disabled={pending}>
                  <option value="">Non renseigné</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              </label>
              <fieldset className="project-checks">
                <legend className="text-caption">Participants</legend>
                {users.length ? users.map((user) => (
                  <label key={user.id}>
                    <input type="checkbox" name="participant" value={user.id} defaultChecked={project.participantIds.includes(user.id)} disabled={pending} />
                    {user.name}
                  </label>
                )) : <p className="text-small text-muted">Aucun membre à proposer.</p>}
              </fieldset>
              <fieldset className="project-checks">
                <legend className="text-caption">Modules</legend>
                <label><input type="checkbox" name="courses" defaultChecked={project.coursesEnabled} disabled={pending} /> Activer les courses</label>
                <label><input type="checkbox" name="anomalies" defaultChecked={project.anomaliesEnabled} disabled={pending} /> Activer les anomalies</label>
              </fieldset>
              <p className="text-small text-muted">La phase officielle se change avec la frise, au-dessus de cette fiche.</p>
              {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="btn" disabled={pending} onClick={close}>Annuler</button>
                <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
              </div>
            </form>
          </motion.aside>
        </motion.div>,
        document.body,
      ) : null}
    </>
  );
}
