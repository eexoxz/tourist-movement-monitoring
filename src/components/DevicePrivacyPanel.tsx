import { useState } from "react";
import { ChevronDown, Eraser, ShieldCheck } from "lucide-react";
import type { Locale } from "../services/i18n";
import { deviceText } from "../services/deviceCopy";
import { uiText } from "../services/uiText";

export function DevicePrivacyPanel({ locale, onClear }: { locale: Locale; onClear: () => Promise<"pending" | "failed" | undefined> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"pending" | "failed">();
  const clear = async () => {
    setBusy(true); setResult(undefined);
    try { setResult(await onClear()); } catch { setResult("failed"); }
    finally { setBusy(false); }
  };
  return <details className="device-privacy-panel">
    <summary><ShieldCheck size={18} />{deviceText(locale, "privacyTitle")}<ChevronDown className="account-control-chevron" size={18} aria-hidden="true" /></summary>
    <p>{deviceText(locale, "privacyBody")}</p>
    {!confirm ? <button className="secondary-action danger" type="button" onClick={() => setConfirm(true)}><Eraser size={18} />{deviceText(locale, "clearAction")}</button> : <div className="device-privacy-confirm">
      <p>{deviceText(locale, "confirmBody")}</p>
      <div className="device-privacy-actions"><button className="secondary-action" type="button" disabled={busy} onClick={() => { setConfirm(false); setResult(undefined); }}>{uiText(locale, "Cancel")}</button><button className="secondary-action danger" type="button" disabled={busy} onClick={() => void clear()}><Eraser size={18} />{deviceText(locale, busy ? "busy" : "clearAction")}</button></div>
    </div>}
    {result && <p role="alert">{deviceText(locale, result)}</p>}
  </details>;
}
