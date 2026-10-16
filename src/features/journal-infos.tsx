"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DeleteButton } from "@/features/forms";
import { saveInfo } from "@/server/actions";

const CHANNELS = ["WhatsApp", "Appel", "Email", "SMS", "Teams (chat)", "En personne", "Autre"];

export type JournalInfo = { id: string; text: string; channel: string; source: string | null };

export function JournalInfos({ projectId, date, infos }: { projectId: string; date: string; infos: JournalInfo[] }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <header className="journal-card-head">
        <div className="journal-card-title">
          <span className="journal-ico journal-ico-blue" aria-hidden><InboxMark /></span>
          <div>
            <h2 className="text-h3">Infos reçues</h2>
            <p className="text-small text-muted">{infos.length} notée{infos.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <button type="button" className="journal-btn-soft w-fit shrink-0 whitespace-nowrap" onClick={() => { setOpen((value) => !value); setError(""); }}>
          {open ? "Fermer" : "Ajouter une information"}
        </button>
      </header>
      {open ? (
        <form className="journal-form" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          setPending(true);
          setError("");
          void saveInfo({
            text: String(data.get("text")),
            source: String(data.get("source") ?? "") || null,
            channel: String(data.get("channel")),
            projectId,
            date,
          }).then((result) => {
            setPending(false);
            if (result.ok) {
              toast.success("Enregistré");
              form.reset();
              setOpen(false);
              return;
            }
            setError(result.error);
            toast.error(result.error);
          });
        }}>
          <label className="field"><span>Information</span><textarea name="text" className="control min-h-20" maxLength={1200} required placeholder="Retour, message ou décision à conserver…" /></label>
          <div className="journal-fields">
            <label className="field"><span>Source</span><input name="source" className="control" maxLength={120} /></label>
            <label className="field"><span>Canal</span>
              <select name="channel" className="control">{CHANNELS.map((item) => <option key={item}>{item}</option>)}</select>
            </label>
          </div>
          {error ? <p className="text-small text-crit">{error}</p> : null}
          <button className="btn btn-primary w-fit" type="submit" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer l'information"}</button>
        </form>
      ) : null}
      {infos.length ? (
        <ul className="journal-list">
          {infos.map((info) => (
            <li key={info.id}>
              <p className="text-small">{info.text}</p>
              <p className="text-small text-muted">{info.source ? `${info.source} · ` : ""}{info.channel}</p>
              <DeleteButton entity="info" id={info.id} />
            </li>
          ))}
        </ul>
      ) : open ? null : (
        <div className="journal-empty">
          <InboxArt />
          <p className="text-h3">Aucune information reçue pour cette journée</p>
          <p className="text-small text-muted">Gardez ici les retours, messages et décisions importants.</p>
        </div>
      )}
    </>
  );
}

function InboxMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 4.5h12v7.2c0 .8-.7 1.5-1.5 1.5H4.5C3.7 13.2 3 12.5 3 11.7V4.5Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.2h3.1l1 1.6h3.8l1-1.6H15" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function InboxArt() {
  return (
    <svg className="journal-art" viewBox="0 0 180 120" aria-hidden>
      <circle cx="132" cy="28" r="16" fill="#EAF0FF" />
      <circle cx="36" cy="92" r="18" fill="#FFF3DD" />
      <rect x="48" y="28" width="84" height="64" rx="14" fill="#F4F7FF" stroke="#23358E" strokeOpacity="0.2" />
      <path d="M48 52h24l8 10h20l8-10h24v28a8 8 0 0 1-8 8H56a8 8 0 0 1-8-8V52Z" fill="#23358E" />
      <path d="M62 46h56l-6 12H68l-6-12Z" fill="#E79409" />
      <rect x="78" y="68" width="24" height="4" rx="2" fill="#fff" />
    </svg>
  );
}
