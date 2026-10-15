import { MgmtForm, MgmtStatus } from "@/features/forms";
import { formatDayLong, todayISO } from "@/lib/dates";
import Unauthorized from "../non-autorise/page";
import { requireUser } from "@/server/auth/session";
import { loadMgmt } from "@/server/queries";

export default async function PilotagePage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") return <Unauthorized />;
  const items = await loadMgmt();
  const today = todayISO();
  const days = [...new Set(items.map((item) => item.date))];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1">Pilotage du studio</h1>
        <p className="text-small text-muted">Le travail de management, hors projets.</p>
      </div>
      <MgmtForm date={today} />
      {days.length ? days.map((day) => (
        <section key={day}>
          <h2 className="text-caption text-muted">{day === today ? "Aujourd'hui" : formatDayLong(day)}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {items.filter((item) => item.date === day).map((item) => (
              <li key={item.id} className="surface flex items-center justify-between gap-3 p-3 text-small">
                <span>{item.text}</span>
                <MgmtStatus id={item.id} status={item.status} />
              </li>
            ))}
          </ul>
        </section>
      )) : <p className="text-muted">Rien de saisi pour l'instant.</p>}
    </div>
  );
}
