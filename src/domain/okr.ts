export type KeyResultInput = {
  target: number;
  current: number;
  unit?: string;
};

export type OkrInput = {
  due?: string | null;
  keyResults: KeyResultInput[];
};

export function krRatio(kr: KeyResultInput): number {
  const target = Number(kr.target) || 0;
  if (target <= 0) return 0;
  const current = Number(kr.current) || 0;
  return Math.max(0, Math.min(1, current / target));
}

export function okrRatio(okr: OkrInput): number {
  const list = okr.keyResults;
  if (!list.length) return 0;
  return list.reduce((sum, kr) => sum + krRatio(kr), 0) / list.length;
}

export function averageRatio(ratios: number[]): number | null {
  if (!ratios.length) return null;
  return ratios.reduce((sum, value) => sum + value, 0) / ratios.length;
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function paceText(
  due: string | null | undefined,
  kr: KeyResultInput,
  now: Date = new Date(),
): string | null {
  if (!due || krRatio(kr) >= 1) return null;
  const left = (Number(kr.target) || 0) - (Number(kr.current) || 0);
  const unit = (kr.unit ?? "").trim();
  const end = Date.parse(`${due}T23:59:59`);
  const days = Math.ceil((end - now.getTime()) / 86_400_000);
  const missing = `${nf.format(left)}${unit ? ` ${unit}` : ""}`;
  if (days <= 0) return `Échéance dépassée · il manque ${missing}`;
  const weeks = days / 7;
  const weekLabel = `semaine${weeks >= 2 ? "s" : ""}`;
  return `Reste ${missing} en ${nf.format(weeks)} ${weekLabel} · rythme nécessaire ≈ ${nf.format(left / weeks)}${unit ? ` ${unit}` : ""} / semaine`.replace(
    /\s+/g,
    " ",
  );
}
