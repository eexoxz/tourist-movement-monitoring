import { BadgeCheck, ShieldCheck } from "lucide-react";
import { createTouristCheckInUrl, createTouristPassId, createTouristPassUrl, isLocalOnlyQrOrigin } from "../services/checkInDeepLink";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import { createQrSvgDataUri } from "../services/qrCode";
import type { Destination, User } from "../types";
import { DestinationVisual } from "./DestinationVisual";

type TouristPassCardProps = {
  user: User;
  destination?: Destination | null;
  locale?: Locale;
  compact?: boolean;
};

function createPassPayload(passId: string, destination?: Destination | null) {
  return destination ? createTouristCheckInUrl(destination.id, passId) : createTouristPassUrl(passId);
}

function maskPassport(passportNumber?: string) {
  if (!passportNumber) {
    return "";
  }

  const normalized = passportNumber.toUpperCase();
  if (normalized.length <= 4) {
    return normalized;
  }

  return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
}

function formatPreferences(user: User, t: (key: TranslationKey) => string) {
  if (!user.travelPreferences?.length) {
    return t("tourist.profile.notSetYet");
  }

  return user.travelPreferences.map((preference) => t(`category.${preference}` as TranslationKey)).join(", ");
}

export function TouristPassCard({ user, destination, locale = "en", compact = false }: TouristPassCardProps) {
  const t = (key: TranslationKey) => translate(locale, key);
  const passId = createTouristPassId(user);
  const qrPayload = createPassPayload(passId, destination);
  const qrSource = createQrSvgDataUri(qrPayload);
  const localOnlyQr = isLocalOnlyQrOrigin();
  const passport = maskPassport(user.passportNumber) || t("tourist.profile.notSetYet");
  const nationality = user.nationality || t("tourist.profile.notSetYet");

  return (
    <article className={compact ? "tourist-pass-card compact" : "tourist-pass-card"}>
      <div className="tourist-pass-copy">
        <span className="eyebrow-with-icon">
          <BadgeCheck size={16} />
          {t("tourist.pass.eyebrow")}
        </span>
        <h2>{compact ? t("tourist.pass.compactTitle") : t("tourist.pass.title")}</h2>
        {destination && <DestinationVisual destination={destination} compact />}
        <p>{destination ? `${t("tourist.pass.checkInDescription")} ${destination.name}.` : t("tourist.pass.description")}</p>

        <dl className="tourist-pass-details">
          <div>
            <dt>{t("tourist.pass.passId")}</dt>
            <dd>{passId}</dd>
          </div>
          <div>
            <dt>{t("tourist.pass.nationality")}</dt>
            <dd>{nationality}</dd>
          </div>
          <div>
            <dt>{t("tourist.pass.passport")}</dt>
            <dd>{passport}</dd>
          </div>
          {!compact && (
            <div>
              <dt>{t("tourist.pass.travelStyle")}</dt>
              <dd>{formatPreferences(user, t)}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="tourist-pass-qr">
        <div className="qr-frame" aria-label={t("tourist.pass.qrLabel")}>
          <img alt={t("tourist.pass.qrLabel")} src={qrSource} />
        </div>
        <strong>{destination ? t("tourist.pass.scanReady") : t("tourist.pass.verified")}</strong>
        <small>
          <ShieldCheck size={14} />
          {localOnlyQr ? t("tourist.pass.localQrNote") : t("tourist.pass.qrNote")}
        </small>
      </div>
    </article>
  );
}
