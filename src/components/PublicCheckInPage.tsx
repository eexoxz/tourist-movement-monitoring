import { ArrowLeft, BadgeCheck, CheckCircle2, Compass, LoaderCircle, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { formatDateTime } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { AttractionCheckIn, Destination } from "../types";
import { DestinationVisual } from "./DestinationVisual";
import { LanguageSelector } from "./AuthScreen";
import { notificationSource, uiText } from "../services/uiText";
import { checkInSyncText } from "../services/checkInSyncCopy";
import type { CheckInSyncState } from "../services/checkInSync";
import { getPathForView } from "../services/access";

export type PublicCheckInResult = {
  tone: "success" | "info" | "error";
  title: string;
  message: string;
  titleKey?: TranslationKey;
  messageKey?: TranslationKey;
  checkIn?: AttractionCheckIn;
  syncState?: CheckInSyncState;
};

type PublicCheckInPageProps = {
  destination: Destination | null;
  locale: Locale;
  missingReason?: string;
  passId: string | null;
  passVerified: boolean;
  syncStatus: string;
  initializing?: boolean;
  onConfirm: () => PublicCheckInResult | Promise<PublicCheckInResult>;
  onLocaleChange: (locale: Locale) => void;
};

export function PublicCheckInPage({ destination, locale, missingReason, passId, passVerified, syncStatus, initializing = false, onConfirm, onLocaleChange }: PublicCheckInPageProps) {
  const [result, setResult] = useState<PublicCheckInResult | null>(null);
  const [saving, setSaving] = useState(false);
  const confirming = useRef(false);
  const ready = Boolean(destination && passId && passVerified);
  const t = (key: TranslationKey) => translate(locale, key);

  const confirmVisit = async () => {
    if (confirming.current || initializing) return;
    confirming.current = true;
    setSaving(true);
    try {
      const outcome = await onConfirm();
      setResult({ ...outcome, title: notificationSource(locale, outcome.title), message: notificationSource(locale, outcome.message) });
    } catch {
      setResult({ tone: "error", title: t("publicCheckin.saveErrorTitle"), message: t("publicCheckin.saveErrorMessage"), titleKey: "publicCheckin.saveErrorTitle", messageKey: "publicCheckin.saveErrorMessage" });
    } finally {
      confirming.current = false;
      setSaving(false);
    }
  };

  return (
    <main className="public-check-in-shell">
      <section className="public-check-in-card">
        <header className="public-check-in-header">
          <div className="brand-mark">
            <Compass size={24} />
          </div>
          <div>
            <span>{t("tourist.pass.eyebrow")}</span>
            <h1>{t("publicCheckin.title")}</h1>
          </div>
          <LanguageSelector locale={locale} onLocaleChange={onLocaleChange} />
        </header>

        {destination ? (
          <DestinationVisual destination={destination} locale={locale} />
        ) : (
          <div className="public-check-in-empty">
            <strong>{t("publicCheckin.destinationNotFound")}</strong>
            <span>{t("publicCheckin.destinationNotLinked")}</span>
          </div>
        )}

        <section className="public-check-in-copy">
          <span className="eyebrow-with-icon">
            <BadgeCheck size={16} />
            {t("publicCheckin.eyebrow")}
          </span>
          <h2>{destination ? destination.name : t("publicCheckin.unavailableTitle")}</h2>
          <p>
            {ready
              ? t("publicCheckin.readyMessage")
              : missingReason ?? t("publicCheckin.invalidMessage")}
          </p>
        </section>

        <dl className="public-check-in-details">
          <div>
            <dt>{t("publicCheckin.passId")}</dt>
            <dd>{passId ?? t("publicCheckin.missing")}</dd>
          </div>
          <div>
            <dt>{t("publicCheckin.passStatus")}</dt>
            <dd>{passVerified ? t("publicCheckin.verified") : t("publicCheckin.notRecognised")}</dd>
          </div>
          <div>
            <dt>{t("publicCheckin.area")}</dt>
            <dd>{destination?.city ?? t("publicCheckin.unknown")}</dd>
          </div>
          <div>
            <dt>{t("publicCheckin.syncMode")}</dt>
            <dd>{uiText(locale, syncStatus)}</dd>
          </div>
        </dl>

        {result && (
          <section className={`public-check-in-result ${result.tone}`} aria-live="polite">
            {result.tone === "error" ? <TriangleAlert size={20} /> : <CheckCircle2 size={20} />}
            <div>
              <strong>{result.syncState === "pending" ? checkInSyncText(locale, "pendingTitle") : result.syncState === "local" ? checkInSyncText(locale, "localTitle") : result.titleKey ? t(result.titleKey) : uiText(locale, result.title)}</strong>
              <p>{result.syncState ? checkInSyncText(locale, result.syncState) : result.messageKey ? t(result.messageKey) : uiText(locale, result.message)}</p>
              {result.checkIn && <small>{formatDateTime(result.checkIn.checkedInAt, locale)}</small>}
            </div>
          </section>
        )}

        <div className="public-check-in-actions">
          <button className="primary-action wide" type="button" onClick={() => void confirmVisit()} aria-busy={saving || initializing} disabled={!ready || initializing || saving || result?.tone === "success" || result?.tone === "info"}>
            {saving ? <LoaderCircle size={18} /> : result?.syncState === "pending" ? <RotateCcw size={18} /> : <ShieldCheck size={18} />}
            {saving ? checkInSyncText(locale, "saving") : result?.syncState === "pending" ? checkInSyncText(locale, "retry") : t("publicCheckin.confirm")}
          </button>
          <a className="secondary-action wide" href={getPathForView("tourist", "overview")}>
            <ArrowLeft size={18} />
            {checkInSyncText(locale, "back")}
          </a>
        </div>
      </section>
    </main>
  );
}
