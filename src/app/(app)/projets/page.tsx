import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { PROJECT_ACCENTS, PROJECT_LOGOS, phaseByIndex } from "@/domain/phases";
import { averageRatio, formatPercent, okrRatio } from "@/domain/okr";
import { Reveal } from "@/features/reveal";
import { loadProjects } from "@/server/queries";

const PROJECT_ART: Record<string, { src: string; position: string }> = {
  safya: { src: "/images/dashboard/project-safya-soignante.webp", position: "center 16%" },
  triage: { src: "/images/dashboard/project-triage-medical.webp", position: "72% center" },
  rpm: { src: "/images/dashboard/project-ractac-livreur.webp", position: "32% center" },
};

export default async function ProjectsPage() {
  const projects = await loadProjects();
  if (!projects.length) return <p className="text-muted">Aucun projet pour l'instant.</p>;
  const open = projects.reduce((sum, project) => sum + project.tasks.filter((task) => task.status !== "done").length, 0);
  const blocked = projects.reduce((sum, project) => sum + project.tasks.filter((task) => task.status === "blocked").length, 0);
  const done = projects.reduce((sum, project) => sum + project.tasks.filter((task) => task.status === "done").length, 0);
  return (
    <div className="page">
      <header className="mast">
        <p className="text-caption text-accent-text">Studio</p>
        <h1 className="text-h1">Portefeuille</h1>
        <p className="text-small text-muted">SAFYA, TRIAGE+ et RacTac. Les trois projets du studio.</p>
        <span className="mast-rule" />
      </header>
      <div className="folio-bar">
        <article><p className="text-caption text-muted">Projets</p><p className="num text-kpi">{projects.length}</p></article>
        <article><p className="text-caption text-muted">Tâches ouvertes</p><p className="num text-kpi">{open}</p><p className="text-small text-muted">{done} terminée{done > 1 ? "s" : ""}</p></article>
        <article><p className="text-caption text-muted">Blocages</p><p className="num text-kpi">{blocked}</p></article>
      </div>
      <div className="dash-projects">
        {projects.map((project, index) => {
          const phase = phaseByIndex(project.phase);
          const avg = averageRatio(project.okrs.filter((okr) => okr.phase === project.phase).map((okr) => okrRatio({ keyResults: okr.keyResults })));
          const projectOpen = project.tasks.filter((task) => task.status !== "done").length;
          const projectBlocked = project.tasks.filter((task) => task.status === "blocked").length;
          const art = PROJECT_ART[project.id];
          return (
            <Reveal key={project.id} delay={0.06 + index * 0.05}>
              <Link href={`/projets/${project.id}`} className="dash-project" aria-label={project.name} style={{ ["--pc" as string]: PROJECT_ACCENTS[project.id] ?? phase.color }}>
                {art ? <Image className="dash-project-photo" src={art.src} alt="" width={640} height={420} unoptimized style={{ objectPosition: art.position }} /> : null}
                <div className="dash-project-copy">
                  <div className="dash-project-top">
                    <span className="logo-plate"><Logo src={PROJECT_LOGOS[project.id] ?? ""} alt="" height={project.id === "rpm" ? 40 : project.id === "triage" ? 22 : 28} /></span>
                    <span className="dash-phase">{phase.name}</span>
                  </div>
                  <p className="num text-kpi whitespace-nowrap">{avg == null ? "—" : formatPercent(avg)}</p>
                  <p className="text-small">{projectOpen} tâche{projectOpen > 1 ? "s" : ""} ouverte{projectOpen > 1 ? "s" : ""} · {projectBlocked} blocage{projectBlocked > 1 ? "s" : ""}</p>
                  <p className="text-small text-muted">{project.lead ? `Responsable : ${project.lead.name}` : "Responsable non renseigné"}</p>
                  {project.note?.hot ? <p className="hot text-small">{project.note.hot}</p> : <p className="text-small text-muted">Pas de point chaud noté.</p>}
                  <span className="dash-go" aria-hidden><ArrowRight size={16} /></span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
