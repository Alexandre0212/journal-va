"use client";

import { Search } from "lucide-react";
import { assignableMembers } from "@/domain/team";

export function TaskFiltersToolbar({
  query,
  onQueryChange,
  projects,
  projectId,
  onProjectChange,
  users,
  assigneeId,
  onAssigneeChange,
  priority,
  onPriorityChange,
  horizon,
  onHorizonChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  projects: Array<{ id: string; name: string }>;
  projectId: string;
  onProjectChange: (value: string) => void;
  users: Array<{ id: string; name: string; isTest: boolean }>;
  assigneeId: string;
  onAssigneeChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  horizon: string;
  onHorizonChange: (value: string) => void;
}) {
  const roster = assignableMembers(users);
  const projectScope = projects.length > 1;
  const projectLabel = projects.find((project) => project.id === projectId)?.name ?? "Tous les projets";
  const assigneeLabel = assigneeId === "none" ? "Non attribuée" : roster.find((user) => user.id === assigneeId)?.name ?? "Tous les responsables";
  const priorityLabel = priority === "high" ? "Haute" : priority === "normal" ? "Normale" : priority === "low" ? "Basse" : priority === "none" ? "Non renseignée" : "Toutes les priorités";
  const horizonLabel = horizon === "soon" ? "Dans 7 jours" : horizon === "late" ? "En retard" : horizon === "none" ? "Sans échéance" : "Toutes les échéances";

  return (
    <div className="board-panel">
      <label className="board-search-wrap">
        <Search size={16} aria-hidden />
        <input className="control board-search" placeholder="Rechercher une tâche…" value={query} onChange={(event) => onQueryChange(event.target.value)} aria-label="Rechercher une tâche" />
      </label>
      <div className={projectScope ? "board-filters" : "board-filters board-filters-project"}>
        {projectScope ? (
          <select className="control board-filter board-filter-project" aria-label="Filtrer par projet" title={projectLabel} value={projectId} onChange={(event) => onProjectChange(event.target.value)}>
            <option value="">Tous les projets</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        ) : null}
        <select className="control board-filter board-filter-assignee" aria-label="Filtrer par responsable" title={assigneeLabel} value={assigneeId} onChange={(event) => onAssigneeChange(event.target.value)}>
          <option value="">Tous les responsables</option>
          <option value="none">Non attribuée</option>
          {roster.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
        </select>
        <select className="control board-filter board-filter-priority" aria-label="Filtrer par priorité" title={priorityLabel} value={priority} onChange={(event) => onPriorityChange(event.target.value)}>
          <option value="">Toutes les priorités</option>
          <option value="high">Haute</option>
          <option value="normal">Normale</option>
          <option value="low">Basse</option>
          <option value="none">Non renseignée</option>
        </select>
        <select className="control board-filter board-filter-due" aria-label="Filtrer par échéance" title={horizonLabel} value={horizon} onChange={(event) => onHorizonChange(event.target.value)}>
          <option value="">Toutes les échéances</option>
          <option value="soon">Dans 7 jours</option>
          <option value="late">En retard</option>
          <option value="none">Sans échéance</option>
        </select>
      </div>
    </div>
  );
}
