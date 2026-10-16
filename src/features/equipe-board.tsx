"use client";

import { MoreHorizontal, Plus, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { memberInitials, teamHeadline, type MemberRole } from "@/domain/team";
import { inviteMember, removeMember, setMemberActive, updateMember } from "@/server/actions";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  title: string;
  role: MemberRole;
  active: boolean;
  avatarUrl: string | null;
};

const ROLE_LABEL: Record<MemberRole, string> = {
  ADMIN: "Administrateur",
  VENTURE_ARCHITECT: "Venture Architect",
};

export function EquipeBoard({ members, actorId }: { members: TeamMember[]; actorId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(members);
  const [synced, setSynced] = useState(members);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"invite" | "edit" | "view" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"active" | "delete" | null>(null);
  if (synced !== members) {
    setSynced(members);
    setRows(members);
  }
  const selected = rows.find((member) => member.id === selectedId) ?? null;
  const active = rows.filter((member) => member.active).length;
  const inactive = rows.length - active;

  function open(kind: "invite" | "edit" | "view", id: string | null) {
    setMenuId(null);
    setSelectedId(id);
    setDialog(kind);
    setConfirm(null);
  }

  return (
    <div className="team-page">
      <header className="task-mast">
        <div className="task-mast-copy">
          <p className="text-caption text-accent-text">Studio</p>
          <h1 className="text-h1">Équipe</h1>
          <p className="text-small text-muted">{teamHeadline(active, inactive)}</p>
          <span className="mast-rule" />
        </div>
        <button type="button" className="btn team-invite" onClick={() => open("invite", null)}>
          <Plus size={16} aria-hidden /> Inviter un membre
        </button>
      </header>

      {rows.length === 0 ? (
        <p className="team-empty">Aucun membre pour le moment.</p>
      ) : (
        <ul className="team-grid">
          {rows.map((member) => (
            <li key={member.id}>
              <MemberCard
                member={member}
                self={member.id === actorId}
                menu={menuId === member.id}
                onMenu={() => setMenuId(menuId === member.id ? null : member.id)}
                onCloseMenu={() => setMenuId(null)}
                onView={() => open("view", member.id)}
                onEdit={() => open("edit", member.id)}
                onActive={() => { setSelectedId(member.id); setMenuId(null); setConfirm("active"); }}
                onDelete={() => { setSelectedId(member.id); setMenuId(null); setConfirm("delete"); }}
              />
            </li>
          ))}
        </ul>
      )}

      {dialog && (dialog === "invite" || selected) ? (
        <MemberDialog
          mode={dialog}
          member={dialog === "invite" ? null : selected}
          onClose={() => setDialog(null)}
          onSaved={(next) => {
            if (dialog === "invite") setRows([...rows, next]);
            else setRows(rows.map((item) => item.id === next.id ? next : item));
            setDialog(null);
            toast.success(dialog === "invite" ? "Membre ajouté à l'équipe." : "Membre modifié.");
            router.refresh();
          }}
        />
      ) : null}

      {confirm && selected ? (
        <ConfirmDialog
          member={selected}
          kind={confirm}
          onClose={() => setConfirm(null)}
          onDone={() => {
            if (confirm === "delete") setRows(rows.filter((item) => item.id !== selected.id));
            else setRows(rows.map((item) => item.id === selected.id ? { ...item, active: !item.active } : item));
            toast.success(confirm === "delete" ? "Membre supprimé." : selected.active ? "Membre désactivé." : "Membre réactivé.");
            setConfirm(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function MemberCard({
  member, self, menu, onMenu, onCloseMenu, onView, onEdit, onActive, onDelete,
}: {
  member: TeamMember;
  self: boolean;
  menu: boolean;
  onMenu: () => void;
  onCloseMenu: () => void;
  onView: () => void;
  onEdit: () => void;
  onActive: () => void;
  onDelete: () => void;
}) {
  const [photo, setPhoto] = useState(true);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) onCloseMenu();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseMenu();
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu, onCloseMenu]);
  return (
    <article ref={root} className={`team-card ${member.active ? "" : "is-off"}`}>
      {member.avatarUrl && photo ? (
        <Image className="team-avatar" src={member.avatarUrl} alt="" width={52} height={52} onError={() => setPhoto(false)} />
      ) : (
        <span className="team-avatar team-fallback" aria-hidden>{memberInitials(member.name)}</span>
      )}
      <div className="team-copy">
        <h2>{member.name}</h2>
        <Email email={member.email} />
        <span className="team-title">{member.title || "Poste non renseigné"}{member.active ? "" : " · Inactif"}</span>
      </div>
      <button type="button" className="icon-btn team-more" aria-label={`Actions pour ${member.name}`} aria-expanded={menu} onClick={onMenu}>
        <MoreHorizontal size={18} />
      </button>
      {menu ? (
        <div className="team-menu" role="menu">
          <button type="button" role="menuitem" onClick={onView}>Voir</button>
          <button type="button" role="menuitem" onClick={onEdit}>Modifier</button>
          {self ? null : <button type="button" role="menuitem" onClick={onActive}>{member.active ? "Désactiver" : "Réactiver"}</button>}
          {self ? null : <button type="button" role="menuitem" onClick={onDelete}>Supprimer</button>}
        </div>
      ) : null}
    </article>
  );
}


function Email({ email }: { email: string }) {
  const at = email.lastIndexOf("@");
  if (at < 1) return <p className="team-email">{email}</p>;
  return <p className="team-email"><span>{email.slice(0, at)}</span><span>@{email.slice(at + 1)}</span></p>;
}

function MemberDialog({
  mode, member, onClose, onSaved,
}: {
  mode: "invite" | "edit" | "view";
  member: TeamMember | null;
  onClose: () => void;
  onSaved: (member: TeamMember) => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [title, setTitle] = useState(member?.title ?? "");
  const [role, setRole] = useState<MemberRole>(member?.role ?? "VENTURE_ARCHITECT");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [leave, setLeave] = useState(false);
  const read = mode === "view";
  const dirty = !read && (name !== (member?.name ?? "") || email !== (member?.email ?? "") || title !== (member?.title ?? "") || role !== (member?.role ?? "VENTURE_ARCHITECT"));
  const dirtyRef = useRef(dirty);
  const closeRef = useRef(onClose);
  useEffect(() => {
    dirtyRef.current = dirty;
    closeRef.current = onClose;
  });
  function requestClose() {
    if (dirtyRef.current) setLeave(true);
    else closeRef.current();
  }
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (read || !member && mode !== "invite") return;
    if (name.trim().length < 2 || title.trim().length < 2 || !email.includes("@")) {
      setError("Vérifiez le nom, l'e-mail et le poste.");
      return;
    }
    setPending(true);
    setError("");
    const payload = { name: name.trim(), email: email.trim(), title: title.trim(), role };
    const request = mode === "invite"
      ? inviteMember(payload)
      : updateMember({ ...payload, id: member?.id ?? "", active: member?.active ?? true });
    void request.then((result) => {
      setPending(false);
      if (!result.ok) { setError(result.error); toast.error(result.error); return; }
      onSaved({
        id: member?.id ?? `local-${email}`,
        name: payload.name,
        email: payload.email.toLowerCase(),
        title: payload.title,
        role,
        active: member?.active ?? true,
        avatarUrl: member?.avatarUrl ?? null,
      });
    }).catch(() => { setPending(false); setError("Enregistrement impossible."); });
  }
  const heading = mode === "invite" ? "Inviter un membre" : mode === "edit" ? "Modifier le membre" : member?.name ?? "Membre";
  return createPortal(
    <div className="modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <form className="sheet team-modal" role="dialog" aria-modal="true" aria-labelledby="team-dialog-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header className="team-modal-head">
          <div>
            <h2 id="team-dialog-title" className="text-h2">{heading}</h2>
            {mode === "invite" ? <p className="text-small text-muted">L&apos;envoi d&apos;e-mail n&apos;est pas configuré. Le membre est ajouté à l&apos;équipe.</p> : null}
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={requestClose}><X size={18} /></button>
        </header>
        {read && member ? (
          <div className="team-view">
            {member.avatarUrl ? <Image className="team-avatar" src={member.avatarUrl} alt="" width={52} height={52} /> : <span className="team-avatar team-fallback" aria-hidden>{memberInitials(member.name)}</span>}
            <p><span>E-mail</span><strong>{member.email}</strong></p>
            <p><span>Poste</span><strong>{member.title || "Non renseigné"}</strong></p>
            <p><span>Permissions</span><strong>{ROLE_LABEL[member.role]}</strong></p>
            <p><span>Statut</span><strong>{member.active ? "Actif" : "Inactif"}</strong></p>
          </div>
        ) : (
          <div className="team-fields">
            <label className="field"><span>Nom complet</span>
              <input className="control" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field"><span>Email professionnel</span>
              <input className="control" type="email" value={email} maxLength={120} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field"><span>Poste</span>
              <input className="control" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label className="field"><span>Rôle</span>
              <select className="control" value={role} onChange={(event) => setRole(event.target.value as MemberRole)}>
                <option value="VENTURE_ARCHITECT">Venture Architect</option>
                <option value="ADMIN">Administrateur</option>
              </select>
            </label>
          </div>
        )}
        {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
        {leave ? (
          <div className="okr-leave" role="alertdialog">
            <p>Des modifications ne sont pas enregistrées. Les abandonner ?</p>
            <button type="button" className="btn" onClick={() => setLeave(false)}>Continuer</button>
            <button type="button" className="btn btn-primary" onClick={onClose}>Abandonner</button>
          </div>
        ) : null}
        <footer className="team-modal-foot">
          <button type="button" className="btn okr-cancel" disabled={pending} onClick={requestClose}>{read ? "Fermer" : "Annuler"}</button>
          {read ? null : <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Enregistrement…" : mode === "invite" ? "Envoyer l'invitation" : "Enregistrer"}</button>}
        </footer>
      </form>
    </div>,
    document.body,
  );
}

function ConfirmDialog({ member, kind, onClose, onDone }: { member: TeamMember; kind: "active" | "delete"; onClose: () => void; onDone: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    function onKey(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const title = kind === "delete" ? "Supprimer ce membre ?" : member.active ? "Désactiver ce membre ?" : "Réactiver ce membre ?";
  const detail = kind === "delete"
    ? "La suppression est refusée si cette personne est déjà liée à des projets, tâches ou anomalies."
    : member.active ? "Le compte reste dans l'équipe, marqué comme inactif." : "Le compte redevient actif.";
  return createPortal(
    <div className="modal-back" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="sheet team-modal" role="alertdialog" aria-labelledby="team-confirm-title">
        <h2 id="team-confirm-title" className="text-h2">{title}</h2>
        <p className="text-small text-muted">{member.name}. {detail}</p>
        {error ? <p className="text-small text-crit" role="alert">{error}</p> : null}
        <footer className="team-modal-foot">
          <button type="button" className="btn okr-cancel" disabled={pending} onClick={onClose}>Annuler</button>
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => {
            setPending(true);
            const request = kind === "delete" ? removeMember(member.id) : setMemberActive(member.id, !member.active);
            void request.then((result) => {
              setPending(false);
              if (!result.ok) { setError(result.error); toast.error(result.error); return; }
              onDone();
            }).catch(() => { setPending(false); setError("Enregistrement impossible."); });
          }}>{pending ? "Enregistrement…" : "Confirmer"}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
