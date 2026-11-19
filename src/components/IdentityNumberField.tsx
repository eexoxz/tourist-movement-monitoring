import { ChevronDown, CircleHelp } from "lucide-react";
import { useId, useState } from "react";
import { getDocumentNumberGuidance, type DocumentType } from "../data/documentGuidance";
import { translate, type Locale } from "../services/i18n";
import { reviewText } from "../services/reviewUpdateCopy";

export function IdentityNumberField({ value, onChange, locale, nationality = "", invalid }: {
  value: string;
  onChange: (value: string) => void;
  locale: Locale;
  nationality?: string;
  invalid?: boolean;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const [documentType, setDocumentType] = useState<DocumentType>("passport");
  const { example, catalogueUrl, catalogueIndexUrl } = getDocumentNumberGuidance(nationality, documentType, locale);

  return <div className="identity-number-field">
    <label htmlFor={id}>{reviewText(locale, "identity")}</label>
    <input id={id} value={value} onChange={(event) => onChange(event.target.value)} required minLength={5} maxLength={28} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder={t("auth.identityPlaceholder")} aria-describedby={hintId} aria-invalid={invalid || undefined} />
    <small id={hintId} className="field-hint">{t("auth.passportHint")}</small>
    {nationality && <div className="identity-document-guidance" aria-live="polite">
      {example && <div>
        {t("auth.documentNumberExample")} <strong><bdi>{example.number}</bdi></strong>
        {" · "}<a href={example.source} target="_blank" rel="noreferrer">{t("auth.documentExampleSource")}</a>
      </div>}
      <a href={catalogueUrl} target="_blank" rel="noreferrer">{t("auth.documentExamplesLink")}</a>
    </div>}
    <details className="identity-number-help">
      <summary><CircleHelp size={16} aria-hidden="true" /><span>{t("auth.passportHelpTitle")}</span><ChevronDown className="identity-help-chevron" size={16} aria-hidden="true" /></summary>
      <div>
        <ul>
          {documentType === "passport" && <>
            <li>{t("auth.passportHelpLocation")}</li>
            <li>{t("auth.passportHelpAvoid")}</li>
          </>}
          <li>{t("auth.passportHelpId")}</li>
        </ul>
        <div className="identity-document-options">
          <label>{t("auth.documentType")}
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value === "national-id" ? "national-id" : "passport")}>
              <option value="passport">{t("auth.passportDocumentType")}</option>
              <option value="national-id">{t("auth.nationalIdDocumentType")}</option>
            </select>
          </label>
          {(!nationality || catalogueUrl !== catalogueIndexUrl) && (
            <a href={catalogueIndexUrl} target="_blank" rel="noreferrer">
              {t(nationality ? "auth.otherDocumentCountries" : "auth.documentExamplesLink")}
            </a>
          )}
        </div>
        <p>{t("auth.passportHelpAccuracy")}</p>
      </div>
    </details>
  </div>;
}
