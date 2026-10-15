import Unauthorized from "../non-autorise/page";
import { requireUser } from "@/server/auth/session";
import { loadTeam } from "@/server/queries";

export default async function TeamPage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <Unauthorized />;
  const users = await loadTeam();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Équipe</h1>
      <ul className="grid gap-3 md:grid-cols-3">
        {users.map((user) => (
          <li key={user.id} className="surface p-4">
            <h2 className="text-h3">{user.name}</h2>
            <p className="text-small text-muted">{user.email}</p>
            <p className="text-small">{user.isTest ? "Compte de test" : user.role === "ADMIN" ? "Administrateur" : "Venture Architect"}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
