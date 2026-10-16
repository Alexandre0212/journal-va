"use client";

import { Command } from "cmdk";
import { LayoutDashboard, BookOpen, FolderKanban, CheckSquare, Target, LineChart, Users, Bug, FileText, Briefcase, Trash2, Menu, Search, X, Bell, UserRound, Monitor, Moon, Sun, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { HaskeLogo } from "@/components/haske-logo";
import { DEV_ACTORS } from "@/domain/actors";
import { memberInitials } from "@/domain/team";
import { switchActor } from "@/server/actions";

const NAV = [
  { href: "/", label: "Tableau de bord", short: "Tableau", icon: LayoutDashboard, group: "Quotidien" },
  { href: "/journal", label: "Journal", short: "Journal", icon: BookOpen, group: "Quotidien" },
  { href: "/projets", label: "Projets", short: "Projets", icon: FolderKanban, group: "Quotidien" },
  { href: "/taches", label: "Tâches", short: "Tâches", icon: CheckSquare, group: "Quotidien" },
  { href: "/okr", label: "OKR", short: "OKR", icon: Target, group: "Mesure" },
  { href: "/kpi", label: "KPI", short: "KPI", icon: LineChart, group: "Mesure" },
  { href: "/reunions", label: "Réunions", short: "Réunions", icon: Users, group: "Mesure" },
  { href: "/anomalies", label: "Anomalies", short: "Anomalies", icon: Bug, group: "Mesure" },
  { href: "/recaps", label: "Récaps", short: "Récaps", icon: FileText, group: "Mesure" },
  { href: "/pilotage", label: "Pilotage", short: "Pilotage", icon: Briefcase, group: "Studio", admin: true },
  { href: "/equipe", label: "Équipe", short: "Équipe", icon: Users, group: "Studio", admin: true },
  { href: "/corbeille", label: "Corbeille", short: "Corbeille", icon: Trash2, group: "Studio" },
];

type Actor = { id: string; name: string; email: string; role: "ADMIN" | "VENTURE_ARCHITECT"; isTest: boolean };
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

function initials(name: string) {
  return memberInitials(name);
}

function roleLabel(user: Actor) {
  if (user.isTest) return "Compte de test";
  return user.role === "ADMIN" ? "Administrateur" : "Venture Architect";
}

export function AppSidebar({ user }: { user: Actor }) {
  const pathname = usePathname();
  const items = visibleNav(user);
  const groups = ["Quotidien", "Mesure", "Studio"];
  return (
    <aside className="sidebar">
      <Brand />
      <div className="nav-scroll">
        {groups.map((group) => {
          const links = items.filter((item) => item.group === group);
          if (!links.length) return null;
          return (
            <div key={group}>
              <p className="nav-kicker text-caption">{group}</p>
              <Nav items={links} pathname={pathname} />
            </div>
          );
        })}
      </div>
      <div className="sidebar-user">
        <span className="avatar" aria-hidden>{initials(user.name)}</span>
        <span className="nav-text min-w-0">
          <span className="block truncate text-small font-medium">{user.name}</span>
          <span className="block text-caption text-muted">{roleLabel(user)}</span>
        </span>
      </div>
    </aside>
  );
}

export function AppHeader({ user, projects, dev, dayLabel }: ChromeProps) {
  const [palette, setPalette] = useState(false);
  const [notices, setNotices] = useState(false);
  const [profile, setProfile] = useState(false);
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
      <header className="app-header">
        <button type="button" className="icon-btn only-mobile" aria-label="Ouvrir le menu" onClick={() => setNavOpen(true)}>
          <Menu size={18} strokeWidth={1.75} />
        </button>
        <div className="header-date">
          <p className="text-caption text-accent-text">Dakar</p>
          <p className="text-small font-medium">{dayLabel}</p>
        </div>
        <button type="button" className="command" aria-label="Rechercher" onClick={() => setPalette(true)}>
          <Search size={16} strokeWidth={1.75} />
          <span>Rechercher</span>
          <kbd>Ctrl K</kbd>
        </button>
        <div className="header-tools">
          <Notifications open={notices} onToggle={() => { setNotices((value) => !value); setProfile(false); }} />
          <Profile user={user} dev={dev} open={profile} onToggle={() => { setProfile((value) => !value); setNotices(false); }} onNotify={() => { setProfile(false); setNotices(true); }} />
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
        <div className="fixed inset-0 z-30 bg-[var(--scrim)] md:hidden" onClick={() => setNavOpen(false)}>
          <aside className="flex h-full w-[280px] flex-col gap-6 bg-surface p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" className="icon-btn" aria-label="Fermer" onClick={() => setNavOpen(false)}><X size={18} /></button>
            </div>
            <Nav items={items} pathname={pathname} onNavigate={() => setNavOpen(false)} />
          </aside>
        </div>
      ) : null}
      <nav className="bottom-nav" aria-label="Navigation">
        {items.slice(0, 5).map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              <item.icon size={18} strokeWidth={1.75} />
              <span className="text-caption">{item.short}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function Brand() {
  return (
    <Link href="/" className="brand logo-plate haske-brand" aria-label="Haskè Ventures">
      <HaskeLogo />
    </Link>
  );
}

function Nav({ items, pathname, onNavigate }: { items: typeof NAV; pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="nav-list">
      {items.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={item.label} className="nav-link text-small">
            <item.icon size={18} strokeWidth={1.75} />
            <span className="nav-text">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Notifications({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="relative">
      <button type="button" className="icon-btn" aria-label="Notifications" aria-expanded={open} onClick={onToggle}>
        <Bell size={18} strokeWidth={1.75} />
      </button>
      {open ? (
        <div className="surface notice">
          <p className="text-small font-medium">Notifications</p>
          <p className="mt-1 text-small text-muted">Aucune notification pour l'instant.</p>
        </div>
      ) : null}
    </div>
  );
}

function Profile({ user, dev, open, onToggle, onNotify }: { user: Actor; dev: boolean; open: boolean; onToggle: () => void; onNotify: () => void }) {
  const { theme, setTheme } = useTheme();
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);
  const current = ready ? (theme ?? "system") : undefined;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [note, setNote] = useState<"profile" | "session" | null>(null);
  const themes = [
    { id: "light", label: "Clair", icon: Sun },
    { id: "dark", label: "Sombre", icon: Moon },
    { id: "system", label: "Système", icon: Monitor },
  ] as const;
  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) onToggle();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onToggle();
      trigger.current?.focus();
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onToggle]);
  return (
    <div className="profile-anchor" ref={root}>
      <button ref={trigger} type="button" className="avatar-btn" aria-label="Profil et apparence" aria-expanded={open} aria-haspopup="dialog" onClick={() => { setNote(null); onToggle(); }}>
        <span className="avatar" aria-hidden>{initials(user.name)}</span>
      </button>
      {open ? (
        <div className="profile-menu" role="dialog" aria-label="Menu du profil">
          <div className="profile-id">
            <span className="avatar profile-avatar" aria-hidden>{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <p title={user.email}>{user.email || "E-mail non renseigné"}</p>
              <span className="profile-role">{roleLabel(user)}</span>
            </div>
          </div>
          <div className="profile-links">
            <button type="button" className="profile-link" onClick={() => setNote(note === "profile" ? null : "profile")}>
              <UserRound size={16} aria-hidden /> Mon profil
            </button>
            {note === "profile" ? <p className="profile-note">La fiche profil n&apos;est pas encore disponible.</p> : null}
            <button type="button" className="profile-link" onClick={onNotify}>
              <Bell size={16} aria-hidden /> Mes notifications
            </button>
          </div>
          <div className="profile-prefs">
            <div className="profile-pref">
              <span>Apparence</span>
              <div className="profile-seg" role="group" aria-label="Apparence">
                {themes.map((choice) => (
                  <button key={choice.id} type="button" className="profile-choice" aria-pressed={current === choice.id} aria-label={choice.label} title={choice.label} onClick={() => setTheme(choice.id)}>
                    <choice.icon size={15} aria-hidden />
                  </button>
                ))}
              </div>
            </div>
            <div className="profile-pref">
              <span>Langue</span>
              <div className="profile-seg" role="group" aria-label="Langue">
                <button type="button" className="profile-choice profile-lang" aria-pressed="true" aria-label="Français, langue de l'interface" title="Français">FR</button>
                <button type="button" className="profile-choice profile-lang" disabled aria-label="Anglais indisponible" title="La traduction anglaise n'est pas disponible.">EN</button>
              </div>
            </div>
          </div>
          {dev ? (
            <div className="profile-admin">
              <p>Administration</p>
              <label className="field">
                <span>Voir en tant que</span>
                <select className="control" aria-label="Voir en tant que" value={user.id} onChange={(event) => void switchActor(event.target.value)}>
                  {DEV_ACTORS.map((actor) => <option key={actor.id} value={actor.id}>{actor.label}</option>)}
                </select>
              </label>
            </div>
          ) : null}
          <button type="button" className="profile-logout" onClick={() => setNote(note === "session" ? null : "session")}>
            <LogOut size={16} aria-hidden /> Se déconnecter
          </button>
          {note === "session" ? <p className="profile-note">La déconnexion Microsoft n&apos;est pas branchée. La session de développement reste ouverte.</p> : null}
        </div>
      ) : null}
    </div>
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
