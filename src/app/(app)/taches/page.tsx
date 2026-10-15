import { isLate } from "@/domain/tasks";
import { TaskBoard, type BoardTask } from "@/features/board";
import { DeleteButton, TaskCreator } from "@/features/forms";
import { todayISO } from "@/lib/dates";
import { loadTasks } from "@/server/queries";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ projet?: string }> }) {
  const query = await searchParams;
  const { tasks, projects, okrs, users } = await loadTasks();
  const today = todayISO();
  const filtered = query.projet ? tasks.filter((task) => task.projectId === query.projet) : tasks;
  const board: BoardTask[] = filtered.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    projectName: task.project.name,
    okrTitle: task.okr?.title ?? null,
    assignee: task.assignee?.name ?? null,
    due: task.due,
    blocker: task.blocker,
    late: isLate(task.due, task.status, today),
  }));
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1">Tâches</h1>
        <p className="text-small text-muted">Glissez une carte. Le passage en « Bloqué » demande une raison. En cas d'échec, la carte revient.</p>
      </div>
      <nav className="flex flex-wrap gap-2">
        <a className={`btn ${!query.projet ? "btn-primary" : ""}`} href="/taches">Tous</a>
        {projects.map((project) => <a key={project.id} className={`btn ${query.projet === project.id ? "btn-primary" : ""}`} href={`/taches?projet=${project.id}`}>{project.name}</a>)}
      </nav>
      <TaskCreator projects={projects.map((project) => ({ id: project.id, name: project.name, phase: project.phase }))} okrs={okrs} users={users.map((user) => ({ id: user.id, name: user.name }))} />
      {board.length ? <TaskBoard tasks={board} /> : <p className="text-muted">Aucune tâche.</p>}
      <ul className="flex flex-col gap-2">
        {filtered.map((task) => <li key={task.id} className="flex items-center justify-between gap-3 text-small"><span>{task.title}</span><DeleteButton entity="task" id={task.id} /></li>)}
      </ul>
    </div>
  );
}
