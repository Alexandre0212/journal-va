import { Logo } from "@/components/logo";
import { Ribbon } from "@/components/motion/ribbon";
import { PHASES } from "@/domain/phases";

export default function StyleguidePage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-caption text-accent-text">Haskè Premium 2026</p>
        <h1 className="text-display">Styleguide</h1>
        <p className="max-w-xl text-muted">Daylight, Midnight et Système. Les tailles se limitent à l'échelle typographique du design.</p>
      </header>
      <Ribbon className="h-24" />
      <section className="grid gap-3 sm:grid-cols-2">
        <article className="surface p-5"><h2 className="text-h2">Titre H2</h2><h3 className="text-h3">Titre H3</h3><p>Corps de texte pour le travail quotidien.</p><p className="text-small text-muted">Texte secondaire</p><p className="text-caption">Légende</p><p className="text-kpi num">128</p></article>
        <article className="surface p-5 flex flex-col gap-3">
          <button className="btn btn-primary w-fit">Action principale</button>
          <button className="btn w-fit">Action secondaire</button>
          <span className="chip">Pastille</span>
          <input className="control" placeholder="Champ" />
        </article>
      </section>
      <section className="grid grid-cols-2 gap-2 md:grid-cols-7">
        {PHASES.map((phase) => <div key={phase.name} className="rounded-[8px] px-2 py-4 text-center text-small font-semibold" style={{ background: phase.color, color: phase.on }}>{phase.name}</div>)}
      </section>
      <section className="flex gap-4">
        <span className="logo-plate"><Logo src="/logos/safya.png" alt="SAFYA" height={40} /></span>
        <span className="logo-plate"><Logo src="/logos/triage-plus.png" alt="TRIAGE+" height={32} /></span>
        <span className="logo-plate"><Logo src="/logos/ractac.png" alt="RacTac" height={32} /></span>
      </section>
    </div>
  );
}
