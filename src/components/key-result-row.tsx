import { paceText } from "@/domain/okr";
import { KrField } from "@/features/forms";

export function KeyResultRow({ okrId, due, kr }: { okrId: string; due: string | null; kr: { id: string; label: string; current: number; target: number; unit: string } }) {
  const pace = paceText(due, kr);
  return (
    <div className="kr-row">
      <div className="min-w-0">
        <p className="text-small font-medium">{kr.label}</p>
        {pace ? <p className={`text-small ${pace.startsWith("Échéance") ? "text-crit" : "text-muted"}`}>{pace}</p> : null}
      </div>
      <KrField okrId={okrId} krId={kr.id} current={kr.current} />
      <p className="kr-target text-small">
        <span className="num">{kr.target}</span>
        <span className="kr-unit text-muted">{kr.unit}</span>
      </p>
    </div>
  );
}
