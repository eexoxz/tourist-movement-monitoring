import { BadgeCheck, QrCode, ShieldCheck } from "lucide-react";
import { translate, type Locale, type TranslationKey } from "../services/i18n";
import type { Destination, User } from "../types";

type TouristPassCardProps = {
  user: User;
  destination?: Destination | null;
  locale?: Locale;
  compact?: boolean;
};

function hashSeed(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function buildQrCells(seed: string) {
  const size = 13;
  const cells: boolean[] = [];
  let value = hashSeed(seed || "tourist-pass");

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const inFinder =
        (row < 4 && col < 4) ||
        (row < 4 && col >= size - 4) ||
        (row >= size - 4 && col < 4);

      if (inFinder) {
        const localRow = row < 4 ? row : row - (size - 4);
        const localCol = col < 4 ? col : col - (size - 4);
        cells.push(localRow === 0 || localRow === 3 || localCol === 0 || localCol === 3 || (localRow === 1 && localCol === 1));
        continue;
      }

      value ^= value << 13;
      value ^= value >>> 17;
      value ^= value << 5;
      cells.push((value & 3) !== 0);
    }
  }

  return cells;
}

function createPassId(user: User) {
  const source = `${user.authUid ?? user.id}${user.email}${user.passportNumber ?? ""}`;
  return `MYP-${hashSeed(source).toString(36).toUpperCase().slice(0, 6).padEnd(6, "0")}`;
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
  const passId = createPassId(user);
  const cells = buildQrCells(`${passId}:${destination?.id ?? "profile"}`);
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
          {cells.map((filled, index) => (
            <span className={filled ? "filled" : ""} key={`${passId}-${index}`} />
          ))}
          <QrCode className="qr-frame-icon" size={20} aria-hidden="true" />
        </div>
        <strong>{destination ? t("tourist.pass.scanReady") : t("tourist.pass.verified")}</strong>
        <small>
          <ShieldCheck size={14} />
          {t("tourist.pass.qrNote")}
        </small>
      </div>
    </article>
  );
}
