import { AnomaliesBoard } from "@/features/anomalies-board";
import { todayISO } from "@/lib/dates";
import { requireUser } from "@/server/auth/session";
import { loadAnomalies } from "@/server/queries";

const ALLOWED = new Set(["safya", "triage", "rpm"]);

export default async function AnomaliesPage() {
  const user = await requireUser();
  const { anomalies, projects, users, revisedAt } = await loadAnomalies();
  const allowed = projects.filter((project) => ALLOWED.has(project.id));
  return (
    <div className="page">
      <AnomaliesBoard
        today={todayISO()}
        actor={{ id: user.id, name: user.name }}
        users={users.map((member) => ({ id: member.id, name: member.name }))}
        projects={allowed.map((project) => ({ id: project.id, name: project.name, enabled: project.anomaliesEnabled }))}
        anomalies={anomalies.filter((item) => ALLOWED.has(item.projectId)).map((item) => ({
          id: item.id,
          projectId: item.projectId,
          date: item.date,
          createdAt: item.createdAt.toISOString(),
          text: item.text,
          severity: item.severity,
          status: item.status,
          author: item.by?.name ?? null,
          assigneeId: item.assigneeId,
          assignee: item.assignee?.name ?? null,
          file: item.file ? { name: item.file.name, mimeType: item.file.mimeType, unavailable: item.file.unavailable } : null,
          comments: item.comments.map((comment) => ({
            id: comment.id,
            body: comment.body,
            at: comment.createdAt.toISOString(),
            author: comment.author.name,
          })),
          revisedAt: revisedAt.get(item.id)?.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
