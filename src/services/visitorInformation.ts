import { visitorInformation, type VisitorHours, type VisitorPrice } from "../data/visitorInformation";
import type { Locale } from "./i18n";
import { visitorText } from "./visitorInformationCopy";

export function getVisitorInformation(id: string) {
  return Object.hasOwn(visitorInformation, id) ? visitorInformation[id] : undefined;
}

export function visitorDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function visitorDays(days: number[], locale: Locale) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  return days.map((day) => formatter.format(new Date(Date.UTC(2026, 9, 18 + day)))).join(" / ");
}

export function visitorHoursLabel(row: VisitorHours, locale: Locale) {
  return [row.label && visitorText(locale, row.label), row.days && visitorDays(row.days, locale)].filter(Boolean).join(" · ");
}

export function visitorPriceLabel(row: VisitorPrice, locale: Locale) {
  return [row.residency && visitorText(locale, row.residency), visitorText(locale, row.audience), row.ages && `${row.ages} ${visitorText(locale, "years")}`, row.height && `${row.height} cm`].filter(Boolean).join(" · ");
}

export function groupVisitorPrices(prices: VisitorPrice[]) {
  const groups = new Map<VisitorPrice["residency"], VisitorPrice[]>();
  for (const row of prices) {
    const group = groups.get(row.residency) ?? [];
    group.push(row);
    groups.set(row.residency, group);
  }
  return [...groups].map(([residency, rows]) => ({ residency, rows }));
}
