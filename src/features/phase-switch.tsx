"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setProjectPhase } from "@/server/actions";

export function PhaseSwitch({ projectId, projectName, official, phases }: { projectId: string; projectName: string; official: number; phases: Array<{ index: number; name: string; color: string }> }) {
  const reduce = useReducedMotion();
  const router = useRouter();
  const [target, setTarget] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const current = phases.find((item) => item.index === official);
  const next = phases.find((item) => item.index === target);

  useEffect(() => {
    if (target == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, saving]);

  async function confirm() {
    if (target == null || saving) return;
    const phase = target;
    setSaving(true);
    try {
      const result = await setProjectPhase({ id: projectId, phase });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const name = phases.find((item) => item.index === phase)?.name ?? "cette phase";
      setTarget(null);
      toast.success(`${projectName} est maintenant en phase ${name}.`);
      router.refresh();
    } catch {
      toast.error("Enregistrement impossible pour le moment. Réessayez dans un instant.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <nav className="fiche-phases" aria-label="Phase officielle">
        {phases.map((item) => {
          const selected = item.index === official;
          return (
            <button
              key={item.index}
              type="button"
              className={selected ? "is-on" : ""}
              style={{ ["--c" as string]: item.color }}
              aria-current={selected ? "true" : undefined}
              aria-pressed={selected}
              disabled={saving}
              onClick={() => { if (!selected) setTarget(item.index); }}
            >
              {selected ? (
                <motion.span className="fiche-phase-fill" layoutId={`fiche-phase-${projectId}`} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }} />
              ) : null}
              {selected ? <i className="fiche-phase-mark" aria-hidden /> : null}
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
      {target != null && next && current ? createPortal(
        <div className="modal-back" onClick={() => { if (!saving) setTarget(null); }}>
          <div className="sheet" role="alertdialog" aria-modal="true" aria-labelledby="phase-change-title" aria-describedby="phase-change-text" onClick={(event) => event.stopPropagation()}>
            <h2 id="phase-change-title" className="text-h3">Changer de phase ?</h2>
            <p id="phase-change-text">Vous êtes sur le point de faire passer {projectName} de {current.name} à {next.name}.</p>
            <p className="text-small text-muted">Les objectifs et les tâches de la nouvelle phase seront affichés. Les données des phases précédentes seront conservées.</p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn" disabled={saving} onClick={() => setTarget(null)}>Annuler</button>
              <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void confirm()}>{saving ? "Enregistrement…" : "Confirmer le changement"}</button>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
