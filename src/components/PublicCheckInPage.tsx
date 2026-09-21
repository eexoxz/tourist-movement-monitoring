import { BadgeCheck, CheckCircle2, Compass, ShieldCheck, Square } from "lucide-react";
import { useState } from "react";
import { formatDateTime } from "../services/geo";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { AttractionCheckIn, Destination } from "../types";
import { DestinationVisual } from "./DestinationVisual";
import { LanguageSelector } from "./AuthScreen";

export type PublicCheckInResult = {
  tone: "success" | "info" | "error";
  title: string;
  message: string;
  checkIn?: AttractionCheckIn;
};

type PublicCheckInPageProps = {
  destination: Destination | null;
  locale: Locale;
  missingReason?: string;
  passId: string | null;
  passVerified: boolean;
  syncStatus: string;
  onConfirm: () => PublicCheckInResult;
  onLocaleChange: (locale: Locale) => void;
};

export function PublicCheckInPage({ destination, locale, missingReason, passId, passVerified, syncStatus, onConfirm, onLocaleChange }: PublicCheckInPageProps) {
  const [result, setResult] = useState<PublicCheckInResult | null>(null);
  const ready = Boolean(destination && passId && passVerified);
  const t = (key: TranslationKey) => translate(locale, key);

  const confirmVisit = () => {
    setResult(onConfirm());
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
          <DestinationVisual destination={destination} />
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
            <dd>{syncStatus}</dd>
          </div>
        </dl>

        {result && (
          <section className={`public-check-in-result ${result.tone}`} aria-live="polite">
            <CheckCircle2 size={20} />
            <div>
              <strong>{result.title}</strong>
              <p>{result.message}</p>
              {result.checkIn && <small>{formatDateTime(result.checkIn.checkedInAt)}</small>}
            </div>
          </section>
        )}

        <div className="public-check-in-actions">
          <button className="primary-action wide" type="button" onClick={confirmVisit} disabled={!ready || result?.tone === "success" || result?.tone === "info"}>
            <ShieldCheck size={18} />
            {t("publicCheckin.confirm")}
          </button>
          {result?.checkIn && (
            <button className="secondary-action wide" type="button" disabled>
              <Square size={18} />
              {t("publicCheckin.checkoutInApp")}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
