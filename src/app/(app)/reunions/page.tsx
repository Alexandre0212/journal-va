import { MeetingsBoard } from "@/features/meetings-board";
import { TIMEZONE, todayISO } from "@/lib/dates";
import { requireUser } from "@/server/auth/session";
import { loadMeetings } from "@/server/queries";

const ALLOWED = new Set(["safya", "triage", "rpm"]);

function minutesNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export default async function MeetingsPage() {
  const user = await requireUser();
  const { meetings, projects, users, tasks } = await loadMeetings();
  const allowed = projects.filter((project) => ALLOWED.has(project.id));
  return (
    <div className="page">
      <MeetingsBoard
        canWrite={user.role === "ADMIN"}
        today={todayISO()}
        minutesNow={minutesNow()}
        people={users.map((person) => ({ id: person.id, name: person.name }))}
        projects={allowed.map((project) => ({ id: project.id, name: project.name, phase: project.phase }))}
        tasks={tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          due: task.due,
          assignee: task.assignee?.name ?? null,
          projectName: task.project.name,
          deleted: task.deletedAt != null,
        }))}
        meetings={meetings.map((meeting) => ({
          id: meeting.id,
          title: meeting.title,
          date: meeting.date,
          start: meeting.start,
          participants: meeting.participants,
          cr: meeting.cr,
          projectIds: meeting.projects.map((link) => link.projectId).filter((id) => ALLOWED.has(id)),
          actions: meeting.actions.map((action) => ({ id: action.id, text: action.text, taskId: action.taskId })),
        }))}
      />
    </div>
  );
}
