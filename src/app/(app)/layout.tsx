import { AppHeader, AppMobile, AppSidebar } from "@/components/layout/shell";
import { authMode, requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { formatDayLong, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const projects = await prisma.project.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } });
  const actor = { id: user.id, name: user.name, email: user.email, role: user.role, isTest: user.isTest };
  return (
    <>
      <div className="shell">
        <AppSidebar user={actor} />
        <div className="min-w-0">
          <AppHeader user={actor} projects={projects} dev={authMode() === "dev"} dayLabel={formatDayLong(todayISO())} />
          <main className="px-4 py-6 pb-24 md:px-6 md:pb-8 xl:px-8">{children}</main>
        </div>
      </div>
      <AppMobile user={actor} />
    </>
  );
}
