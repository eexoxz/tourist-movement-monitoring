import { visitorInformation, type VisitorHours, type VisitorInformation, type VisitorPrice, type VisitorValue } from "../data/visitorInformation";
import type { Destination } from "../types";
import { hasCustomDestinationFact } from "./destinationLocale";
import type { Locale } from "./i18n";
import { visitorText } from "./visitorInformationCopy";

export function getDestinationVisitDetails(destination: Destination): VisitorInformation {
  if (destination.visitDetails) return destination.visitDetails;
  const info = Object.hasOwn(visitorInformation, destination.id) ? visitorInformation[destination.id] : undefined;
  const customHours = hasCustomDestinationFact(destination, "openingHours");
  const customFee = hasCustomDestinationFact(destination, "feeNote");
  const showEvidence = info && (info.closure || (!customHours && (info.hours?.length || info.hoursNotes?.length)) || (!customFee && info.prices?.length));
  return {
    ...info,
    checkedAt: showEvidence ? info.checkedAt : undefined,
    sources: showEvidence ? info.sources : [],
    ...(customHours ? { hours: [], closedDays: [], hoursNotes: [{ text: destination.openingHours! }] } : {}),
    ...(customFee ? { prices: [], priceScope: undefined, priceNotes: [{ text: destination.feeNote! }] } : {}),
  };
}

export function visitorValue(value: VisitorValue, locale: Locale) {
  return typeof value === "string" ? visitorText(locale, value) : value.text;
}

export function visitorDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function visitorDays(days: number[], locale: Locale) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  return days.map((day) => formatter.format(new Date(Date.UTC(2026, 9, 18 + day)))).join(" / ");
}

export function visitorHoursLabel(row: VisitorHours, locale: Locale) {
  return [row.label && visitorValue(row.label, locale), row.days && visitorDays(row.days, locale)].filter(Boolean).join(" · ");
}

export function visitorPriceLabel(row: VisitorPrice, locale: Locale) {
  return [row.residency && visitorValue(row.residency, locale), visitorValue(row.audience, locale), row.ages && `${row.ages} ${visitorText(locale, "years")}`, row.height && `${row.height} cm`].filter(Boolean).join(" · ");
}

export function groupVisitorPrices(prices: VisitorPrice[]) {
  const groups = new Map<string, { residency: VisitorPrice["residency"]; rows: VisitorPrice[] }>();
  for (const row of prices) {
    const key = JSON.stringify(row.residency) ?? "";
    const group = groups.get(key) ?? { residency: row.residency, rows: [] };
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()];
}
