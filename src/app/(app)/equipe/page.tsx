import Unauthorized from "../non-autorise/page";
import { EquipeBoard } from "@/features/equipe-board";
import { requireUser } from "@/server/auth/session";
import { loadTeam } from "@/server/queries";

export default async function TeamPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <Unauthorized />;
  const users = await loadTeam();
  return (
    <div className="page">
      <EquipeBoard
        actorId={user.id}
        members={users.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          title: member.title,
          role: member.role,
          active: member.active,
          avatarUrl: member.avatarUrl,
        }))}
      />
    </div>
  );
}
