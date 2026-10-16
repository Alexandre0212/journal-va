import { PilotageBoard } from "@/features/pilotage-board";
import { todayISO } from "@/lib/dates";
import Unauthorized from "../non-autorise/page";
import { requireUser } from "@/server/auth/session";
import { loadMgmt } from "@/server/queries";

export default async function PilotagePage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <Unauthorized />;
  const items = await loadMgmt();
  return (
    <div className="page">
      <PilotageBoard
        today={todayISO()}
        items={items.map((item) => ({
          id: item.id,
          text: item.text,
          status: item.status,
          date: item.date,
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
