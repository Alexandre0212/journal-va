import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";

export function JournalOkrProgressRow({
  href,
  name,
  logo,
  logoHeight,
  phase,
  phaseColor,
  percent,
  width,
  detail,
}: {
  href: string;
  name: string;
  logo: string;
  logoHeight: number;
  phase: string;
  phaseColor: string;
  percent: string;
  width: number;
  detail: string;
}) {
  return (
    <Link href={href} className="journal-okr" aria-label={`Objectifs de ${name}`} style={{ ["--c" as string]: phaseColor }}>
      <span className="logo-plate journal-okr-logo"><Logo src={logo} alt="" height={logoHeight} /></span>
      <span className="journal-okr-name">{name}</span>
      <span className="journal-phase">{phase}</span>
      <span className="dash-meter journal-okr-meter" aria-hidden><span style={{ width: `${width}%` }} /></span>
      <strong className="num journal-okr-pct">{percent}</strong>
      <span className="journal-okr-detail text-small text-muted">{detail}</span>
      <ArrowRight className="journal-okr-go" size={16} aria-hidden />
    </Link>
  );
}
