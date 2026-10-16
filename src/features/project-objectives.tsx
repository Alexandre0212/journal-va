import { BadgeCheck, ChevronRight, HeartPulse, LockKeyhole, ShieldCheck, Stethoscope, Target, Users } from "lucide-react";
import Link from "next/link";
import { KeyResultRow } from "@/components/key-result-row";
import { formatPercent, okrRatio } from "@/domain/okr";
import { DeleteButton } from "@/features/forms";
import { Reveal } from "@/features/reveal";

const ICONS = [Target, Stethoscope, Users, ShieldCheck, BadgeCheck, HeartPulse, LockKeyhole];
const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

type KeyResult = { id: string; label: string; current: number; target: number; unit: string };
type Objective = { id: string; title: string; due: string | null; keyResults: KeyResult[] };

function statusOf(ratio: number, due: string | null, today: string) {
  if (ratio >= 1) return { label: "Atteint", tone: "good" };
  if (due && due < today) return { label: "En retard", tone: "late" };
  if (ratio > 0) return { label: "En cours", tone: "progress" };
  return { label: "À démarrer", tone: "idle" };
}

export function ProjectObjectives({ phaseName, today, okrs }: { phaseName: string; today: string; okrs: Objective[] }) {
  return (
    <section className="fiche-card">
      <header className="fiche-card-head">
        <div className="fiche-card-title">
          <span className="fiche-ico fiche-ico-orange"><Target size={18} aria-hidden /></span>
          <div>
            <h2 className="text-h3">Objectifs de la phase</h2>
            <p className="text-small text-muted">Objectifs de la phase {phaseName}</p>
          </div>
        </div>
        <Link className="fiche-soft" href="/okr">Voir tous les OKR</Link>
      </header>
      {okrs.length ? (
        <div className="fiche-okrs">
          {okrs.map((okr, index) => {
            const ratio = okrRatio(okr);
            const status = statusOf(ratio, okr.due, today);
            const Icon = ICONS[index % ICONS.length] ?? Target;
            const sole = okr.keyResults.length === 1 ? okr.keyResults[0] : null;
            const detail = sole?.label ?? (okr.keyResults.length ? `${okr.keyResults.length} résultats clés` : "Aucun résultat clé");
            const score = sole ? `${nf.format(sole.current)} / ${nf.format(sole.target)}${sole.unit ? ` ${sole.unit}` : ""}` : `${okr.keyResults.length} résultats`;
            return (
              <Reveal key={okr.id} delay={index * 0.04}>
                <details className="fiche-okr" data-tone={status.tone}>
                  <summary className="fiche-okr-line">
                    <span className={`fiche-ico fiche-ico-${status.tone}`}><Icon size={18} aria-hidden /></span>
                    <span className="fiche-okr-copy">
                      <span className="fiche-okr-title">{okr.title}</span>
                      <span className="fiche-okr-detail">{detail}</span>
                    </span>
                    <span className="dash-meter fiche-okr-meter" aria-hidden><span style={{ width: `${Math.round(ratio * 100)}%` }} /></span>
                    <span className="fiche-okr-pct num">{formatPercent(ratio)}</span>
                    <span className="fiche-okr-score num">{score}</span>
                    <span className={`fiche-badge fiche-badge-${status.tone}`}>{status.label}</span>
                    <ChevronRight className="fiche-go" size={18} aria-hidden />
                  </summary>
                  <div className="fiche-kr-panel">
                    {okr.keyResults.length ? okr.keyResults.map((kr) => <KeyResultRow key={kr.id} okrId={okr.id} due={okr.due} kr={kr} />) : <p className="text-small text-muted">Aucun résultat clé.</p>}
                    <DeleteButton entity="okr" id={okr.id} />
                  </div>
                </details>
              </Reveal>
            );
          })}
        </div>
      ) : (
        <div className="fiche-empty">
          <span className="fiche-ico fiche-ico-orange"><Target size={18} aria-hidden /></span>
          <p className="text-h3">Aucun objectif défini pour cette phase</p>
          <p className="text-small text-muted">La phase {phaseName} n&apos;a pas encore d&apos;OKR.</p>
          <Link className="btn btn-primary" href="/okr">Créer un objectif</Link>
        </div>
      )}
    </section>
  );
}
