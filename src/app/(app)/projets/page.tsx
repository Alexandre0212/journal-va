import Link from "next/link";
import { Logo } from "@/components/logo";
import { PROJECT_LOGOS, phaseByIndex } from "@/domain/phases";
import { averageRatio, formatPercent, okrRatio } from "@/domain/okr";
import { loadProjects } from "@/server/queries";

export default async function ProjectsPage() {
  const projects = await loadProjects();
  if (!projects.length) return <p className="text-muted">Aucun projet pour l'instant.</p>;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Projets</h1>
      <div className="grid gap-4 lg:grid-cols-3">
        {projects.map((project) => {
          const phase = phaseByIndex(project.phase);
          const avg = averageRatio(project.okrs.filter((okr) => okr.phase === project.phase).map((okr) => okrRatio({ keyResults: okr.keyResults })));
          return (
            <Link key={project.id} href={`/projets/${project.id}`} className="surface flex flex-col gap-3 p-5" style={{ borderTop: `8px solid ${phase.color}` }}>
              <span className="logo-plate self-start"><Logo src={PROJECT_LOGOS[project.id] ?? ""} alt="" height={32} /></span>
              <h2 className="text-h3">{project.name}</h2>
              <p className="text-small">{phase.name} · {avg == null ? "—" : formatPercent(avg)}</p>
              <p className="text-small text-muted">{project.lead ? `Responsable : ${project.lead.name}` : "Responsable non renseigné"}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
