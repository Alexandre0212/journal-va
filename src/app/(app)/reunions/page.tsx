import { MarkdownView } from "@/components/markdown-view";
import { parseMarkdown } from "@/domain/markdown";
import { FollowUp, MeetingForm } from "@/features/forms";
import { requireUser } from "@/server/auth/session";
import { loadMeetings } from "@/server/queries";

export default async function MeetingsPage() {
  const user = await requireUser();
  const { meetings, projects } = await loadMeetings();
  const options = projects.map((project) => ({ id: project.id, name: project.name, phase: project.phase }));
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Réunions et décisions</h1>
      {user.role === "ADMIN" ? <MeetingForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} /> : <p className="text-small text-muted">La rédaction des comptes rendus est réservée aux administrateurs. Vous pouvez transformer une action de suivi en tâche.</p>}
      {meetings.length ? meetings.map((meeting) => (
        <article key={meeting.id} className="surface p-5">
          <p className="text-caption text-muted">{meeting.date}{meeting.start ? ` · ${meeting.start}` : ""} · {meeting.participants.join(", ") || "Participants non renseignés"}</p>
          <h2 className="text-h2 mt-1">{meeting.title}</h2>
          <div className="mt-3"><MarkdownView text={meeting.cr} /></div>
          <div className="mt-4 flex flex-col gap-2">
            {parseMarkdown(meeting.cr).flatMap((block) => block.type === "ul" ? block.items : []).slice(0, 8).map((item) => (
              <div key={item} className="flex flex-wrap items-center justify-between gap-2 text-small">
                <span>{item.replace(/\*\*/g, "")}</span>
                <FollowUp meetingId={meeting.id} text={item} projects={options} />
              </div>
            ))}
          </div>
        </article>
      )) : <p className="text-muted">Aucune réunion.</p>}
    </div>
  );
}
