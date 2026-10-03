import { CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import type { SosClosureReason } from "../types";
import type { Locale } from "../services/i18n";
import { sosText } from "../services/sosCopy";

export function SosRequestActions({ locale, onClose }: { locale: Locale; onClose: (reason: SosClosureReason) => void }) {
  const [reason, setReason] = useState<SosClosureReason | null>(null);
  const text = (key: Parameters<typeof sosText>[1]) => sosText(locale, key);
  return <div className="sos-request-actions">
    {reason ? <div className="sos-confirmation" role="group" aria-label={text(reason === "cancelled" ? "confirmCancel" : "confirmResolve")}>
      <p>{text(reason === "cancelled" ? "confirmCancel" : "confirmResolve")}</p>
      <div className="police-help-actions">
        <button className="primary-action compact-action" type="button" onClick={() => { onClose(reason); setReason(null); }}><CheckCircle2 size={16} />{text("confirm")}</button>
        <button className="secondary-action compact-action" type="button" onClick={() => setReason(null)}>{text("keepOpen")}</button>
      </div>
    </div> : <div className="police-help-actions">
      <button className="secondary-action compact-action" type="button" onClick={() => setReason("cancelled")}><XCircle size={16} />{text("cancelRequest")}</button>
      <button className="secondary-action compact-action" type="button" onClick={() => setReason("help-received")}><CheckCircle2 size={16} />{text("helpReceived")}</button>
    </div>}
  </div>;
}
