import { isLate } from "@/domain/tasks";
import { TaskBoard, type BoardTask } from "@/features/board";
import { todayISO } from "@/lib/dates";
import { loadTasks } from "@/server/queries";

export default async function TasksPage() {
  const { tasks, projects, okrs, users } = await loadTasks();
  const today = todayISO();
  const board: BoardTask[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    projectId: task.projectId,
    projectName: task.project.name,
    phase: task.phase,
    okrId: task.okrId,
    okrTitle: task.okr?.title ?? null,
    assigneeId: task.assigneeId,
    assignee: task.assignee?.name ?? null,
    due: task.due,
    date: task.date,
    priority: task.priority === "low" || task.priority === "normal" || task.priority === "high" ? task.priority : null,
    blocker: task.blocker,
    late: isLate(task.due, task.status, today),
  }));
  const counts = { todo: 0, doing: 0, blocked: 0, done: 0 };
  for (const task of board) counts[task.status] += 1;
  return (
    <div className="page">
      <TaskBoard
        heading={
          <>
            <p className="text-caption text-accent-text">Quotidien</p>
            <h1 className="text-h1">Tâches</h1>
            <p className="text-small text-muted">{counts.todo} à faire · {counts.doing} en cours · {counts.blocked} bloqué · {counts.done} fait</p>
            <span className="mast-rule" />
          </>
        }
        key={board.map((task) => task.id).join(",")}
        tasks={board}
        today={today}
        meta={{ projects: projects.map((project) => ({ id: project.id, name: project.name, phase: project.phase })), okrs, users: users.map((user) => ({ id: user.id, name: user.name })) }}
      />
    </div>
  );
}
