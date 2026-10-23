import { ChevronDown, CircleHelp } from "lucide-react";
import { useId } from "react";
import { translate, type Locale } from "../services/i18n";
import { reviewText } from "../services/reviewUpdateCopy";

export function IdentityNumberField({ value, onChange, locale, invalid }: {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  invalid?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  return <div className="identity-number-field">
    <label htmlFor={id}>{reviewText(locale, "identity")}</label>
    <input id={id} value={value} onChange={(event) => onChange(event.target.value)} required minLength={5} maxLength={28} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder={t("auth.identityPlaceholder")} aria-describedby={hintId} aria-invalid={invalid || undefined} />
    <small id={hintId} className="field-hint">{t("auth.passportHint")}</small>
    <details className="identity-number-help">
      <summary><CircleHelp size={16} aria-hidden="true" /><span>{t("auth.passportHelpTitle")}</span><ChevronDown className="identity-help-chevron" size={16} aria-hidden="true" /></summary>
      <div><ul>
        <li>{t("auth.passportHelpLocation")}</li>
        <li>{t("auth.passportHelpAvoid")}</li>
        <li>{t("auth.passportHelpId")}</li>
      </ul><p>{t("auth.passportHelpAccuracy")}</p></div>
    </details>
  </div>;
}
