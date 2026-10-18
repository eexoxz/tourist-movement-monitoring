import { useState } from "react";
import { ChevronDown, Download, LoaderCircle, LogOut, Trash2 } from "lucide-react";
import { translate, type Locale } from "../services/i18n";
import { deletionText, type DeletionCopyKey } from "../services/accountDeletionCopy";
import type { DeletionPhase } from "../services/accountDeletion";
import { uiText } from "../services/uiText";

export function AccountDeletionPanel({ locale, email, pending = false, busy = false, phase, error, onDelete, onExport, onLogout }: {
  locale: Locale; email?: string; pending?: boolean; busy?: boolean; phase?: DeletionPhase; error?: DeletionCopyKey;
  onDelete: (password: string) => Promise<void>; onExport?: () => void; onLogout?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const text = (key: DeletionCopyKey) => deletionText(locale, key);
  const content = <>
    {email && <strong className="account-deletion-email">{email}</strong>}
    <p>{text(pending ? "resumeBody" : "description")}</p>
    {!pending && onExport && <button className="secondary-action" type="button" onClick={onExport} disabled={busy}><Download size={18} />{translate(locale, "nav.exportData")}</button>}
    <p className="account-deletion-warning">{text("warning")}</p>
    <form onSubmit={async (event) => { event.preventDefault(); if (busy || !agreed || !password) return; try { await onDelete(password); } finally { setPassword(""); } }}>
      <fieldset disabled={busy}>
        <label>{translate(locale, "auth.password")}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        <label className="account-deletion-consent"><input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} required /><span>{text("agree")}</span></label>
        <div className="account-deletion-actions">
          {!pending && <button className="secondary-action" type="button" onClick={() => { setExpanded(false); setPassword(""); setAgreed(false); }}>{uiText(locale, "Cancel")}</button>}
          <button className="primary-action danger" type="submit" disabled={!agreed || !password} aria-busy={busy}>{busy ? <LoaderCircle size={18} /> : <Trash2 size={18} />}{text(busy ? phase ?? "verifying" : pending ? "resume" : "confirm")}</button>
        </div>
      </fieldset>
    </form>
    {busy && <p role="status">{text(phase ?? "verifying")}</p>}
    {error && <p role="alert">{text(error)}</p>}
    {pending && onLogout && <button className="secondary-action" type="button" onClick={onLogout} disabled={busy}><LogOut size={18} />{translate(locale, "nav.logout")}</button>}
  </>;
  return pending ? <section className="account-deletion-panel"><h1><Trash2 size={24} />{text("resume")}</h1>{content}</section> : <details className="account-deletion-panel" open={expanded} onToggle={(event) => { setExpanded(event.currentTarget.open); if (!event.currentTarget.open) { setPassword(""); setAgreed(false); } }}><summary><Trash2 size={18} />{text("title")}<ChevronDown className="account-control-chevron" size={18} aria-hidden="true" /></summary>{content}</details>;
}
