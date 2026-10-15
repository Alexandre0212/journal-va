"use client";

import { Command } from "cmdk";
import { LayoutDashboard, BookOpen, FolderKanban, CheckSquare, Target, LineChart, Users, Bug, FileText, Briefcase, Trash2, Menu, Search, X, Bell } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Logo } from "@/components/logo";
import { DEV_ACTORS } from "@/domain/actors";
import { switchActor } from "@/server/actions";

const NAV = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/projets", label: "Projets", icon: FolderKanban },
  { href: "/taches", label: "Tâches", icon: CheckSquare },
  { href: "/okr", label: "OKR", icon: Target },
  { href: "/kpi", label: "KPI", icon: LineChart },
  { href: "/reunions", label: "Réunions", icon: Users },
  { href: "/anomalies", label: "Anomalies", icon: Bug },
  { href: "/recaps", label: "Récaps", icon: FileText },
  { href: "/pilotage", label: "Pilotage", icon: Briefcase, admin: true },
  { href: "/equipe", label: "Équipe", icon: Users, admin: true },
  { href: "/corbeille", label: "Corbeille", icon: Trash2 },
];

type Actor = { id: string; name: string; role: "ADMIN" | "VENTURE_ARCHITECT"; isTest: boolean };
type ChromeProps = {
  user: Actor;
  projects: Array<{ id: string; name: string }>;
  dev: boolean;
  dayLabel: string;
};

let navOpen = false;
const navListeners = new Set<() => void>();

function setNavOpen(value: boolean) {
  navOpen = value;
  navListeners.forEach((listener) => listener());
}

function useNavOpen() {
  return useSyncExternalStore(
    (listener) => {
      navListeners.add(listener);
      return () => navListeners.delete(listener);
    },
    () => navOpen,
    () => false,
  );
}

function visibleNav(user: Actor) {
  return NAV.filter((item) => !item.admin || user.role === "ADMIN");
}

export function AppSidebar({ user }: { user: Actor }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-line bg-surface px-4 py-6 lg:flex">
      <Brand />
      <Nav items={visibleNav(user)} pathname={pathname} />
    </aside>
  );
}

export function AppHeader({ user, projects, dev, dayLabel }: ChromeProps) {
  const [palette, setPalette] = useState(false);
  const items = visibleNav(user);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:px-8">
        <button type="button" className="btn btn-ghost lg:hidden" aria-label="Ouvrir le menu" onClick={() => setNavOpen(true)}>
          <Menu size={18} strokeWidth={1.75} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-caption text-accent-text">Haskè Ventures · Dakar</p>
          <p className="text-h3 truncate">{dayLabel}</p>
        </div>
        <button type="button" className="btn" onClick={() => setPalette(true)}>
          <Search size={18} strokeWidth={1.75} />
          <span className="hidden sm:inline">Rechercher</span>
        </button>
        <Notifications />
        <ThemeToggle />
        {dev ? <ActorSwitch current={user.id} /> : null}
        <div className="hidden text-right sm:block">
          <p className="text-small font-medium">{user.name}</p>
          <p className="text-caption text-muted">{user.isTest ? "Compte de test" : user.role === "ADMIN" ? "Administrateur" : "Venture Architect"}</p>
        </div>
      </header>
      {palette ? <Palette projects={projects} items={items} onClose={() => setPalette(false)} /> : null}
    </>
  );
}

export function AppMobile({ user }: { user: Actor }) {
  const pathname = usePathname();
  const open = useNavOpen();
  const items = visibleNav(user);
  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-30 bg-[var(--scrim)] lg:hidden" onClick={() => setNavOpen(false)}>
          <aside className="flex h-full w-[280px] flex-col gap-6 bg-surface p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" className="btn btn-ghost" aria-label="Fermer" onClick={() => setNavOpen(false)}><X size={18} /></button>
            </div>
            <Nav items={items} pathname={pathname} onNavigate={() => setNavOpen(false)} />
          </aside>
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface px-1 py-2 lg:hidden">
        {items.slice(0, 5).map((item) => (
          <Link key={item.href} href={item.href} className={`flex min-h-11 flex-col items-center justify-center gap-1 text-caption ${pathname === item.href ? "text-primary-fg" : "text-muted"}`}>
            <item.icon size={18} strokeWidth={1.75} />
            {item.label.split(" ")[0]}
          </Link>
        ))}
      </nav>
    </>
  );
}

function Brand() {
  return (
    <Link href="/" className="logo-plate">
      <Logo src="/logos/haske-ventures.png" alt="Haskè Ventures" height={36} />
    </Link>
  );
}

function Nav({ items, pathname, onNavigate }: { items: typeof NAV; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={`flex min-h-11 items-center gap-3 rounded-[8px] px-3 text-small ${active ? "bg-primary text-on-primary" : "text-muted hover:bg-sunken"}`}>
            <item.icon size={18} strokeWidth={1.75} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" className="btn" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Bell size={18} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="surface absolute right-0 top-12 z-30 w-72 p-4">
          <p className="text-small font-medium">Notifications</p>
          <p className="mt-1 text-small text-muted">Aucune notification pour l'instant.</p>
        </div>
      ) : null}
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="btn" aria-label="Changer de thème" onClick={() => setTheme(theme === "system" ? next : theme === "dark" ? "light" : theme === "light" ? "system" : "dark")}>
      {ready ? (theme === "system" ? "Système" : theme === "dark" ? "Sombre" : "Clair") : "Thème"}
    </button>
  );
}

function ActorSwitch({ current }: { current: string }) {
  return (
    <label className="text-small text-muted">
      <span className="sr-only">Voir en tant que</span>
      <select className="control w-auto" aria-label="Voir en tant que" value={current} onChange={(event) => void switchActor(event.target.value)}>
        {DEV_ACTORS.map((actor) => <option key={actor.id} value={actor.id}>{actor.label}</option>)}
      </select>
    </label>
  );
}

function Palette({ projects, items, onClose }: { projects: Array<{ id: string; name: string }>; items: typeof NAV; onClose: () => void }) {
  const router = useRouter();
  const go = (href: string) => { router.push(href); onClose(); };
  return (
    <div className="modal-back" onClick={onClose}>
      <Command className="sheet" label="Palette de commandes" onClick={(event) => event.stopPropagation()}>
        <Command.Input className="control" placeholder="Aller à une page ou un projet" autoFocus />
        <Command.List className="mt-3 max-h-80 overflow-auto">
          <Command.Empty className="text-small text-muted">Aucun résultat.</Command.Empty>
          <Command.Group heading="Pages">
            {items.map((item) => <Command.Item key={item.href} className="cursor-pointer rounded-[8px] px-3 py-2 aria-selected:bg-sunken" onSelect={() => go(item.href)}>{item.label}</Command.Item>)}
          </Command.Group>
          <Command.Group heading="Projets">
            {projects.map((project) => <Command.Item key={project.id} className="cursor-pointer rounded-[8px] px-3 py-2 aria-selected:bg-sunken" onSelect={() => go(`/projets/${project.id}`)}>{project.name}</Command.Item>)}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
