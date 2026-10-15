import { AnomalyForm, ResolveButton } from "@/features/forms";
import { loadAnomalies } from "@/server/queries";

export default async function AnomaliesPage() {
  const { anomalies, projects } = await loadAnomalies();
  const enabled = projects.filter((project) => project.anomaliesEnabled);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Anomalies</h1>
      {enabled.length ? enabled.map((project) => (
        <section key={project.id} className="surface p-5">
          <h2 className="text-h3">{project.name}</h2>
          <div className="mt-3"><AnomalyForm projectId={project.id} /></div>
        </section>
      )) : <p className="text-muted">Aucun projet n'a le module anomalies activé.</p>}
      <ul className="flex flex-col gap-3">
        {anomalies.map((anomaly) => (
          <li key={anomaly.id} className="surface p-4">
            <p className="text-caption text-muted">{anomaly.project.name} · {anomaly.date} · {anomaly.severity}</p>
            <p className="mt-1">{anomaly.text}</p>
            {anomaly.file?.unavailable ? <p className="text-small text-muted">Fichier indisponible{anomaly.file.name ? ` · ${anomaly.file.name}` : ""}. La référence est conservée.</p> : null}
            <ResolveButton id={anomaly.id} status={anomaly.status} />
          </li>
        ))}
        {!anomalies.length ? <li className="text-muted">Aucune anomalie notée.</li> : null}
      </ul>
    </div>
  );
}
